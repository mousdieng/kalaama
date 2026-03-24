-- Add SM-2 Spaced Repetition Fields to Vocabulary Table
-- This migration adds fields for the SM-2 algorithm used in vocabulary review

-- Add spaced repetition columns
ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(3,2) DEFAULT 2.50,
  ADD COLUMN IF NOT EXISTS interval INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0;

-- Add index for efficient review queue queries (finding due words)
CREATE INDEX IF NOT EXISTS idx_vocabulary_next_review
  ON public.vocabulary(user_id, next_review_date)
  WHERE next_review_date IS NOT NULL;

-- Add index for filtering overdue words
CREATE INDEX IF NOT EXISTS idx_vocabulary_due
  ON public.vocabulary(user_id, language, next_review_date)
  WHERE next_review_date <= NOW();

-- Update existing words to be due for review immediately
UPDATE public.vocabulary
SET
  next_review_date = NOW(),
  ease_factor = 2.5,
  interval = 1,
  repetitions = 0
WHERE next_review_date IS NULL;

-- Create review sessions table for tracking review statistics
CREATE TABLE IF NOT EXISTS public.review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  words_reviewed INTEGER NOT NULL CHECK (words_reviewed > 0),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  session_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for review sessions table
CREATE INDEX IF NOT EXISTS idx_review_sessions_user
  ON public.review_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_sessions_language
  ON public.review_sessions(user_id, language, created_at DESC);

-- Enable RLS for review_sessions
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_sessions
CREATE POLICY "Users can view own review sessions" ON public.review_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review sessions" ON public.review_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for review sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_sessions;
