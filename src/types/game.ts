// Game modes
export type GameMode = 'normal' | 'duel' | 'challenge';

// Game states
export type GameState = 
  | 'idle'           // Initial state, showing start button
  | 'calibrating'    // Detecting both hands
  | 'selecting'      // Mode/time selection
  | 'countdown'      // 3-2-1 countdown
  | 'playing'        // Active gameplay
  | 'ended'          // Game finished, showing results
  | 'submitting';    // Submitting score

// Duration options (in milliseconds)
export const DURATION_6_7S = 6700;
export const DURATION_20S = 20000;

export const STANDARD_DURATIONS = [DURATION_6_7S, DURATION_20S] as const;

// Validation constants
export const MIN_CUSTOM_DURATION = 5000;   // 5 seconds
export const MAX_CUSTOM_DURATION = 120000; // 120 seconds
export const CUSTOM_DURATION_STEP = 100;   // 0.1 second step

// Rep counter state machine states
export type RepState = 
  | 'WAITING'   // Haven't started tracking yet
  | 'TRACKING'; // Actively tracking hand movements

// Hand position (vertical)
export type HandPosition = 'high' | 'low' | 'neutral';

// Hand tracking result
export interface HandTrackingResult {
  leftY: number | null;
  rightY: number | null;
  bothHandsDetected: boolean;
}

// Leaderboard entry with rank
export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  rank: number;
  created_at: string;
}

// Duel state for UI
export interface DuelState {
  id: string;
  status: 'waiting' | 'active' | 'complete' | 'expired';
  duration_ms: number;
  start_at: number | null;
  players: {
    username: string;
    player_key: string;
    ready: boolean;
    score: number | null;
    isMe: boolean;
  }[];
}

// Challenge state for UI
export interface ChallengeState {
  id: string;
  status: 'pending' | 'complete' | 'expired';
  duration_ms: number;
  entries: {
    username: string;
    player_key: string;
    score: number;
    isMe: boolean;
  }[];
}

// Game result
export interface GameResult {
  myScore: number;
  opponentScore?: number;
  myUsername: string;
  opponentUsername?: string;
  outcome?: 'win' | 'lose' | 'tie';
}
