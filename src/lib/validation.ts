/**
 * Server-side validation for rep events.
 * 
 * Validates that submitted rep events are physically plausible,
 * making it significantly harder to submit fake scores via scripts.
 */

import { DURATION_67_REPS } from '@/types/game';

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
const MIN_INTERVAL_CV = 0.03;

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
