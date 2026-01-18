/**
 * MediaPipe Pose Integration for 67Ranked
 * 
 * Using POSE instead of HANDS because:
 * - Tracks larger body parts (arms, torso) - more robust during fast motion
 * - Wrist landmarks are sufficient - we don't need finger details
 * - Better tracking during motion blur
 * 
 * REP COUNTING: Peak/Valley Detection on wrist Y positions
 */

// Types for MediaPipe Pose
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type NormalizedLandmarkList = NormalizedLandmark[];

export interface PoseResults {
  image: HTMLCanvasElement;
  poseLandmarks?: NormalizedLandmarkList;
}

interface MediaPipePose {
  setOptions(options: {
    modelComplexity?: number;
    smoothLandmarks?: boolean;
    enableSegmentation?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }): void;
  onResults(callback: (results: PoseResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

// Keep Results type for compatibility
export interface Results {
  image: HTMLCanvasElement;
  multiHandLandmarks?: NormalizedLandmarkList[];
  multiHandedness?: Array<{ label: string; score: number }>;
}

// Pose landmark indices
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

// Types
export type RepState = 'WAITING' | 'TRACKING';

export interface TrackingState {
  bothHandsDetected: boolean;
  leftY: number | null;
  rightY: number | null;
  repState: RepState;
  repCount: number;
  isCalibrated: boolean;
  calibrationProgress: number;
  trackingLost: boolean;
}

// Constants
const CALIBRATION_STABLE_FRAMES = 15;
const MIN_MOVEMENT = 0.012; // Minimum movement to count as direction change
const MIN_VISIBILITY = 0.5; // Minimum visibility score to trust landmark

/**
 * RepCounter - Peak/Valley detection using wrist positions
 */
export class RepCounter {
  private repCount = 0;
  private state: RepState = 'WAITING';
  
  private lastLeftY: number | null = null;
  private lastRightY: number | null = null;
  
  private leftMovingDown: boolean | null = null;
  private rightMovingDown: boolean | null = null;
  
  private reversalCount = 0;
  
  reset(): void {
    this.repCount = 0;
    this.state = 'WAITING';
    this.lastLeftY = null;
    this.lastRightY = null;
    this.leftMovingDown = null;
    this.rightMovingDown = null;
    this.reversalCount = 0;
  }
  
  getState(): RepState {
    return this.state;
  }
  
  getRepCount(): number {
    return this.repCount;
  }
  
  processWrists(leftWristY: number | null, rightWristY: number | null): boolean {
    if (leftWristY === null || rightWristY === null) {
      return false;
    }
    
    if (this.lastLeftY === null || this.lastRightY === null) {
      this.lastLeftY = leftWristY;
      this.lastRightY = rightWristY;
      this.state = 'TRACKING';
      return false;
    }
    
    const leftDelta = leftWristY - this.lastLeftY;
    const rightDelta = rightWristY - this.lastRightY;
    
    let repCompleted = false;
    
    // Check left wrist direction change
    if (Math.abs(leftDelta) > MIN_MOVEMENT) {
      const leftNowDown = leftDelta > 0;
      if (this.leftMovingDown !== null && leftNowDown !== this.leftMovingDown) {
        this.reversalCount++;
      }
      this.leftMovingDown = leftNowDown;
    }
    
    // Check right wrist direction change
    if (Math.abs(rightDelta) > MIN_MOVEMENT) {
      const rightNowDown = rightDelta > 0;
      if (this.rightMovingDown !== null && rightNowDown !== this.rightMovingDown) {
        this.reversalCount++;
      }
      this.rightMovingDown = rightNowDown;
    }
    
    // Every 2 reversals = 1 rep
    while (this.reversalCount >= 2) {
      this.repCount++;
      this.reversalCount -= 2;
      repCompleted = true;
    }
    
    this.lastLeftY = leftWristY;
    this.lastRightY = rightWristY;
    
    return repCompleted;
  }
  
  // Legacy method for compatibility
  processFrame(leftLandmarks: NormalizedLandmarkList | null, rightLandmarks: NormalizedLandmarkList | null): boolean {
    // Not used with pose, but kept for interface compatibility
    return false;
  }
}

/**
 * CalibrationTracker
 */
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

/**
 * Load MediaPipe Pose from CDN
 */
async function loadMediaPipePose(): Promise<new (config: { locateFile: (file: string) => string }) => MediaPipePose> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('MediaPipe can only be loaded in browser'));
      return;
    }
    
    const win = window as typeof window & { Pose?: new (config: { locateFile: (file: string) => string }) => MediaPipePose };
    if (win.Pose) {
      resolve(win.Pose);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      const win = window as typeof window & { Pose?: new (config: { locateFile: (file: string) => string }) => MediaPipePose };
      if (win.Pose) {
        resolve(win.Pose);
      } else {
        reject(new Error('MediaPipe Pose failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load MediaPipe Pose script'));
    document.head.appendChild(script);
  });
}

/**
 * HandTracker - Now using MediaPipe Pose for wrist tracking
 */
export class HandTracker {
  private pose: MediaPipePose | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;
  
  private repCounter = new RepCounter();
  private calibrationTracker = new CalibrationTracker();
  
  private lastPoseResults: PoseResults | null = null;
  private onResultsCallback: ((state: TrackingState) => void) | null = null;
  
  async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    onResults: (state: TrackingState) => void
  ): Promise<void> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.onResultsCallback = onResults;
    
    const Pose = await loadMediaPipePose();
    
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });
    
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: false, // Disable smoothing for faster response
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.3 // Lower threshold for fast motion
    });
    
    this.pose.onResults((results) => this.onPoseResults(results));
    
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
  
  private onPoseResults(results: PoseResults): void {
    this.lastPoseResults = results;
    
    if (!this.canvasCtx || !this.canvasElement || !this.videoElement) return;
    
    const width = this.canvasElement.width;
    const height = this.canvasElement.height;
    
    // Draw video (mirrored)
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, width, height);
    this.canvasCtx.translate(width, 0);
    this.canvasCtx.scale(-1, 1);
    this.canvasCtx.drawImage(this.videoElement, 0, 0, width, height);
    this.canvasCtx.restore();
    
    let leftWristY: number | null = null;
    let rightWristY: number | null = null;
    let bothVisible = false;
    
    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;
      
      // Get wrist positions (check visibility)
      const leftWrist = landmarks[LEFT_WRIST];
      const rightWrist = landmarks[RIGHT_WRIST];
      const leftElbow = landmarks[LEFT_ELBOW];
      const rightElbow = landmarks[RIGHT_ELBOW];
      
      const leftVisible = (leftWrist?.visibility ?? 0) > MIN_VISIBILITY;
      const rightVisible = (rightWrist?.visibility ?? 0) > MIN_VISIBILITY;
      
      if (leftVisible) {
        leftWristY = leftWrist.y;
      }
      if (rightVisible) {
        rightWristY = rightWrist.y;
      }
      
      bothVisible = leftVisible && rightVisible;
      
      // Draw arm skeleton
      this.drawArmSkeleton(landmarks, width, height);
    }
    
    const state: TrackingState = {
      bothHandsDetected: bothVisible,
      leftY: leftWristY,
      rightY: rightWristY,
      repState: this.repCounter.getState(),
      repCount: this.repCounter.getRepCount(),
      isCalibrated: this.calibrationTracker.isCalibrated(),
      calibrationProgress: this.calibrationTracker.getProgress(),
      trackingLost: !bothVisible
    };
    
    if (this.onResultsCallback) {
      this.onResultsCallback(state);
    }
  }
  
  private drawArmSkeleton(landmarks: NormalizedLandmarkList, width: number, height: number): void {
    if (!this.canvasCtx) return;
    
    const ctx = this.canvasCtx;
    
    // Get wrist positions
    const leftWrist = landmarks[LEFT_WRIST];
    const rightWrist = landmarks[RIGHT_WRIST];
    
    // Draw "6" on left hand (green)
    if ((leftWrist?.visibility ?? 0) > MIN_VISIBILITY) {
      const x = width - leftWrist.x * width;
      const y = leftWrist.y * height;
      
      // Draw large "6" with glow effect
      ctx.save();
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Glow effect
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 20;
      
      // Fill with green
      ctx.fillStyle = '#4ade80';
      ctx.fillText('6', x, y);
      
      ctx.restore();
    }
    
    // Draw "7" on right hand (green)
    if ((rightWrist?.visibility ?? 0) > MIN_VISIBILITY) {
      const x = width - rightWrist.x * width;
      const y = rightWrist.y * height;
      
      // Draw large "7" with glow effect
      ctx.save();
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Glow effect
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 20;
      
      // Fill with green
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
    if (!this.isRunning || !this.pose || !this.videoElement) return;
    
    if (this.videoElement.readyState >= 2) {
      await this.pose.send({ image: this.videoElement });
    }
    
    this.animationFrameId = requestAnimationFrame(this.processFrame);
  };
  
  processCalibration(bothHandsDetected: boolean): boolean {
    return this.calibrationTracker.processFrame(bothHandsDetected);
  }
  
  processGameplay(leftLandmarks: NormalizedLandmarkList | null, rightLandmarks: NormalizedLandmarkList | null): boolean {
    // Use pose wrist data instead
    if (!this.lastPoseResults?.poseLandmarks) return false;
    
    const landmarks = this.lastPoseResults.poseLandmarks;
    const leftWrist = landmarks[LEFT_WRIST];
    const rightWrist = landmarks[RIGHT_WRIST];
    
    const leftY = (leftWrist?.visibility ?? 0) > MIN_VISIBILITY ? leftWrist.y : null;
    const rightY = (rightWrist?.visibility ?? 0) > MIN_VISIBILITY ? rightWrist.y : null;
    
    return this.repCounter.processWrists(leftY, rightY);
  }
  
  resetCalibration(): void {
    this.calibrationTracker.reset();
  }
  
  resetRepCounter(): void {
    this.repCounter.reset();
  }
  
  getRepCount(): number {
    return this.repCounter.getRepCount();
  }
  
  getLastResults(): Results | null {
    // Return null - we're using pose now, not hands
    return null;
  }
  
  cleanup(): void {
    this.stop();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.pose) {
      this.pose.close();
      this.pose = null;
    }
    
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
  }
}
