-- Add flagged column to scores table for statistical outlier auto-hiding
-- Flagged scores remain in the DB for review but are excluded from leaderboard display

ALTER TABLE scores ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;

-- Optimized index for leaderboard queries that filter out flagged scores
CREATE INDEX IF NOT EXISTS idx_scores_not_flagged
  ON scores (duration_ms, flagged, score DESC, created_at ASC);
