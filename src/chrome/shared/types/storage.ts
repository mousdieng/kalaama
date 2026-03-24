/**
 * Chrome Storage Types
 * Defines the structure of data stored in chrome.storage
 */

export interface StorageData {
  // Authentication
  supabase_session?: SupabaseSession;

  // User preferences (cached locally)
  user_settings?: UserSettings;

  // Extension state
  extension_enabled?: boolean;
  current_language?: string;

  // Cache
  vocabulary_cache?: VocabularyItem[];
  vocabulary_cache_timestamp?: number;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export interface UserSettings {
  target_language: string;
  native_language: string;
  subtitle_font_size: number;
  subtitle_position: 'top' | 'bottom';
  auto_pause_on_click: boolean;
  highlight_unknown_words: boolean;
  show_pronunciation: boolean;
  theme: 'light' | 'dark' | 'auto';
  // Review settings for spaced repetition
  review_daily_goal?: number;      // Default: 20 words per day
  review_modes?: ('flashcard' | 'typing')[]; // Default: ['flashcard', 'typing']
}

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  language: string;
  context_sentence?: string;
  video_id?: string;
  video_title?: string;
  pronunciation?: string;
  part_of_speech?: string;
  notes?: string;
  mastery_level: number;
  review_count: number;
  last_reviewed_at?: string;
  created_at: string;
  // SM-2 Spaced Repetition Fields
  next_review_date?: string;     // ISO timestamp - when this word is due for review
  ease_factor?: number;          // 1.3 - 2.5 (SM-2 difficulty multiplier)
  interval?: number;             // Days until next review
  repetitions?: number;          // Consecutive successful reviews
}

// Default settings
export const DEFAULT_USER_SETTINGS: UserSettings = {
  target_language: 'es',
  native_language: 'en',
  subtitle_font_size: 18,
  subtitle_position: 'bottom',
  auto_pause_on_click: false,
  highlight_unknown_words: true,
  show_pronunciation: true,
  theme: 'auto',
  review_daily_goal: 20,
  review_modes: ['flashcard', 'typing'],
};
