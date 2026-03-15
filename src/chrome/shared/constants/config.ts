/**
 * Extension Configuration
 */

export const CONFIG = {
  // Extension info
  NAME: 'Kalaama',
  VERSION: '1.0.0',

  // API URLs
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

  // Translation APIs
  MYMEMORY_API_URL: 'https://api.mymemory.translated.net/get',
  LIBRETRANSLATE_API_URL: 'https://libretranslate.com/translate',
  GOOGLE_TRANSLATE_URL: 'https://translate.googleapis.com/translate_a/single',

  // MyMemory email for higher limits (10000 words/day vs 1000)
  MYMEMORY_EMAIL: 'kalaama@example.com',

  // YouTube
  YOUTUBE_WATCH_URL: 'https://www.youtube.com/watch',
  YOUTUBE_TIMEDTEXT_URL: 'https://www.youtube.com/api/timedtext',

  // Cache settings
  VOCABULARY_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  TRANSLATION_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours

  // UI settings
  MIN_SUBTITLE_FONT_SIZE: 12,
  MAX_SUBTITLE_FONT_SIZE: 32,
  DEFAULT_SUBTITLE_FONT_SIZE: 18,

  // Mastery levels
  MASTERY_LEVELS: {
    NEW: 0,
    LEARNING: 1,
    FAMILIAR: 2,
    PRACTICED: 3,
    CONFIDENT: 4,
    MASTERED: 5,
  } as const,

  // Review intervals for spaced repetition (in hours)
  REVIEW_INTERVALS: [4, 8, 24, 72, 168, 336, 720] as const, // 4h, 8h, 1d, 3d, 1w, 2w, 1m
} as const;

export type MasteryLevel = (typeof CONFIG.MASTERY_LEVELS)[keyof typeof CONFIG.MASTERY_LEVELS];
