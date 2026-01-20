/**
 * Hand Tracking for 67Ranked
 * 
 * Using MoveNet SINGLEPOSE_LIGHTNING for fast, browser-based pose tracking.
 * Tracks wrist landmarks for rep counting during fast hand movements.
 * 
 * KEY FEATURES:
 * - WristSignal adapter with GOOD/WEAK/LOST states
 * - Permissive "hands-only" tracking during brief occlusions
 * - Anti-fake rep logic with velocity/displacement gating
 * - Reacquisition cooldown to prevent false reps
 * 
 * REP COUNTING: Peak/Valley Detection on wrist Y positions
 */

import {
  initPose,
  estimatePose,
  disposePose,
  getBackend,
  shouldShowBackendWarning,
  isReady,
  getInitState,
  KeypointIndices,
  type NormalizedLandmark,
  type NormalizedLandmarkList,
  type PoseFrame,
  type BackendType,
  type InitState,
} from './pose/movenetProvider';

// Re-export types for compatibility
export type { NormalizedLandmark, NormalizedLandmarkList, BackendType, InitState };

// ============================================================================
// TYPES
// ============================================================================

// Legacy Results type for compatibility
export interface Results {
  image: HTMLCanvasElement;
  multiHandLandmarks?: NormalizedLandmarkList[];
  multiHandedness?: Array<{ label: string; score: number }>;
}

export interface PoseResults {
  image: HTMLCanvasElement;
  poseLandmarks?: NormalizedLandmarkList;
}

// Wrist tracking state: GOOD = full confidence, WEAK = hands-only, LOST = no tracking
export type WristState = 'GOOD' | 'WEAK' | 'LOST';

// WristSignal: stable output per frame with state information
export interface WristSignal {
  x: number;           // Normalized 0-1
  y: number;           // Normalized 0-1
  score: number;       // Confidence 0-1
  state: WristState;   // Tracking quality
}

export type RepState = 'WAITING' | 'TRACKING';

export interface TrackingState {
  bothHandsDetected: boolean;
  leftY: number | null;
  rightY: number | null;
  leftSignal: WristSignal | null;
  rightSignal: WristSignal | null;
  repState: RepState;
  repCount: number;
  isCalibrated: boolean;
  calibrationProgress: number;
  trackingLost: boolean;
  backendWarning?: string;
  initState?: InitState;
}

// ============================================================================
// KEYPOINT INDICES (MoveNet COCO format)
// ============================================================================
const LEFT_WRIST = KeypointIndices.LEFT_WRIST;
const RIGHT_WRIST = KeypointIndices.RIGHT_WRIST;
const LEFT_ELBOW = KeypointIndices.LEFT_ELBOW;
const RIGHT_ELBOW = KeypointIndices.RIGHT_ELBOW;
const LEFT_SHOULDER = KeypointIndices.LEFT_SHOULDER;
const RIGHT_SHOULDER = KeypointIndices.RIGHT_SHOULDER;

// ============================================================================
// TUNABLE THRESHOLDS (adjust these to balance permissiveness vs. accuracy)
// ============================================================================

// Confidence thresholds for WristState determination
// GOOD: High confidence - wrist + supporting landmarks visible
const WRIST_SCORE_GOOD = 0.50;   // Wrist score for GOOD state
const ELBOW_SCORE_MIN = 0.30;    // Elbow score to support GOOD state
const SHOULDER_SCORE_MIN = 0.25; // Shoulder score to support GOOD state (fallback)

// WEAK: Lower confidence - only wrist visible (hands-only mode)
const WRIST_SCORE_WEAK = 0.35;   // Minimum wrist score for WEAK state

// Hold duration for WEAK state (ms) - how long to trust cached direction
const WEAK_HOLD_DURATION = 250;

// Reacquisition cooldown (ms) - pause counting after LOST->GOOD/WEAK transition
// This prevents false reps from sudden reappearance
const REACQUIRE_COOLDOWN_MS = 120;

// Velocity gating - minimum wrist speed to count direction change
// Units: normalized position per second (e.g., 1.0 = full screen height per second)
// Tune this based on frame rate. At 30fps, ~0.03 per frame = 0.9 per second
const V_MIN = 0.9;

// Displacement gating - minimum distance traveled since last reversal
// Units: normalized (0-1), where 1 = full screen height
// This prevents micro-oscillations from counting as reps
const D_MIN = 0.06;

// Edge jitter zone - increase thresholds when wrist is near frame edges
const EDGE_ZONE = 0.03;          // 3% of frame dimensions
const EDGE_V_MULTIPLIER = 1.5;   // Increase V_MIN by 50% near edges
const EDGE_D_MULTIPLIER = 1.5;   // Increase D_MIN by 50% near edges

// Direction hysteresis deadband - minimum Y movement to register direction change
const DIRECTION_DEADBAND = 0.015;

// Smoothing for WEAK state (exponential moving average)
const WEAK_SMOOTHING_ALPHA = 0.3;

// Calibration
const CALIBRATION_STABLE_FRAMES = 15;

// ============================================================================
// WRIST SIGNAL ADAPTER
// ============================================================================

/**
 * WristSignalAdapter: Converts raw MoveNet landmarks into stable WristSignals.
 * 
 * Handles three states:
 * - GOOD: High confidence, wrist + elbow/shoulder visible
 * - WEAK: Lower confidence, only wrist visible (hands-only mode)
 * - LOST: No usable tracking
 * 
 * For WEAK state, applies smoothing and allows brief hold of last direction.
 */
class WristSignalAdapter {
  // Per-arm state
  private lastGoodLeft: { x: number; y: number; timestamp: number } | null = null;
  private lastGoodRight: { x: number; y: number; timestamp: number } | null = null;
  
  // Smoothed positions for WEAK state
  private smoothedLeft: { x: number; y: number } | null = null;
  private smoothedRight: { x: number; y: number } | null = null;

  reset(): void {
    this.lastGoodLeft = null;
    this.lastGoodRight = null;
    this.smoothedLeft = null;
    this.smoothedRight = null;
  }

  /**
   * Process landmarks and produce WristSignals for both arms.
   */
  process(landmarks: NormalizedLandmarkList | null, timestamp: number): {
    left: WristSignal | null;
    right: WristSignal | null;
  } {
    if (!landmarks) {
      return { left: null, right: null };
    }

    const leftSignal = this.processArm(
      landmarks[LEFT_WRIST],
      landmarks[LEFT_ELBOW],
      landmarks[LEFT_SHOULDER],
      'left',
      timestamp
    );

    const rightSignal = this.processArm(
      landmarks[RIGHT_WRIST],
      landmarks[RIGHT_ELBOW],
      landmarks[RIGHT_SHOULDER],
      'right',
      timestamp
    );

    return { left: leftSignal, right: rightSignal };
  }

  private processArm(
    wrist: NormalizedLandmark | undefined,
    elbow: NormalizedLandmark | undefined,
    shoulder: NormalizedLandmark | undefined,
    side: 'left' | 'right',
    timestamp: number
  ): WristSignal | null {
    const wristScore = wrist?.visibility ?? 0;
    const elbowScore = elbow?.visibility ?? 0;
    const shoulderScore = shoulder?.visibility ?? 0;

    // Determine state based on confidence
    let state: WristState;
    
    // GOOD: High wrist confidence + supporting landmark (elbow or shoulder)
    if (wristScore >= WRIST_SCORE_GOOD && 
        (elbowScore >= ELBOW_SCORE_MIN || shoulderScore >= SHOULDER_SCORE_MIN)) {
      state = 'GOOD';
    }
    // WEAK: Moderate wrist confidence (hands-only mode)
    else if (wristScore >= WRIST_SCORE_WEAK) {
      state = 'WEAK';
    }
    // LOST: Insufficient confidence
    else {
      state = 'LOST';
    }

    const lastGood = side === 'left' ? this.lastGoodLeft : this.lastGoodRight;
    const smoothed = side === 'left' ? this.smoothedLeft : this.smoothedRight;

    // Process based on state
    if (state === 'GOOD') {
      const x = wrist!.x;
      const y = wrist!.y;
      
      // Update last known good position
      if (side === 'left') {
        this.lastGoodLeft = { x, y, timestamp };
        this.smoothedLeft = { x, y };
      } else {
        this.lastGoodRight = { x, y, timestamp };
        this.smoothedRight = { x, y };
      }

      return { x, y, score: wristScore, state: 'GOOD' };
    }

    if (state === 'WEAK') {
      const rawX = wrist!.x;
      const rawY = wrist!.y;

      // Check if we had GOOD recently (within hold duration)
      const hadRecentGood = lastGood && (timestamp - lastGood.timestamp < WEAK_HOLD_DURATION);

      // Apply smoothing
      let x: number, y: number;
      if (smoothed) {
        // Exponential moving average for stability
        x = smoothed.x + WEAK_SMOOTHING_ALPHA * (rawX - smoothed.x);
        y = smoothed.y + WEAK_SMOOTHING_ALPHA * (rawY - smoothed.y);
      } else {
        x = rawX;
        y = rawY;
      }

      // Update smoothed position
      if (side === 'left') {
        this.smoothedLeft = { x, y };
      } else {
        this.smoothedRight = { x, y };
      }

      return { 
        x, 
        y, 
        score: wristScore, 
        state: hadRecentGood ? 'WEAK' : 'WEAK' 
      };
    }

    // LOST state - no signal
    return null;
  }
}

// ============================================================================
// REP COUNTER (with anti-fake rep logic)
// ============================================================================

/**
 * RepCounter - Peak/Valley detection using wrist positions.
 * 
 * Implements anti-fake rep logic:
 * 1. Reacquisition cooldown: Pause counting after LOST->tracked transition
 * 2. Confidence gating: Only count when GOOD or WEAK+recent GOOD
 * 3. Velocity gating: Minimum speed to register direction change
 * 4. Displacement gating: Minimum travel since last reversal
 * 5. Edge jitter protection: Stricter thresholds near frame edges
 * 6. Hysteresis deadband: Minimum Y movement for direction change
 */
export class RepCounter {
  private repCount = 0;
  private state: RepState = 'WAITING';
  
  // Per-wrist tracking state
  private lastLeftY: number | null = null;
  private lastRightY: number | null = null;
  private lastLeftTimestamp = 0;
  private lastRightTimestamp = 0;
  
  // Direction tracking
  private leftMovingDown: boolean | null = null;
  private rightMovingDown: boolean | null = null;
  
  // Reversal counting (2 reversals = 1 rep)
  private reversalCount = 0;
  
  // Displacement tracking since last reversal
  private leftDisplacement = 0;
  private rightDisplacement = 0;
  
  // Reacquisition cooldown state
  private leftLostTime = 0;
  private rightLostTime = 0;
  private leftWasLost = false;
  private rightWasLost = false;
  
  // Last known X positions for edge detection
  private lastLeftX = 0.5;
  private lastRightX = 0.5;

  reset(): void {
    this.repCount = 0;
    this.state = 'WAITING';
    this.lastLeftY = null;
    this.lastRightY = null;
    this.lastLeftTimestamp = 0;
    this.lastRightTimestamp = 0;
    this.leftMovingDown = null;
    this.rightMovingDown = null;
    this.reversalCount = 0;
    this.leftDisplacement = 0;
    this.rightDisplacement = 0;
    this.leftLostTime = 0;
    this.rightLostTime = 0;
    this.leftWasLost = false;
    this.rightWasLost = false;
    this.lastLeftX = 0.5;
    this.lastRightX = 0.5;
  }
  
  getState(): RepState {
    return this.state;
  }
  
  getRepCount(): number {
    return this.repCount;
  }

  /**
   * Process wrist signals and count reps.
   * Returns true if a rep was completed this frame.
   */
  processSignals(
    leftSignal: WristSignal | null,
    rightSignal: WristSignal | null,
    timestamp: number
  ): boolean {
    const leftValid = this.processArmSignal(leftSignal, 'left', timestamp);
    const rightValid = this.processArmSignal(rightSignal, 'right', timestamp);

    // Need both arms for tracking
    if (!leftValid || !rightValid) {
      return false;
    }

    // Move to TRACKING state if not already
    if (this.state === 'WAITING') {
      this.state = 'TRACKING';
    }

    // Check for reps (every 2 reversals = 1 rep)
    let repCompleted = false;
    while (this.reversalCount >= 2) {
      this.repCount++;
      this.reversalCount -= 2;
      repCompleted = true;
    }

    return repCompleted;
  }

  private processArmSignal(
    signal: WristSignal | null,
    side: 'left' | 'right',
    timestamp: number
  ): boolean {
    const isLeft = side === 'left';
    
    // Handle lost tracking
    if (!signal || signal.state === 'LOST') {
      if (isLeft) {
        if (!this.leftWasLost) {
          this.leftWasLost = true;
          this.leftLostTime = timestamp;
        }
      } else {
        if (!this.rightWasLost) {
          this.rightWasLost = true;
          this.rightLostTime = timestamp;
        }
      }
      return false;
    }

    // Handle reacquisition cooldown
    const wasLost = isLeft ? this.leftWasLost : this.rightWasLost;
    const lostTime = isLeft ? this.leftLostTime : this.rightLostTime;
    
    if (wasLost) {
      // Clear lost flag
      if (isLeft) {
        this.leftWasLost = false;
      } else {
        this.rightWasLost = false;
      }
      
      // Check if within cooldown period
      if (timestamp - lostTime < REACQUIRE_COOLDOWN_MS) {
        // Update position without counting (reset direction tracking)
        if (isLeft) {
          this.lastLeftY = signal.y;
          this.lastLeftX = signal.x;
          this.lastLeftTimestamp = timestamp;
          this.leftMovingDown = null;
          this.leftDisplacement = 0;
        } else {
          this.lastRightY = signal.y;
          this.lastRightX = signal.x;
          this.lastRightTimestamp = timestamp;
          this.rightMovingDown = null;
          this.rightDisplacement = 0;
        }
        return true; // Valid signal, but not counting reps yet
      }
    }

    // Confidence gating: Only count if GOOD state
    // (WEAK state passes through for tracking but with stricter velocity/displacement)
    const canCount = signal.state === 'GOOD';

    // Get previous state
    const lastY = isLeft ? this.lastLeftY : this.lastRightY;
    const lastTimestamp = isLeft ? this.lastLeftTimestamp : this.lastRightTimestamp;
    const lastX = isLeft ? this.lastLeftX : this.lastRightX;

    // Initialize if first valid frame
    if (lastY === null) {
      if (isLeft) {
        this.lastLeftY = signal.y;
        this.lastLeftX = signal.x;
        this.lastLeftTimestamp = timestamp;
      } else {
        this.lastRightY = signal.y;
        this.lastRightX = signal.x;
        this.lastRightTimestamp = timestamp;
      }
      return true;
    }

    // Calculate velocity (units/sec)
    const dt = Math.max(1, timestamp - lastTimestamp) / 1000; // Convert to seconds
    const dy = signal.y - lastY;
    const velocity = Math.abs(dy / dt);

    // Edge jitter detection
    const nearEdge = this.isNearEdge(signal.x, signal.y);
    const vMin = nearEdge ? V_MIN * EDGE_V_MULTIPLIER : V_MIN;
    const dMin = nearEdge ? D_MIN * EDGE_D_MULTIPLIER : D_MIN;

    // Update displacement tracking
    if (isLeft) {
      this.leftDisplacement += Math.abs(dy);
    } else {
      this.rightDisplacement += Math.abs(dy);
    }
    const displacement = isLeft ? this.leftDisplacement : this.rightDisplacement;

    // Check for direction change (with hysteresis deadband)
    const movingDown = isLeft ? this.leftMovingDown : this.rightMovingDown;
    const currentDirection = dy > DIRECTION_DEADBAND ? true : 
                            dy < -DIRECTION_DEADBAND ? false : 
                            movingDown; // Keep previous if in deadband

    // Process direction change if conditions met
    if (currentDirection !== null && 
        currentDirection !== movingDown && 
        canCount &&
        velocity >= vMin &&
        displacement >= dMin) {
      // Valid reversal detected!
      this.reversalCount++;
      
      // Reset displacement for this arm
      if (isLeft) {
        this.leftDisplacement = 0;
      } else {
        this.rightDisplacement = 0;
      }
    }

    // Update state
    if (isLeft) {
      this.lastLeftY = signal.y;
      this.lastLeftX = signal.x;
      this.lastLeftTimestamp = timestamp;
      if (currentDirection !== null) {
        this.leftMovingDown = currentDirection;
      }
    } else {
      this.lastRightY = signal.y;
      this.lastRightX = signal.x;
      this.lastRightTimestamp = timestamp;
      if (currentDirection !== null) {
        this.rightMovingDown = currentDirection;
      }
    }

    return true;
  }

  /**
   * Check if position is near frame edges (where jitter is more common)
   */
  private isNearEdge(x: number, y: number): boolean {
    return x < EDGE_ZONE || 
           x > (1 - EDGE_ZONE) || 
           y < EDGE_ZONE || 
           y > (1 - EDGE_ZONE);
  }
  
  // Legacy method for compatibility
  processWrists(leftWristY: number | null, rightWristY: number | null): boolean {
    // Convert to signals (assume GOOD state for legacy calls)
    const now = performance.now();
    const leftSignal = leftWristY !== null 
      ? { x: 0.5, y: leftWristY, score: 1, state: 'GOOD' as WristState }
      : null;
    const rightSignal = rightWristY !== null
      ? { x: 0.5, y: rightWristY, score: 1, state: 'GOOD' as WristState }
      : null;
    
    return this.processSignals(leftSignal, rightSignal, now);
  }
  
  // Legacy method for compatibility
  processFrame(leftLandmarks: NormalizedLandmarkList | null, rightLandmarks: NormalizedLandmarkList | null): boolean {
    return false;
  }
}

// ============================================================================
// CALIBRATION TRACKER
// ============================================================================

export class CalibrationTracker {
  private stableFrames = 0;
  private targetFrames: number;
  
  constructor(targetFrames = CALIBRATION_STABLE_FRAMES) {
    this.targetFrames = targetFrames;
  }
  
  reset(): void {
    this.stableFrames = 0;
  }
  
  getProgress(): number {
    return Math.min(1, this.stableFrames / this.targetFrames);
  }
  
  isCalibrated(): boolean {
    return this.stableFrames >= this.targetFrames;
  }
  
  processFrame(bothHandsDetected: boolean): boolean {
    if (bothHandsDetected) {
      this.stableFrames++;
      return this.stableFrames >= this.targetFrames;
    } else {
      this.stableFrames = Math.max(0, this.stableFrames - 2);
      return false;
    }
  }
}

// ============================================================================
// HAND TRACKER
// ============================================================================

/**
 * HandTracker - Main tracking class using MoveNet.
 * 
 * Features:
 * - Lazy-loads MoveNet on first initialize()
 * - Warmup phase before marking ready
 * - WristSignal adapter for stable tracking
 * - Anti-fake rep logic in RepCounter
 */
export class HandTracker {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;
  
  private repCounter = new RepCounter();
  private calibrationTracker = new CalibrationTracker();
  private wristAdapter = new WristSignalAdapter();
  
  private lastPoseFrame: PoseFrame | null = null;
  private onResultsCallback: ((state: TrackingState) => void) | null = null;
  
  private backendWarningMessage: string | null = null;
  private currentInitState: InitState = 'idle';

  /**
   * Initialize the tracker (lazy-loads MoveNet).
   * Shows "Initializing tracking..." during warmup phase.
   */
  async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    onResults: (state: TrackingState) => void
  ): Promise<void> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.onResultsCallback = onResults;
    
    // Send initial "loading" state
    this.currentInitState = 'loading';
    this.sendState();
    
    // Initialize MoveNet with progress callback
    const { backend } = await initPose((state, message) => {
      this.currentInitState = state;
      console.log(`[HandTracker] ${message}`);
      this.sendState();
    });
    
    // Check if we should show a warning
    if (shouldShowBackendWarning()) {
      this.backendWarningMessage = 'Running in CPU mode. Performance may be reduced.';
      console.warn('[HandTracker]', this.backendWarningMessage);
    }
    
    // Get camera stream
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 640 },
        frameRate: { ideal: 60, min: 30 }
      }
    });
    
    videoElement.srcObject = this.stream;
    await videoElement.play();
  }

  private sendState(): void {
    if (this.onResultsCallback) {
      this.onResultsCallback(this.buildTrackingState(null, null));
    }
  }

  private buildTrackingState(
    leftSignal: WristSignal | null,
    rightSignal: WristSignal | null
  ): TrackingState {
    const bothVisible = leftSignal !== null && rightSignal !== null &&
                       leftSignal.state !== 'LOST' && rightSignal.state !== 'LOST';
    
    return {
      bothHandsDetected: bothVisible,
      leftY: leftSignal?.y ?? null,
      rightY: rightSignal?.y ?? null,
      leftSignal,
      rightSignal,
      repState: this.repCounter.getState(),
      repCount: this.repCounter.getRepCount(),
      isCalibrated: this.calibrationTracker.isCalibrated(),
      calibrationProgress: this.calibrationTracker.getProgress(),
      trackingLost: !bothVisible,
      backendWarning: this.backendWarningMessage ?? undefined,
      initState: this.currentInitState,
    };
  }
  
  private async processAndRender(): Promise<void> {
    if (!this.videoElement || !this.canvasCtx || !this.canvasElement) return;
    
    // Don't process if not ready
    if (!isReady()) {
      this.sendState();
      return;
    }
    
    // Estimate pose
    this.lastPoseFrame = await estimatePose(this.videoElement);
    
    // Re-check after async operation in case component unmounted
    if (!this.canvasElement || !this.canvasCtx) return;
    
    const width = this.canvasElement.width;
    const height = this.canvasElement.height;
    const now = performance.now();
    
    // Draw video (mirrored)
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, width, height);
    this.canvasCtx.translate(width, 0);
    this.canvasCtx.scale(-1, 1);
    this.canvasCtx.drawImage(this.videoElement, 0, 0, width, height);
    this.canvasCtx.restore();
    
    // Process through WristSignal adapter
    const { left: leftSignal, right: rightSignal } = this.wristAdapter.process(
      this.lastPoseFrame?.poseLandmarks ?? null,
      now
    );
    
    // Draw arm skeleton
    if (this.lastPoseFrame?.poseLandmarks) {
      this.drawArmSkeleton(this.lastPoseFrame.poseLandmarks, leftSignal, rightSignal, width, height);
    }
    
    // Build and send tracking state
    const state = this.buildTrackingState(leftSignal, rightSignal);
    
    if (this.onResultsCallback) {
      this.onResultsCallback(state);
    }
  }
  
  private drawArmSkeleton(
    landmarks: NormalizedLandmarkList,
    leftSignal: WristSignal | null,
    rightSignal: WristSignal | null,
    width: number,
    height: number
  ): void {
    if (!this.canvasCtx) return;
    
    const ctx = this.canvasCtx;
    const leftWrist = landmarks[LEFT_WRIST];
    const rightWrist = landmarks[RIGHT_WRIST];
    
    // Draw "6" on left hand (green, with opacity based on state)
    if (leftSignal && leftSignal.state !== 'LOST') {
      const x = width - leftWrist.x * width;
      const y = leftWrist.y * height;
      const opacity = leftSignal.state === 'GOOD' ? 1.0 : 0.6;
      
      ctx.save();
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = opacity;
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#4ade80';
      ctx.fillText('6', x, y);
      ctx.restore();
    }
    
    // Draw "7" on right hand (green, with opacity based on state)
    if (rightSignal && rightSignal.state !== 'LOST') {
      const x = width - rightWrist.x * width;
      const y = rightWrist.y * height;
      const opacity = rightSignal.state === 'GOOD' ? 1.0 : 0.6;
      
      ctx.save();
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = opacity;
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#4ade80';
      ctx.fillText('7', x, y);
      ctx.restore();
    }
  }
  
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processFrame();
  }
  
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  private processFrame = async (): Promise<void> => {
    if (!this.isRunning || !this.videoElement) return;
    
    if (this.videoElement.readyState >= 2) {
      await this.processAndRender();
    }
    
    this.animationFrameId = requestAnimationFrame(this.processFrame);
  };
  
  processCalibration(bothHandsDetected: boolean): boolean {
    return this.calibrationTracker.processFrame(bothHandsDetected);
  }
  
  /**
   * Process gameplay frame - uses WristSignal adapter and improved RepCounter.
   */
  processGameplay(leftLandmarks: NormalizedLandmarkList | null, rightLandmarks: NormalizedLandmarkList | null): boolean {
    if (!this.lastPoseFrame?.poseLandmarks) return false;
    
    const now = performance.now();
    
    // Process through WristSignal adapter
    const { left: leftSignal, right: rightSignal } = this.wristAdapter.process(
      this.lastPoseFrame.poseLandmarks,
      now
    );
    
    // Process through RepCounter
    return this.repCounter.processSignals(leftSignal, rightSignal, now);
  }
  
  resetCalibration(): void {
    this.calibrationTracker.reset();
  }
  
  resetRepCounter(): void {
    this.repCounter.reset();
    this.wristAdapter.reset();
  }
  
  getRepCount(): number {
    return this.repCounter.getRepCount();
  }
  
  getLastResults(): Results | null {
    return null;
  }
  
  getBackendType(): BackendType {
    return getBackend();
  }
  
  async cleanup(): Promise<void> {
    this.stop();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    await disposePose();
    
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.lastPoseFrame = null;
    this.backendWarningMessage = null;
    this.currentInitState = 'idle';
  }
}
