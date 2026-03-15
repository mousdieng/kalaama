-- Video watch history
CREATE TABLE IF NOT EXISTS public.video_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,                    -- YouTube video ID
    video_title TEXT,
    video_thumbnail TEXT,
    video_language TEXT,                       -- Detected/selected language
    words_saved INTEGER DEFAULT 0,
    watch_duration_seconds INTEGER DEFAULT 0,
    watched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_history_user ON public.video_history(user_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_history_video ON public.video_history(user_id, video_id);

-- Enable RLS
ALTER TABLE public.video_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage own history" ON public.video_history
    FOR ALL USING (auth.uid() = user_id);

-- Function to get or create video history entry
CREATE OR REPLACE FUNCTION public.upsert_video_history(
    p_user_id UUID,
    p_video_id TEXT,
    p_video_title TEXT DEFAULT NULL,
    p_video_thumbnail TEXT DEFAULT NULL,
    p_video_language TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
BEGIN
    -- Check if entry exists for today
    SELECT id INTO v_history_id
    FROM public.video_history
    WHERE user_id = p_user_id
    AND video_id = p_video_id
    AND DATE(watched_at) = CURRENT_DATE
    LIMIT 1;

    IF v_history_id IS NULL THEN
        -- Create new entry
        INSERT INTO public.video_history (user_id, video_id, video_title, video_thumbnail, video_language)
        VALUES (p_user_id, p_video_id, p_video_title, p_video_thumbnail, p_video_language)
        RETURNING id INTO v_history_id;
    ELSE
        -- Update existing entry
        UPDATE public.video_history
        SET
            video_title = COALESCE(p_video_title, video_title),
            video_thumbnail = COALESCE(p_video_thumbnail, video_thumbnail),
            watched_at = NOW()
        WHERE id = v_history_id;
    END IF;

    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
