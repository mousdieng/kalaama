import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

// =============================================================================
// SUPABASE DISABLED - Using chrome.storage.local
// =============================================================================
// import { SupabaseService } from './supabase.service';
// =============================================================================

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
}

@Injectable({
  providedIn: 'root',
})
export class VocabularyService {
  // SUPABASE DISABLED
  // private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  private vocabularySubject = new BehaviorSubject<VocabularyItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  vocabulary$ = this.vocabularySubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  // Getter to access current vocabulary value
  get currentVocabulary(): VocabularyItem[] {
    return this.vocabularySubject.value;
  }

  /**
   * Load vocabulary from chrome.storage.local
   */
  async loadVocabulary(language?: string, limit = 50): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) return;

    this.loadingSubject.next(true);

    try {
      const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');

      let result = [...vocabulary];

      // Filter by language if specified
      if (language) {
        result = result.filter((v: VocabularyItem) => v.language === language);
      }

      // Sort by created_at descending
      result.sort((a: VocabularyItem, b: VocabularyItem) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply limit
      if (limit) {
        result = result.slice(0, limit);
      }

      this.vocabularySubject.next(result);
    } catch (error) {
      console.error('[Kalaama] Failed to load vocabulary:', error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Add a word to vocabulary (chrome.storage.local)
   */
  async addWord(word: Partial<VocabularyItem>): Promise<VocabularyItem | null> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('Not authenticated');

    const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');

    const wordId = `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if word already exists
    const existingIndex = vocabulary.findIndex(
      (v: VocabularyItem) => v.word === word.word && v.language === word.language
    );

    const wordEntry: VocabularyItem = {
      id: existingIndex >= 0 ? vocabulary[existingIndex].id : wordId,
      word: word.word || '',
      translation: word.translation || '',
      language: word.language || 'es',
      context_sentence: word.context_sentence,
      video_id: word.video_id,
      video_title: word.video_title,
      mastery_level: existingIndex >= 0 ? vocabulary[existingIndex].mastery_level : 0,
      review_count: existingIndex >= 0 ? vocabulary[existingIndex].review_count : 0,
      created_at: existingIndex >= 0 ? vocabulary[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Full AI context from Gemini
      definition: word.definition,
      part_of_speech: word.part_of_speech,
      examples: word.examples,
      pronunciation: word.pronunciation,
      // Preserve existing AI examples if updating
      aiExamples: existingIndex >= 0 ? vocabulary[existingIndex].aiExamples : undefined,
    };

    if (existingIndex >= 0) {
      vocabulary[existingIndex] = wordEntry;
    } else {
      vocabulary.unshift(wordEntry);
    }

    await chrome.storage.local.set({ vocabulary });

    // Update local state
    this.vocabularySubject.next([...vocabulary]);

    console.log('[Kalaama] Word added:', wordEntry.word);
    return wordEntry;
  }

  /**
   * Delete a word from vocabulary (chrome.storage.local)
   */
  async deleteWord(wordId: string): Promise<void> {
    const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');

    const updatedVocabulary = vocabulary.filter((v: VocabularyItem) => v.id !== wordId);

    await chrome.storage.local.set({ vocabulary: updatedVocabulary });

    // Update local state
    this.vocabularySubject.next(updatedVocabulary);

    console.log('[Kalaama] Word deleted:', wordId);
  }

  /**
   * Update word mastery level (chrome.storage.local)
   */
  async updateMastery(wordId: string, masteryLevel: number): Promise<void> {
    const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');

    const index = vocabulary.findIndex((v: VocabularyItem) => v.id === wordId);

    if (index >= 0) {
      vocabulary[index].mastery_level = masteryLevel;
      vocabulary[index].review_count = (vocabulary[index].review_count || 0) + 1;
      vocabulary[index].updated_at = new Date().toISOString();

      await chrome.storage.local.set({ vocabulary });

      // Update local state
      this.vocabularySubject.next([...vocabulary]);
    }
  }

  /**
   * Update word with AI examples (chrome.storage.local)
   */
  async updateAIExamples(wordId: string, aiExamples: string[]): Promise<void> {
    const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');

    const index = vocabulary.findIndex((v: VocabularyItem) => v.id === wordId);

    if (index >= 0) {
      vocabulary[index].aiExamples = aiExamples;
      vocabulary[index].updated_at = new Date().toISOString();

      await chrome.storage.local.set({ vocabulary });

      // Update local state
      this.vocabularySubject.next([...vocabulary]);

      console.log('[Kalaama] AI examples saved for word:', vocabulary[index].word);
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
