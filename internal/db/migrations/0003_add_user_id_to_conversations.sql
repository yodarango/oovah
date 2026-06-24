-- Add user_id to conversations so each user's history is isolated
ALTER TABLE conversations ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
