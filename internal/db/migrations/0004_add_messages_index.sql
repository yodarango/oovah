-- Speed up conversation list/search: the per-conversation lookups
-- (first user/assistant message previews and message counts) become index
-- seeks instead of repeatedly scanning the messages table.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_role ON messages(conversation_id, role, created_at, id);
