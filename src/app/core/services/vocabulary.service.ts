import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  language: string;
  context_sentence?: string;
  video_id?: string;
  video_title?: string;
  mastery_level: number;
  review_count: number;
  created_at: string;
  updated_at?: string;
  // Full AI context from Gemini
  definition?: string;
  part_of_speech?: string;
  examples?: string[]; // Initial examples (2-3 from word context)
  pronunciation?: string;
  // AI-generated detailed examples (10-20 examples)
  aiExamples?: string[];
  // SM-2 Spaced Repetition Fields
  last_reviewed_at?: string;
  next_review_date?: string;     // ISO timestamp - when this word is due for review
  ease_factor?: number;          // 1.3 - 2.5 (SM-2 difficulty multiplier)
  interval?: number;             // Days until next review
  repetitions?: number;          // Consecutive successful reviews
}

@Injectable({
  providedIn: 'root',
})
export class VocabularyService {
  private supabase = inject(SupabaseService);

  private vocabularySubject = new BehaviorSubject<VocabularyItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  vocabulary$ = this.vocabularySubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  // Getter to access current vocabulary value
  get currentVocabulary(): VocabularyItem[] {
    return this.vocabularySubject.value;
  }

  /**
   * Load vocabulary from Supabase
   */
  async loadVocabulary(language?: string, limit = 50): Promise<void> {
    this.loadingSubject.next(true);

    try {
      let query = this.supabase.from('vocabulary').select('*');

      // Filter by language if specified
      if (language) {
        query = query.eq('language', language);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      this.vocabularySubject.next((data as VocabularyItem[]) || []);
    } catch (error) {
      console.error('[Kalaama] Failed to load vocabulary:', error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Get vocabulary for a specific language
   * Used by ReviewService for filtering words
   */
  async getVocabulary(language: string): Promise<VocabularyItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('vocabulary')
        .select('*')
        .eq('language', language)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data as VocabularyItem[]) || [];
    } catch (error) {
      console.error('[Kalaama] Failed to get vocabulary:', error);
      return [];
    }
  }

  /**
   * Add a word to vocabulary (Supabase)
   */
  async addWord(word: Partial<VocabularyItem>): Promise<VocabularyItem | null> {
    try {
      // Check if word already exists
      const { data: existing } = await this.supabase
        .from('vocabulary')
        .select('*')
        .eq('word', word.word)
        .eq('language', word.language)
        .single();

      const wordEntry: VocabularyItem = {
        id: existing?.id || `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        word: word.word || '',
        translation: word.translation || '',
        language: word.language || 'es',
        context_sentence: word.context_sentence,
        video_id: word.video_id,
        video_title: word.video_title,
        mastery_level: existing?.mastery_level || 0,
        review_count: existing?.review_count || 0,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        definition: word.definition,
        part_of_speech: word.part_of_speech,
        examples: word.examples,
        pronunciation: word.pronunciation,
        aiExamples: existing?.aiExamples,
      };

      // Upsert word
      const { data, error } = await this.supabase
        .from('vocabulary')
        .upsert([wordEntry], { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      // Reload vocabulary
      await this.loadVocabulary();

      return data as VocabularyItem;
    } catch (error) {
      console.error('[Kalaama] Failed to add word:', error);
      return null;
    }
  }

  /**
   * Delete a word from vocabulary (Supabase)
   */
  async deleteWord(wordId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vocabulary')
        .delete()
        .eq('id', wordId);

      if (error) throw error;

      // Reload vocabulary
      await this.loadVocabulary();
    } catch (error) {
      console.error('[Kalaama] Failed to delete word:', error);
    }
  }

  /**
   * Update entire word object (including SM-2 spaced repetition fields)
   * This is used by ReviewService to update review results
   */
  async updateWord(word: VocabularyItem): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vocabulary')
        .update({
          mastery_level: word.mastery_level,
          review_count: word.review_count,
          last_reviewed_at: word.updated_at || new Date().toISOString(),
          // SM-2 fields
          next_review_date: (word as any).next_review_date,
          ease_factor: (word as any).ease_factor,
          interval: (word as any).interval,
          repetitions: (word as any).repetitions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', word.id);

      if (error) throw error;

      // Update local cache
      const currentVocab = this.vocabularySubject.value;
      const index = currentVocab.findIndex(v => v.id === word.id);
      if (index >= 0) {
        currentVocab[index] = { ...currentVocab[index], ...word };
        this.vocabularySubject.next([...currentVocab]);
      }
    } catch (error) {
      console.error('[Kalaama] Failed to update word:', error);
      throw error;
    }
  }

  /**
   * Update word mastery level (Supabase)
   */
  async updateMastery(wordId: string, masteryLevel: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vocabulary')
        .update({
          mastery_level: masteryLevel,
          review_count: (this.vocabularySubject.value.find(v => v.id === wordId)?.review_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wordId);

      if (error) throw error;

      // Reload vocabulary
      await this.loadVocabulary();
    } catch (error) {
      console.error('[Kalaama] Failed to update mastery:', error);
    }
  }

  /**
   * Update word with AI examples (Supabase)
   */
  async updateAIExamples(wordId: string, aiExamples: string[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vocabulary')
        .update({
          aiExamples,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wordId);

      if (error) throw error;

      // Reload vocabulary
      await this.loadVocabulary();
    } catch (error) {
      console.error('[Kalaama] Failed to save AI examples:', error);
    }
  }

  /**
   * Get vocabulary statistics
   */
  getStats(): { total: number; mastered: number; learning: number } {
    const vocabulary = this.vocabularySubject.value;
    return {
      total: vocabulary.length,
      mastered: vocabulary.filter((v) => v.mastery_level >= 5).length,
      learning: vocabulary.filter(
        (v) => v.mastery_level > 0 && v.mastery_level < 5
      ).length,
    };
  }

  /**
   * Search vocabulary
   */
  search(query: string): VocabularyItem[] {
    const vocabulary = this.vocabularySubject.value;
    const lowerQuery = query.toLowerCase();
    return vocabulary.filter(
      (v) =>
        v.word.toLowerCase().includes(lowerQuery) ||
        v.translation.toLowerCase().includes(lowerQuery)
    );
  }
}
