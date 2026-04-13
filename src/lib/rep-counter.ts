/**
 * Shared rep-counting logic — no browser or TF.js dependencies.
 * Importable from both client (hand-tracking.ts) and server (validation.ts).
 */

// ============================================================================
// TYPES
// ============================================================================

export type WristState = 'GOOD' | 'WEAK' | 'LOST';
export type RepState = 'WAITING' | 'TRACKING';

export interface WristSignal {
  x: number;           // Normalized 0-1
  y: number;           // Normalized 0-1
  score: number;       // Confidence 0-1
  state: WristState;   // Tracking quality
}

/** Dense frame sample sent to server for replay-based rep counting */
export interface PoseSample {
  /** ms since game start */
  t: number;
  /** Left wrist Y position (0-1 normalized) */
  ly: number;
  /** Left wrist confidence score (0-1) */
  ls: number;
  /** Left wrist tracking state */
  lState: WristState;
  /** Right wrist Y position (0-1 normalized) */
  ry: number;
  /** Right wrist confidence score (0-1) */
  rs: number;
  /** Right wrist tracking state */
  rState: WristState;
}

// ============================================================================
// TUNABLE THRESHOLDS
// ============================================================================

const REACQUIRE_COOLDOWN_MS = 120;
const V_MIN = 0.9;
const D_MIN = 0.06;
const EDGE_ZONE = 0.03;
const EDGE_V_MULTIPLIER = 1.5;
const EDGE_D_MULTIPLIER = 1.5;
const DIRECTION_DEADBAND = 0.015;

/** Maximum pose samples to record per game session (cap to prevent huge payloads) */
const MAX_POSE_SAMPLES_CLIENT = 3000;

// ============================================================================
// REP COUNTER
// ============================================================================

/**
 * RepCounter — Peak/Valley detection using wrist Y positions.
 *
 * Anti-fake rep logic:
 * 1. Reacquisition cooldown: pause after LOST → tracked transition
 * 2. Confidence gating: only count when GOOD state
 * 3. Velocity gating: minimum speed to register direction change
 * 4. Displacement gating: minimum travel since last reversal
 * 5. Edge jitter protection: stricter thresholds near frame edges
 * 6. Hysteresis deadband: minimum Y movement for direction change
 *
 * Also records dense pose samples every ~100ms for server-side replay.
 */
export class RepCounter {
  private repCount = 0;
  private state: RepState = 'WAITING';

  private lastLeftY: number | null = null;
  private lastRightY: number | null = null;
  private lastLeftTimestamp = 0;
  private lastRightTimestamp = 0;

  private leftMovingDown: boolean | null = null;
  private rightMovingDown: boolean | null = null;

  private reversalCount = 0;

  private leftDisplacement = 0;
  private rightDisplacement = 0;

  private leftLostTime = 0;
  private rightLostTime = 0;
  private leftWasLost = false;
  private rightWasLost = false;

  private lastLeftX = 0.5;
  private lastRightX = 0.5;

  // Sparse rep events (one per completed rep)
  private repEvents: Array<{ t: number; ly: number; ry: number }> = [];
  // Dense pose samples (every frame) for server-side replay
  private poseSamples: PoseSample[] = [];

  private gameStartTime = 0;

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
    this.repEvents = [];
    this.poseSamples = [];
    this.gameStartTime = 0;
  }

  setGameStartTime(timestamp: number): void {
    this.gameStartTime = timestamp;
  }

  getState(): RepState {
    return this.state;
  }

  getRepCount(): number {
    return this.repCount;
  }

  getRepEvents(): Array<{ t: number; ly: number; ry: number }> {
    return [...this.repEvents];
  }

  getPoseSamples(): PoseSample[] {
    return [...this.poseSamples];
  }

  /**
   * Process wrist signals for one frame and count reps.
   * Also records a dense pose sample every ~100ms for server-side replay.
   * Returns true if a rep completed this frame.
   */
  processSignals(
    leftSignal: WristSignal | null,
    rightSignal: WristSignal | null,
    timestamp: number
  ): boolean {
    // Record a pose sample every frame during an active game.
    // No time throttle — intermediate frames contain reversal detections that would be
    // missed if sampled coarsely, causing the server replay count to diverge from the client.
    if (this.gameStartTime > 0 && this.poseSamples.length < MAX_POSE_SAMPLES_CLIENT) {
      this.poseSamples.push({
        t: Math.round(timestamp - this.gameStartTime),
        ly: leftSignal?.y ?? 0,
        ls: leftSignal?.score ?? 0,
        lState: leftSignal?.state ?? 'LOST',
        ry: rightSignal?.y ?? 0,
        rs: rightSignal?.score ?? 0,
        rState: rightSignal?.state ?? 'LOST',
      });
    }

    const leftValid = this.processArmSignal(leftSignal, 'left', timestamp);
    const rightValid = this.processArmSignal(rightSignal, 'right', timestamp);

    if (!leftValid || !rightValid) {
      return false;
    }

    if (this.state === 'WAITING') {
      this.state = 'TRACKING';
    }

    let repCompleted = false;
    while (this.reversalCount >= 2) {
      this.repCount++;
      this.reversalCount -= 2;
      repCompleted = true;

      this.repEvents.push({
        t: Math.round(timestamp - this.gameStartTime),
        ly: leftSignal ? Math.round(leftSignal.y * 1000) / 1000 : 0,
        ry: rightSignal ? Math.round(rightSignal.y * 1000) / 1000 : 0,
      });
    }

    return repCompleted;
  }

  private processArmSignal(
    signal: WristSignal | null,
    side: 'left' | 'right',
    timestamp: number
  ): boolean {
    const isLeft = side === 'left';

    if (!signal || signal.state === 'LOST') {
      if (isLeft) {
        if (!this.leftWasLost) { this.leftWasLost = true; this.leftLostTime = timestamp; }
      } else {
        if (!this.rightWasLost) { this.rightWasLost = true; this.rightLostTime = timestamp; }
      }
      return false;
    }

    const wasLost = isLeft ? this.leftWasLost : this.rightWasLost;
    const lostTime = isLeft ? this.leftLostTime : this.rightLostTime;

    if (wasLost) {
      if (isLeft) { this.leftWasLost = false; } else { this.rightWasLost = false; }

      if (timestamp - lostTime < REACQUIRE_COOLDOWN_MS) {
        if (isLeft) {
          this.lastLeftY = signal.y; this.lastLeftX = signal.x;
          this.lastLeftTimestamp = timestamp; this.leftMovingDown = null; this.leftDisplacement = 0;
        } else {
          this.lastRightY = signal.y; this.lastRightX = signal.x;
          this.lastRightTimestamp = timestamp; this.rightMovingDown = null; this.rightDisplacement = 0;
        }
        return true;
      }
    }

    const canCount = signal.state === 'GOOD';
    const lastY = isLeft ? this.lastLeftY : this.lastRightY;
    const lastTimestamp = isLeft ? this.lastLeftTimestamp : this.lastRightTimestamp;

    if (lastY === null) {
      if (isLeft) {
        this.lastLeftY = signal.y; this.lastLeftX = signal.x; this.lastLeftTimestamp = timestamp;
      } else {
        this.lastRightY = signal.y; this.lastRightX = signal.x; this.lastRightTimestamp = timestamp;
      }
      return true;
    }

    const dt = Math.max(1, timestamp - lastTimestamp) / 1000;
    const dy = signal.y - lastY;
    const velocity = Math.abs(dy / dt);

    const nearEdge = this.isNearEdge(signal.x, signal.y);
    const vMin = nearEdge ? V_MIN * EDGE_V_MULTIPLIER : V_MIN;
    const dMin = nearEdge ? D_MIN * EDGE_D_MULTIPLIER : D_MIN;

    if (isLeft) { this.leftDisplacement += Math.abs(dy); }
    else { this.rightDisplacement += Math.abs(dy); }
    const displacement = isLeft ? this.leftDisplacement : this.rightDisplacement;

    const movingDown = isLeft ? this.leftMovingDown : this.rightMovingDown;
    const currentDirection =
      dy > DIRECTION_DEADBAND ? true :
      dy < -DIRECTION_DEADBAND ? false :
      movingDown;

    if (
      currentDirection !== null &&
      currentDirection !== movingDown &&
      canCount &&
      velocity >= vMin &&
      displacement >= dMin
    ) {
      this.reversalCount++;
      if (isLeft) { this.leftDisplacement = 0; }
      else { this.rightDisplacement = 0; }
    }

    if (isLeft) {
      this.lastLeftY = signal.y; this.lastLeftX = signal.x; this.lastLeftTimestamp = timestamp;
      if (currentDirection !== null) { this.leftMovingDown = currentDirection; }
    } else {
      this.lastRightY = signal.y; this.lastRightX = signal.x; this.lastRightTimestamp = timestamp;
      if (currentDirection !== null) { this.rightMovingDown = currentDirection; }
    }

    return true;
  }

  private isNearEdge(x: number, y: number): boolean {
    return x < EDGE_ZONE || x > (1 - EDGE_ZONE) || y < EDGE_ZONE || y > (1 - EDGE_ZONE);
  }
}
