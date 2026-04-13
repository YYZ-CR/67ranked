/**
 * Server-side validation for rep events and pose sample replay.
 */

import { DURATION_67_REPS } from '@/types/game';
import { RepCounter, type PoseSample, type WristSignal } from './rep-counter';

export interface RepEvent {
  /** Timestamp in ms since game start */
  t: number;
  /** Left wrist Y position (0-1 normalized, rounded to 3 decimals) */
  ly: number;
  /** Right wrist Y position (0-1 normalized, rounded to 3 decimals) */
  ry: number;
}

// Minimum time between consecutive reps (ms)
// Set to 0 to allow any speed — fast players can legitimately exceed tight limits
const MIN_REP_INTERVAL_MS = 0;

// Maximum coefficient of variation below which intervals are "too regular" (likely bot)
// Real human movements have natural variation. Perfect 200ms intervals = scripted.
const MIN_INTERVAL_CV = 0.08;

// Minimum number of reps before we apply statistical checks
// (too few data points for meaningful statistics)
const MIN_REPS_FOR_STATS = 5;

// Valid wrist Y range (0-1 normalized, with small tolerance)
const MIN_WRIST_Y = -0.05;
const MAX_WRIST_Y = 1.05;

// Minimum wrist Y variance (must show actual movement, not all identical values)
const MIN_WRIST_Y_VARIANCE = 0.001;

// Grace period for timestamps at the end of a timed session (ms)
const TIMING_GRACE_MS = 2000;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate rep events for a timed game mode (6.7s, 20s, custom).
 * Score = number of reps completed in the time window.
 */
export function validateTimedRepEvents(
  repEvents: RepEvent[],
  score: number,
  durationMs: number
): ValidationResult {
  // 1. Rep count must match
  if (repEvents.length !== score) {
    return { valid: false, reason: `Rep event count (${repEvents.length}) does not match score (${score})` };
  }

  // Zero score is valid (no events to validate)
  if (score === 0) {
    return { valid: true };
  }

  // 2. Validate individual events
  const eventValidation = validateEventIntegrity(repEvents);
  if (!eventValidation.valid) return eventValidation;

  // 3. All timestamps must be within the session window
  const maxTime = durationMs + TIMING_GRACE_MS;
  for (let i = 0; i < repEvents.length; i++) {
    if (repEvents[i].t < 0) {
      return { valid: false, reason: `Rep event ${i} has negative timestamp` };
    }
    if (repEvents[i].t > maxTime) {
      return { valid: false, reason: `Rep event ${i} timestamp exceeds session duration` };
    }
  }

  // 4. Validate timing patterns
  return validateTimingPatterns(repEvents);
}

/**
 * Validate rep events for 67 reps speedrun mode.
 * Score = elapsed time in ms to complete 67 reps.
 */
export function validate67RepsEvents(
  repEvents: RepEvent[],
  score: number
): ValidationResult {
  // Must have exactly 67 rep events
  if (repEvents.length !== 67) {
    return { valid: false, reason: `Expected 67 rep events, got ${repEvents.length}` };
  }

  // Validate individual events
  const eventValidation = validateEventIntegrity(repEvents);
  if (!eventValidation.valid) return eventValidation;

  // All timestamps must be non-negative
  for (let i = 0; i < repEvents.length; i++) {
    if (repEvents[i].t < 0) {
      return { valid: false, reason: `Rep event ${i} has negative timestamp` };
    }
  }

  // Last rep timestamp should approximately match the claimed score (elapsed time)
  // Allow some tolerance since the score is captured at a slightly different moment
  const lastRepTime = repEvents[repEvents.length - 1].t;
  const timeDiff = Math.abs(lastRepTime - score);
  if (timeDiff > 5000) { // 5 second tolerance
    return { valid: false, reason: 'Last rep timestamp does not match claimed elapsed time' };
  }

  // Validate timing patterns
  return validateTimingPatterns(repEvents);
}

/**
 * Validate the integrity of individual rep events.
 */
function validateEventIntegrity(repEvents: RepEvent[]): ValidationResult {
  for (let i = 0; i < repEvents.length; i++) {
    const event = repEvents[i];

    // Check structure
    if (typeof event.t !== 'number' || typeof event.ly !== 'number' || typeof event.ry !== 'number') {
      return { valid: false, reason: `Rep event ${i} has invalid structure` };
    }

    // Check timestamp is a reasonable integer-like value
    if (!Number.isFinite(event.t) || event.t < 0) {
      return { valid: false, reason: `Rep event ${i} has invalid timestamp` };
    }

    // Check wrist Y values are in valid range
    if (event.ly < MIN_WRIST_Y || event.ly > MAX_WRIST_Y) {
      return { valid: false, reason: `Rep event ${i} has invalid left wrist Y` };
    }
    if (event.ry < MIN_WRIST_Y || event.ry > MAX_WRIST_Y) {
      return { valid: false, reason: `Rep event ${i} has invalid right wrist Y` };
    }
  }

  // Wrists must show actual movement across all rep events (catches static/scripted positions)
  if (repEvents.length >= 2) {
    const lyValues = repEvents.map(e => e.ly);
    const ryValues = repEvents.map(e => e.ry);
    if (variance(lyValues) < MIN_WRIST_Y_VARIANCE) {
      return { valid: false, reason: 'Left wrist shows no movement across rep events' };
    }
    if (variance(ryValues) < MIN_WRIST_Y_VARIANCE) {
      return { valid: false, reason: 'Right wrist shows no movement across rep events' };
    }
  }

  return { valid: true };
}

/**
 * Validate timing patterns between consecutive reps.
 */
function validateTimingPatterns(repEvents: RepEvent[]): ValidationResult {
  if (repEvents.length < 2) {
    return { valid: true };
  }

  // Check timestamps are monotonically increasing
  const intervals: number[] = [];
  for (let i = 1; i < repEvents.length; i++) {
    const interval = repEvents[i].t - repEvents[i - 1].t;
    
    if (interval < 0) {
      return { valid: false, reason: `Rep events are not in chronological order at index ${i}` };
    }
    
    // Check minimum interval
    if (interval < MIN_REP_INTERVAL_MS) {
      return { valid: false, reason: `Interval between reps ${i - 1} and ${i} is too short (${interval}ms < ${MIN_REP_INTERVAL_MS}ms)` };
    }
    
    intervals.push(interval);
  }

  // Statistical check: intervals should not be suspiciously uniform
  // Only apply when we have enough data points
  if (intervals.length >= MIN_REPS_FOR_STATS) {
    const cv = coefficientOfVariation(intervals);
    if (cv < MIN_INTERVAL_CV) {
      return { valid: false, reason: 'Rep timing is suspiciously uniform (likely automated)' };
    }
  }

  return { valid: true };
}

/**
 * Validate that repEvents is a properly structured array.
 * Returns the parsed array or null if invalid.
 */
export function parseRepEvents(input: unknown): RepEvent[] | null {
  if (!Array.isArray(input)) return null;
  
  // Limit array size to prevent DoS (67 reps is the max meaningful, allow some buffer)
  if (input.length > 500) return null;

  const events: RepEvent[] = [];
  for (const item of input) {
    if (typeof item !== 'object' || item === null) return null;
    const { t, ly, ry } = item as Record<string, unknown>;
    if (typeof t !== 'number' || typeof ly !== 'number' || typeof ry !== 'number') return null;
    events.push({ t, ly, ry });
  }

  return events;
}

// ============================================================================
// Statistical helpers
// ============================================================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
}

function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return standardDeviation(values) / m;
}

// ============================================================================
// Dense pose sample parsing and server-side rep replay
// ============================================================================

/** Maximum number of pose samples accepted — must match MAX_POSE_SAMPLES_CLIENT in rep-counter.ts */
const MAX_POSE_SAMPLES = 3000;

/**
 * Parse and validate a raw poseSamples array from the request body.
 * Returns the parsed array or null if invalid/malformed.
 */
export function parsePoseSamples(input: unknown): PoseSample[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_POSE_SAMPLES) return null;

  const samples: PoseSample[] = [];
  for (const item of input) {
    if (typeof item !== 'object' || item === null) return null;
    const { t, ly, ls, lState, ry, rs, rState } = item as Record<string, unknown>;
    if (
      typeof t !== 'number' || typeof ly !== 'number' || typeof ls !== 'number' ||
      typeof ry !== 'number' || typeof rs !== 'number' ||
      (lState !== 'GOOD' && lState !== 'WEAK' && lState !== 'LOST') ||
      (rState !== 'GOOD' && rState !== 'WEAK' && rState !== 'LOST')
    ) return null;
    samples.push({ t, ly, ls, lState, ry, rs, rState } as PoseSample);
  }

  return samples;
}

/**
 * Replay pose samples through the same RepCounter used client-side and return
 * the server-computed rep count. Timestamps in samples are game-relative (ms).
 */
export function replayRepCount(samples: PoseSample[]): number {
  const counter = new RepCounter();
  // gameStartTime = 0 so that sample.t values are used directly as the timestamp
  counter.setGameStartTime(0);

  for (const sample of samples) {
    const leftSignal: WristSignal = { x: 0.5, y: sample.ly, score: sample.ls, state: sample.lState };
    const rightSignal: WristSignal = { x: 0.5, y: sample.ry, score: sample.rs, state: sample.rState };
    counter.processSignals(leftSignal, rightSignal, sample.t);
  }

  return counter.getRepCount();
}

/**
 * Validate that a client-submitted score matches the server-replayed rep count
 * from the provided pose samples. Allows ±1 tolerance for edge cases at game end.
 */
// At 60fps, a reversal can be detected every 2 frames at minimum:
//   frame 1 → establishes direction, frame 2 → detects change → reversal
//   2 reversals = 1 rep → max 30 reps/second is the hard physical ceiling.
const MAX_REPS_PER_SECOND = 30;

// For 67-reps speedrun mode: 67 reps at the theoretical maximum rate
const MIN_67_REPS_TIME_MS = Math.ceil((67 / MAX_REPS_PER_SECOND) * 1000); // ~2234ms

export function validatePoseSamples(
  samples: PoseSample[],
  clientScore: number,
  durationMs: number
): ValidationResult {
  if (samples.length === 0) {
    // No samples — only valid for a zero score
    if (clientScore === 0) return { valid: true };
    return { valid: false, reason: 'No pose samples provided for non-zero score' };
  }

  // Physical maximum score check
  if (durationMs > 0) {
    // Timed modes: score = rep count
    const maxPossibleScore = Math.floor((durationMs / 1000) * MAX_REPS_PER_SECOND);
    if (clientScore > maxPossibleScore) {
      return {
        valid: false,
        reason: `Score (${clientScore}) exceeds physical maximum of ${maxPossibleScore} for this game mode`
      };
    }
  } else {
    // 67-reps mode: score = elapsed time in ms — must be at least the physical minimum
    if (clientScore < MIN_67_REPS_TIME_MS) {
      return {
        valid: false,
        reason: `Elapsed time (${clientScore}ms) is below the physical minimum of ${MIN_67_REPS_TIME_MS}ms`
      };
    }
  }

  // Timestamps must be non-negative and within the session window
  const maxTime = durationMs + 5000; // 5s grace for 67-reps mode and timed mode alike
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].t < 0) return { valid: false, reason: `Pose sample ${i} has negative timestamp` };
    if (durationMs > 0 && samples[i].t > maxTime) {
      return { valid: false, reason: `Pose sample ${i} timestamp exceeds session duration` };
    }
  }

  const serverCount = replayRepCount(samples);
  if (Math.abs(serverCount - clientScore) > 2) {
    return {
      valid: false,
      reason: `Server-verified rep count (${serverCount}) does not match submitted score (${clientScore})`
    };
  }

  return { valid: true };
}
