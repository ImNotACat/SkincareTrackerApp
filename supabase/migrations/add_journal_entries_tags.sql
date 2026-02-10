-- Add tags as a separate column for journal entries (replacing tags stored in text).
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
