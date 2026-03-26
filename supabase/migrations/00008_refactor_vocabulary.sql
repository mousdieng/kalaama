-- Migration 00008: Refactor Vocabulary Table for Dictionary Integration
--
-- This migration adds dictionary integration to the vocabulary table:
-- - Adds dictionary_id foreign key
-- - Adds notes and custom_examples for user personalization
-- - Keeps legacy columns for backward compatibility (30-day grace period)
-- - Creates indexes for performance
-- - Adds unique constraint to prevent duplicate dictionary entries per user

-- Step 1: Add new columns to vocabulary table
ALTER TABLE public.vocabulary
    ADD COLUMN IF NOT EXISTS dictionary_id UUID REFERENCES public.german_french_dictionary(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS custom_examples TEXT[];

-- Step 2: Create unique index to prevent duplicate dictionary entries per user
-- This ensures one user can only have one vocabulary entry per dictionary word
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_user_dictionary
    ON public.vocabulary(user_id, dictionary_id)
    WHERE dictionary_id IS NOT NULL;

-- Step 3: Create index on dictionary_id for join performance
CREATE INDEX IF NOT EXISTS idx_vocabulary_dictionary_id
    ON public.vocabulary(dictionary_id);

-- Step 4: Create helper function to get vocabulary with dictionary data joined
-- This function makes it easy to query vocabulary with full dictionary information
CREATE OR REPLACE FUNCTION public.get_vocabulary_with_dictionary(
    p_user_id UUID,
    p_language TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    dictionary_id UUID,

    -- Dictionary fields (joined)
    word TEXT,
    article TEXT,
    gender TEXT,
    part_of_speech TEXT,
    difficulty_level TEXT,
    french_translation TEXT,
    french_definition TEXT,
    french_explanation TEXT,
    pronunciation_ipa TEXT,
    examples JSONB,
    synonyms TEXT[],
    antonyms TEXT[],
    collocations JSONB,
    plural_form TEXT,
    conjugation_hint TEXT,

    -- User-specific fields
    language TEXT,
    context_sentence TEXT,
    video_id TEXT,
    video_title TEXT,
    notes TEXT,
    custom_examples TEXT[],

    -- Learning progress
    mastery_level INT,
    review_count INT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_reviewed_at TIMESTAMPTZ,
    next_review_date TIMESTAMPTZ,
    ease_factor NUMERIC,
    interval INT,
    repetitions INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.id,
        v.user_id,
        v.dictionary_id,

        -- Dictionary fields (from joined table or legacy fields)
        COALESCE(d.word, v.word) as word,
        d.article,
        d.gender,
        COALESCE(d.part_of_speech, v.part_of_speech) as part_of_speech,
        d.difficulty_level,
        COALESCE(d.french_translation, v.translation) as french_translation,
        COALESCE(d.french_definition, v.definition) as french_definition,
        d.french_explanation,
        COALESCE(d.pronunciation_ipa, v.pronunciation) as pronunciation_ipa,
        d.examples,
        d.synonyms,
        d.antonyms,
        d.collocations,
        d.plural_form,
        d.conjugation_hint,

        -- User-specific fields
        v.language,
        v.context_sentence,
        v.video_id,
        v.video_title,
        v.notes,
        v.custom_examples,

        -- Learning progress
        v.mastery_level,
        v.review_count,
        v.created_at,
        v.updated_at,
        v.last_reviewed_at,
        v.next_review_date,
        v.ease_factor,
        v.interval,
        v.repetitions
    FROM public.vocabulary v
    LEFT JOIN public.german_french_dictionary d ON v.dictionary_id = d.id
    WHERE v.user_id = p_user_id
        AND (p_language IS NULL OR v.language = p_language)
    ORDER BY v.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.get_vocabulary_with_dictionary(UUID, TEXT, INT) TO authenticated;

-- Step 6: Add comment explaining the migration
COMMENT ON COLUMN public.vocabulary.dictionary_id IS 'Foreign key to german_french_dictionary. When set, word data comes from dictionary instead of legacy fields.';
COMMENT ON COLUMN public.vocabulary.notes IS 'User''s personal notes about this word';
COMMENT ON COLUMN public.vocabulary.custom_examples IS 'User''s personal example sentences';

-- Step 7: Migration verification
DO $$
BEGIN
    -- Verify new columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vocabulary'
        AND column_name = 'dictionary_id'
    ) THEN
        RAISE EXCEPTION 'Migration failed: dictionary_id column not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vocabulary'
        AND column_name = 'notes'
    ) THEN
        RAISE EXCEPTION 'Migration failed: notes column not created';
    END IF;

    RAISE NOTICE 'Migration 00008 completed successfully';
END $$;
