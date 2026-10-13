-- Soft delete for chat messages: the row stays, and the app shows "Message deleted".
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
