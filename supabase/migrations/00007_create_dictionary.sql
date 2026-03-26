/**
 * Migration 00007: Create German-French Dictionary System
 *
 * Creates:
 * 1. german_french_dictionary table (shared dictionary for all users)
 * 2. missing_words table (track words not in dictionary)
 * 3. Add is_admin flag to users table
 */

-- ============================================
-- 1. Create german_french_dictionary table
-- ============================================

CREATE TABLE IF NOT EXISTS public.german_french_dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core word information
    word TEXT NOT NULL UNIQUE,
    article TEXT CHECK (article IN ('der', 'die', 'das', NULL)),
    gender TEXT CHECK (gender IN ('m', 'f', 'n', NULL)),
    part_of_speech TEXT NOT NULL CHECK (part_of_speech IN (
        'noun', 'verb', 'adjective', 'adverb', 'preposition',
        'conjunction', 'pronoun', 'article', 'interjection'
    )),
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN
        ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),

    -- Translations and definitions
    french_translation TEXT NOT NULL,
    french_definition TEXT NOT NULL,          -- Formal/academic definition in French
    french_explanation TEXT,                   -- Tips for French speakers (common mistakes)
    pronunciation_ipa TEXT,

    -- Usage and context
    context_usage TEXT,

    -- Examples (12 progressive examples, A1→B2)
    -- JSONB format: [{"german": "text", "french": "text", "level": "A1"}, ...]
    examples JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Vocabulary relationships
    synonyms TEXT[] DEFAULT '{}',              -- German synonyms
    antonyms TEXT[] DEFAULT '{}',              -- German antonyms
    -- Collocations format: [{"phrase": "nach Hause gehen", "french": "rentrer à la maison"}, ...]
    collocations JSONB DEFAULT '[]'::jsonb,

    -- Part-of-speech specific fields
    plural_form TEXT,                          -- For nouns (e.g., "Häuser")
    conjugation_hint TEXT,                     -- For verbs (e.g., "ich lerne, du lernst, er lernt")

    -- Metadata
    frequency_rank INTEGER,                    -- Word frequency (1=most common)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_dictionary_word ON public.german_french_dictionary(word);
CREATE INDEX idx_dictionary_word_lower ON public.german_french_dictionary(LOWER(word));
CREATE INDEX idx_dictionary_difficulty ON public.german_french_dictionary(difficulty_level);
CREATE INDEX idx_dictionary_pos ON public.german_french_dictionary(part_of_speech);
CREATE INDEX idx_dictionary_frequency ON public.german_french_dictionary(frequency_rank);

-- Enable pg_trgm extension for fuzzy search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search index (trigram for fuzzy matching)
CREATE INDEX idx_dictionary_word_trgm ON public.german_french_dictionary
    USING gin(word gin_trgm_ops);

-- Enable RLS
ALTER TABLE public.german_french_dictionary ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read dictionary (read-only for users)
CREATE POLICY "Allow read access to dictionary"
    ON public.german_french_dictionary
    FOR SELECT
    USING (true);

-- Only admin users can insert/update dictionary entries
-- (We'll add admin check after adding is_admin flag to users)

-- Add comment
COMMENT ON TABLE public.german_french_dictionary IS
    'Shared German-French dictionary for all users. Contains 10,000 words with definitions, examples, synonyms, and collocations.';

-- ============================================
-- 2. Add is_admin flag to users table
-- ============================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_admin ON public.users(is_admin) WHERE is_admin = true;

-- Now add admin policy for dictionary
CREATE POLICY "Only admins can modify dictionary"
    ON public.german_french_dictionary
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================
-- 3. Create missing_words table
-- ============================================

CREATE TABLE IF NOT EXISTS public.missing_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    video_id TEXT,
    video_title TEXT,
    context_sentence TEXT,
    language TEXT NOT NULL DEFAULT 'de',
    click_count INTEGER DEFAULT 1,
    first_clicked_at TIMESTAMPTZ DEFAULT NOW(),
    last_clicked_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'added', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_missing_words_word ON public.missing_words(word);
CREATE INDEX idx_missing_words_word_lower ON public.missing_words(LOWER(word));
CREATE INDEX idx_missing_words_status ON public.missing_words(status);
CREATE INDEX idx_missing_words_user ON public.missing_words(user_id);
CREATE INDEX idx_missing_words_clicks ON public.missing_words(click_count DESC);
CREATE INDEX idx_missing_words_language ON public.missing_words(language);

-- Composite index for aggregation queries
CREATE INDEX idx_missing_words_aggregation ON public.missing_words(LOWER(word), status, language);

-- Enable RLS
ALTER TABLE public.missing_words ENABLE ROW LEVEL SECURITY;

-- Users can view their own missing words
CREATE POLICY "Users can view own missing words"
    ON public.missing_words
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own missing words
CREATE POLICY "Users can insert own missing words"
    ON public.missing_words
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own missing words (for click_count)
CREATE POLICY "Users can update own missing words"
    ON public.missing_words
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can view all missing words
CREATE POLICY "Admins can view all missing words"
    ON public.missing_words
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admins can update status of missing words
CREATE POLICY "Admins can update status"
    ON public.missing_words
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Add comment
COMMENT ON TABLE public.missing_words IS
    'Tracks words clicked by users that are not in the dictionary. Used to prioritize which words to add.';

-- ============================================
-- 4. Helper Functions
-- ============================================

-- Function to get aggregated missing words (most requested)
CREATE OR REPLACE FUNCTION get_aggregated_missing_words(
    limit_count INTEGER DEFAULT 100,
    filter_language TEXT DEFAULT 'de',
    filter_status TEXT DEFAULT 'pending'
)
RETURNS TABLE (
    word TEXT,
    total_clicks BIGINT,
    unique_users BIGINT,
    sample_context TEXT,
    sample_video_title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LOWER(mw.word) as word,
        SUM(mw.click_count)::BIGINT as total_clicks,
        COUNT(DISTINCT mw.user_id)::BIGINT as unique_users,
        (ARRAY_AGG(mw.context_sentence ORDER BY mw.click_count DESC))[1] as sample_context,
        (ARRAY_AGG(mw.video_title ORDER BY mw.click_count DESC))[1] as sample_video_title
    FROM public.missing_words mw
    WHERE
        mw.language = filter_language
        AND mw.status = filter_status
    GROUP BY LOWER(mw.word)
    ORDER BY total_clicks DESC, unique_users DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert missing word (increment click_count if exists)
CREATE OR REPLACE FUNCTION upsert_missing_word(
    p_word TEXT,
    p_user_id UUID,
    p_video_id TEXT DEFAULT NULL,
    p_video_title TEXT DEFAULT NULL,
    p_context_sentence TEXT DEFAULT NULL,
    p_language TEXT DEFAULT 'de'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Try to find existing missing word entry for this user and word
    SELECT id INTO v_id
    FROM public.missing_words
    WHERE LOWER(word) = LOWER(p_word)
        AND user_id = p_user_id
        AND language = p_language
        AND status = 'pending';

    IF v_id IS NOT NULL THEN
        -- Update existing entry
        UPDATE public.missing_words
        SET
            click_count = click_count + 1,
            last_clicked_at = NOW(),
            video_id = COALESCE(p_video_id, video_id),
            video_title = COALESCE(p_video_title, video_title),
            context_sentence = COALESCE(p_context_sentence, context_sentence)
        WHERE id = v_id;
    ELSE
        -- Insert new entry
        INSERT INTO public.missing_words (
            word, user_id, video_id, video_title, context_sentence, language
        ) VALUES (
            p_word, p_user_id, p_video_id, p_video_title, p_context_sentence, p_language
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_aggregated_missing_words(INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_missing_word(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================
-- 5. Sample Data (Optional - for testing)
-- ============================================

-- Uncomment to insert sample dictionary entries for testing
/*
INSERT INTO public.german_french_dictionary (
    word, article, gender, part_of_speech, difficulty_level,
    french_translation, french_definition, french_explanation,
    pronunciation_ipa, context_usage, examples, synonyms, antonyms, collocations,
    plural_form, frequency_rank
) VALUES
(
    'Haus', 'das', 'n', 'noun', 'A1',
    'maison',
    'Bâtiment d''habitation où les gens vivent.',
    'Attention: "das Haus", pas "der Haus". Le genre est différent du français (la maison).',
    '/haʊs/',
    'Utilisé pour parler de résidences, propriétés, ou lieux d''habitation',
    '[
        {"german": "Das Haus ist groß.", "french": "La maison est grande.", "level": "A1"},
        {"german": "Ich wohne in einem großen Haus.", "french": "J''habite dans une grande maison.", "level": "A1"}
    ]'::jsonb,
    ARRAY['Gebäude', 'Wohnung'],
    ARRAY[]::TEXT[],
    '[
        {"phrase": "nach Hause gehen", "french": "rentrer à la maison"},
        {"phrase": "zu Hause bleiben", "french": "rester à la maison"}
    ]'::jsonb,
    'Häuser',
    1
);
*/
