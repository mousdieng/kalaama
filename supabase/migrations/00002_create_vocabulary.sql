-- Vocabulary table for storing learned words
CREATE TABLE IF NOT EXISTS public.vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    language TEXT NOT NULL,                    -- ISO 639-1 code (e.g., 'es', 'fr')
    context_sentence TEXT,                     -- Original sentence from video
    video_id TEXT,                             -- YouTube video ID
    video_title TEXT,
    pronunciation TEXT,                        -- Phonetic pronunciation
    part_of_speech TEXT,                       -- noun, verb, adjective, etc.
    notes TEXT,                                -- User notes
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5),
    review_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate words per user per language
    UNIQUE(user_id, word, language)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vocabulary_user_id ON public.vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_language ON public.vocabulary(language);
CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery ON public.vocabulary(user_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_vocabulary_created ON public.vocabulary(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON public.vocabulary(user_id, word);

-- Enable RLS
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own vocabulary" ON public.vocabulary
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vocabulary" ON public.vocabulary
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vocabulary" ON public.vocabulary
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocabulary" ON public.vocabulary
    FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for vocabulary sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.vocabulary;
