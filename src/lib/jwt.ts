import { SignJWT, jwtVerify } from 'jose';
import type { GameMode } from '@/types/game';
import { DURATION_67_REPS } from '@/types/game';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-min-32-chars-long!!!');

// Session token payload
export interface SessionPayload {
  mode: GameMode;
  duration_ms: number;
  issued_at: number;
  expires_at: number;
  // Scoped identifiers for duel/challenge
  duel_id?: string;
  challenge_id?: string;
  player_key?: string;
}

// Grace window for submission (30 seconds after round should end)
const GRACE_WINDOW_MS = 30000;
// For 67 reps mode, allow up to 10 minutes (should be plenty)
const MAX_67_REPS_DURATION_MS = 600000;

// Create a session token
export async function createSessionToken(payload: Omit<SessionPayload, 'issued_at' | 'expires_at'>): Promise<string> {
  const now = Date.now();
  
  // For 67 reps mode, use a longer expiry since we don't know how long it will take
  const is67RepsMode = payload.duration_ms === DURATION_67_REPS;
  const effectiveDuration = is67RepsMode ? MAX_67_REPS_DURATION_MS : payload.duration_ms;
  const expiresAt = now + effectiveDuration + GRACE_WINDOW_MS + 60000;
  
  const fullPayload: SessionPayload = {
    ...payload,
    issued_at: now,
    expires_at: expiresAt
  };

  const token = await new SignJWT(fullPayload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(JWT_SECRET);

  return token;
}

// Verify and decode a session token
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Validate submission timing
export function validateSubmissionTiming(
  payload: SessionPayload,
  submissionTime: number
): { valid: boolean; reason?: string } {
  const { issued_at, duration_ms, expires_at } = payload;
  
  // Must be after the round could have started (issued + small buffer)
  const minSubmitTime = issued_at + 1000; // At least 1 second after issue
  if (submissionTime < minSubmitTime) {
    return { valid: false, reason: 'Submission too early' };
  }
  
  // Must be within the grace window
  const maxSubmitTime = issued_at + duration_ms + GRACE_WINDOW_MS;
  if (submissionTime > maxSubmitTime) {
    return { valid: false, reason: 'Submission too late' };
  }
  
  // Check JWT expiry
  if (submissionTime > expires_at) {
    return { valid: false, reason: 'Token expired' };
  }
  
  return { valid: true };
}
