-- Anti-cheat: Add session tracking to prevent replay attacks and enable rep event auditing

-- Add session_id column to scores table (unique to enforce single-use tokens)
ALTER TABLE scores ADD COLUMN IF NOT EXISTS session_id UUID UNIQUE;

-- Add index for session_id lookups
CREATE INDEX IF NOT EXISTS idx_scores_session_id ON scores (session_id);

-- Note: Existing rows will have NULL session_id, which is fine.
-- The UNIQUE constraint allows multiple NULLs in PostgreSQL.
-- New submissions will be required to include a session_id.
