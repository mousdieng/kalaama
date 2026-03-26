import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { DictionaryWord, MissingWord } from '../../../chrome/shared/types/dictionary';

@Injectable({
  providedIn: 'root',
})
export class DictionaryService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  // In-memory cache for frequent words (top 1000)
  private wordCache = new Map<string, DictionaryWord>();
  private cacheInitialized = false;

  /**
   * Search dictionary by word (exact match, case-insensitive)
   */
  async searchWord(word: string, language: string = 'de'): Promise<DictionaryWord | null> {
    try {
      // Check cache first
      const cacheKey = `${language}:${word.toLowerCase()}`;
      if (this.wordCache.has(cacheKey)) {
        return this.wordCache.get(cacheKey)!;
      }

      // Query database
      const { data, error } = await this.supabase
        .from('german_french_dictionary')
        .select('*')
        .ilike('word', word)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - word not found
          return null;
        }
        throw error;
      }

      const dictionaryWord = data as DictionaryWord;

      // Cache the result
      this.wordCache.set(cacheKey, dictionaryWord);

      return dictionaryWord;
    } catch (error) {
      console.error('[Kalaama] Failed to search word:', error);
      return null;
    }
  }

  /**
   * Search dictionary with fuzzy matching (for typos)
   */
  async searchWordFuzzy(word: string, limit: number = 5): Promise<DictionaryWord[]> {
    try {
      // Use pg_trgm similarity for fuzzy search
      const { data, error } = await this.supabase
        .rpc('search_dictionary_fuzzy', {
          search_word: word,
          limit_count: limit
        });

      if (error) throw error;

      return (data as DictionaryWord[]) || [];
    } catch (error) {
      console.error('[Kalaama] Failed to fuzzy search word:', error);
      return [];
    }
  }

  /**
   * Get dictionary entry by ID
   */
  async getDictionaryEntry(id: string): Promise<DictionaryWord | null> {
    try {
      const { data, error } = await this.supabase
        .from('german_french_dictionary')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data as DictionaryWord;
    } catch (error) {
      console.error('[Kalaama] Failed to get dictionary entry:', error);
      return null;
    }
  }

  /**
   * Get multiple dictionary entries by IDs (batch query)
   */
  async getDictionaryEntries(ids: string[]): Promise<DictionaryWord[]> {
    if (ids.length === 0) return [];

    try {
      const { data, error } = await this.supabase
        .from('german_french_dictionary')
        .select('*')
        .in('id', ids);

      if (error) throw error;

      return (data as DictionaryWord[]) || [];
    } catch (error) {
      console.error('[Kalaama] Failed to get dictionary entries:', error);
      return [];
    }
  }

  /**
   * Search dictionary with filters
   */
  async searchDictionary(options: {
    query?: string;
    difficulty_level?: string[];
    part_of_speech?: string[];
    limit?: number;
  }): Promise<DictionaryWord[]> {
    try {
      let query = this.supabase.from('german_french_dictionary').select('*');

      // Filter by search query
      if (options.query) {
        query = query.ilike('word', `%${options.query}%`);
      }

      // Filter by difficulty level
      if (options.difficulty_level && options.difficulty_level.length > 0) {
        query = query.in('difficulty_level', options.difficulty_level);
      }

      // Filter by part of speech
      if (options.part_of_speech && options.part_of_speech.length > 0) {
        query = query.in('part_of_speech', options.part_of_speech);
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Order by frequency rank
      query = query.order('frequency_rank', { ascending: true, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data as DictionaryWord[]) || [];
    } catch (error) {
      console.error('[Kalaama] Failed to search dictionary:', error);
      return [];
    }
  }

  /**
   * Get suggested words by frequency (most common words)
   */
  async getFrequentWords(limit: number = 100): Promise<DictionaryWord[]> {
    try {
      const { data, error } = await this.supabase
        .from('german_french_dictionary')
        .select('*')
        .not('frequency_rank', 'is', null)
        .order('frequency_rank', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data as DictionaryWord[]) || [];
    } catch (error) {
      console.error('[Kalaama] Failed to get frequent words:', error);
      return [];
    }
  }

  /**
   * Initialize cache with top 1000 frequent words
   */
  async initializeCache(): Promise<void> {
    if (this.cacheInitialized) return;

    try {
      const frequentWords = await this.getFrequentWords(1000);
      frequentWords.forEach(word => {
        const cacheKey = `de:${word.word.toLowerCase()}`;
        this.wordCache.set(cacheKey, word);
      });
      this.cacheInitialized = true;
      console.log('[Kalaama] Dictionary cache initialized with', frequentWords.length, 'words');
    } catch (error) {
      console.error('[Kalaama] Failed to initialize dictionary cache:', error);
    }
  }

  /**
   * Log missing word to database
   * Uses upsert logic - increments click_count if already logged
   */
  async logMissingWord(word: string, context: {
    video_id?: string;
    video_title?: string;
    context_sentence?: string;
  }): Promise<void> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        console.warn('[Kalaama] Cannot log missing word - user not authenticated');
        return;
      }

      // Use the upsert function from migration
      const { data, error } = await this.supabase.rpc('upsert_missing_word', {
        p_word: word,
        p_user_id: currentUser.id,
        p_video_id: context.video_id || null,
        p_video_title: context.video_title || null,
        p_context_sentence: context.context_sentence || null,
        p_language: 'de'
      });

      if (error) throw error;

      console.log('[Kalaama] Logged missing word:', word);
    } catch (error) {
      console.error('[Kalaama] Failed to log missing word:', error);
    }
  }

  /**
   * Get user's missing words
   */
  async getMissingWords(): Promise<MissingWord[]> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        return [];
      }

      const { data, error } = await this.supabase
        .from('missing_words')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'pending')
        .order('click_count', { ascending: false })
        .order('last_clicked_at', { ascending: false });

      if (error) throw error;

      return (data as MissingWord[]) || [];
    } catch (error) {
      console.error('[Kalaama] Failed to get missing words:', error);
      return [];
    }
  }

  /**
   * Get aggregated missing words (admin only)
   * Shows which words are most requested across all users
   */
  async getAggregatedMissingWords(limit: number = 100): Promise<{
    word: string;
    total_clicks: number;
    unique_users: number;
    sample_context?: string;
    sample_video_title?: string;
  }[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_aggregated_missing_words', {
        limit_count: limit,
        filter_language: 'de',
        filter_status: 'pending'
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[Kalaama] Failed to get aggregated missing words:', error);
      return [];
    }
  }

  /**
   * Clear cache (useful after dictionary updates)
   */
  clearCache(): void {
    this.wordCache.clear();
    this.cacheInitialized = false;
    console.log('[Kalaama] Dictionary cache cleared');
  }
}
