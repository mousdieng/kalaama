-- Learning progress tracking
CREATE TABLE IF NOT EXISTS public.learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    language TEXT NOT NULL,                    -- ISO 639-1 code
    words_learned INTEGER DEFAULT 0,
    words_mastered INTEGER DEFAULT 0,          -- mastery_level = 5
    total_study_time_minutes INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,          -- Days
    longest_streak INTEGER DEFAULT 0,
    last_study_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, language)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON public.learning_progress(user_id);

-- Enable RLS
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage own progress" ON public.learning_progress
    FOR ALL USING (auth.uid() = user_id);

-- Function to update learning progress when vocabulary changes
CREATE OR REPLACE FUNCTION public.update_learning_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_words_learned INTEGER;
    v_words_mastered INTEGER;
BEGIN
    -- Count words for this user and language
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE mastery_level >= 5)
    INTO v_words_learned, v_words_mastered
    FROM public.vocabulary
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND language = COALESCE(NEW.language, OLD.language);

    -- Update or insert progress
    INSERT INTO public.learning_progress (user_id, language, words_learned, words_mastered, last_study_date, updated_at)
    VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        COALESCE(NEW.language, OLD.language),
        v_words_learned,
        v_words_mastered,
        CURRENT_DATE,
        NOW()
    )
    ON CONFLICT (user_id, language)
    DO UPDATE SET
        words_learned = v_words_learned,
        words_mastered = v_words_mastered,
        last_study_date = CURRENT_DATE,
        updated_at = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for vocabulary changes
DROP TRIGGER IF EXISTS on_vocabulary_change ON public.vocabulary;
CREATE TRIGGER on_vocabulary_change
    AFTER INSERT OR UPDATE OR DELETE ON public.vocabulary
    FOR EACH ROW EXECUTE FUNCTION public.update_learning_progress();
