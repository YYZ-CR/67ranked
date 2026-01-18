-- 67Ranked Database Schema
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. SCORES TABLE (Global Leaderboard)
-- ============================================
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    score INT NOT NULL CHECK (score >= 0),
    duration_ms INT NOT NULL CHECK (duration_ms IN (6700, 20000)),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for leaderboard queries (descending score, ascending time for ties)
CREATE INDEX IF NOT EXISTS idx_scores_leaderboard 
ON scores (duration_ms, score DESC, created_at ASC);

-- ============================================
-- 2. DUELS TABLE (Real-time Duels)
-- ============================================
CREATE TABLE IF NOT EXISTS duels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duration_ms INT NOT NULL CHECK (duration_ms >= 5000 AND duration_ms <= 120000),
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'complete', 'expired')),
    start_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for finding active duels
CREATE INDEX IF NOT EXISTS idx_duels_status ON duels (status);
CREATE INDEX IF NOT EXISTS idx_duels_expires ON duels (expires_at);

-- ============================================
-- 3. DUEL_PLAYERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS duel_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
    player_key TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    ready BOOLEAN DEFAULT FALSE NOT NULL,
    score INT,
    submitted_at TIMESTAMPTZ
);

-- Index for duel lookups
CREATE INDEX IF NOT EXISTS idx_duel_players_duel ON duel_players (duel_id);

-- ============================================
-- 4. CHALLENGES TABLE (Async Challenges)
-- ============================================
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duration_ms INT NOT NULL CHECK (duration_ms >= 5000 AND duration_ms <= 120000),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for finding challenges
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges (status);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges (expires_at);

-- ============================================
-- 5. CHALLENGE_ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS challenge_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    player_key TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    score INT NOT NULL CHECK (score >= 0),
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for challenge lookups
CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge ON challenge_entries (challenge_id);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_entries ENABLE ROW LEVEL SECURITY;

-- Scores: Anyone can read, only service role can insert
CREATE POLICY "scores_read_all" ON scores FOR SELECT USING (true);
CREATE POLICY "scores_insert_service" ON scores FOR INSERT WITH CHECK (true);

-- Duels: Anyone can read, only service role can modify
CREATE POLICY "duels_read_all" ON duels FOR SELECT USING (true);
CREATE POLICY "duels_insert_service" ON duels FOR INSERT WITH CHECK (true);
CREATE POLICY "duels_update_service" ON duels FOR UPDATE USING (true);

-- Duel Players: Anyone can read, only service role can modify
CREATE POLICY "duel_players_read_all" ON duel_players FOR SELECT USING (true);
CREATE POLICY "duel_players_insert_service" ON duel_players FOR INSERT WITH CHECK (true);
CREATE POLICY "duel_players_update_service" ON duel_players FOR UPDATE USING (true);

-- Challenges: Anyone can read, only service role can modify
CREATE POLICY "challenges_read_all" ON challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert_service" ON challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "challenges_update_service" ON challenges FOR UPDATE USING (true);

-- Challenge Entries: Anyone can read, only service role can modify
CREATE POLICY "challenge_entries_read_all" ON challenge_entries FOR SELECT USING (true);
CREATE POLICY "challenge_entries_insert_service" ON challenge_entries FOR INSERT WITH CHECK (true);

-- ============================================
-- 7. REALTIME CONFIGURATION
-- ============================================

-- Enable realtime for duel-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE duels;
ALTER PUBLICATION supabase_realtime ADD TABLE duel_players;

-- ============================================
-- 8. CLEANUP FUNCTION (Optional Cron Job)
-- ============================================

-- Function to expire old duels and challenges
CREATE OR REPLACE FUNCTION cleanup_expired_games()
RETURNS void AS $$
BEGIN
    -- Expire waiting duels
    UPDATE duels 
    SET status = 'expired' 
    WHERE status = 'waiting' AND expires_at < NOW();
    
    -- Expire pending challenges
    UPDATE challenges 
    SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- You can set up a cron job in Supabase to run this periodically
-- SELECT cron.schedule('cleanup-expired', '*/15 * * * *', 'SELECT cleanup_expired_games()');
