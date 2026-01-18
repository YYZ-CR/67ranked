export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      scores: {
        Row: {
          id: string;
          username: string;
          score: number;
          duration_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          score: number;
          duration_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          score?: number;
          duration_ms?: number;
          created_at?: string;
        };
      };
      duels: {
        Row: {
          id: string;
          duration_ms: number;
          status: 'waiting' | 'active' | 'complete' | 'expired';
          start_at: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          duration_ms: number;
          status?: 'waiting' | 'active' | 'complete' | 'expired';
          start_at?: string | null;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          duration_ms?: number;
          status?: 'waiting' | 'active' | 'complete' | 'expired';
          start_at?: string | null;
          created_at?: string;
          expires_at?: string;
        };
      };
      duel_players: {
        Row: {
          id: string;
          duel_id: string;
          player_key: string;
          username: string;
          ready: boolean;
          score: number | null;
          submitted_at: string | null;
        };
        Insert: {
          id?: string;
          duel_id: string;
          player_key: string;
          username: string;
          ready?: boolean;
          score?: number | null;
          submitted_at?: string | null;
        };
        Update: {
          id?: string;
          duel_id?: string;
          player_key?: string;
          username?: string;
          ready?: boolean;
          score?: number | null;
          submitted_at?: string | null;
        };
      };
      challenges: {
        Row: {
          id: string;
          duration_ms: number;
          status: 'pending' | 'complete' | 'expired';
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          duration_ms: number;
          status?: 'pending' | 'complete' | 'expired';
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          duration_ms?: number;
          status?: 'pending' | 'complete' | 'expired';
          created_at?: string;
          expires_at?: string;
        };
      };
      challenge_entries: {
        Row: {
          id: string;
          challenge_id: string;
          player_key: string;
          username: string;
          score: number;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          player_key: string;
          username: string;
          score: number;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          player_key?: string;
          username?: string;
          score?: number;
          submitted_at?: string;
        };
      };
    };
  };
}

export type Score = Database['public']['Tables']['scores']['Row'];
export type Duel = Database['public']['Tables']['duels']['Row'];
export type DuelPlayer = Database['public']['Tables']['duel_players']['Row'];
export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type ChallengeEntry = Database['public']['Tables']['challenge_entries']['Row'];
