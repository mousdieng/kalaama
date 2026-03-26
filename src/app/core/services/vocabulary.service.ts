import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { DictionaryService } from './dictionary.service';
import { DictionaryWord, DictionaryExample, Collocation } from '../../../chrome/shared/types/dictionary';

// Updated interface - supports both legacy and dictionary-linked words
export interface VocabularyItem {
  id: string;
  dictionary_id?: string;      // NEW: Foreign key to dictionary (null for legacy words)

  // Legacy fields (kept for backward compatibility until migration)
  word?: string;               // Will be removed after migration
  translation?: string;        // Will be removed after migration
  definition?: string;         // Will be removed after migration
  part_of_speech?: string;     // Will be removed after migration
  examples?: string[];         // Will be removed after migration
  pronunciation?: string;      // Will be removed after migration
  aiExamples?: string[];       // Will be removed after migration

  // User-specific fields (kept)
  language: string;
  context_sentence?: string;
  video_id?: string;
  video_title?: string;
  notes?: string;              // NEW: User's personal notes
  custom_examples?: string[];  // NEW: User's personal examples

  // Learning progress (kept)
  mastery_level: number;
  review_count: number;
  created_at: string;
  updated_at?: string;

  // SM-2 Spaced Repetition Fields (kept)
  last_reviewed_at?: string;
  next_review_date?: string;
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
}

// For displaying vocabulary with dictionary data joined
// Omit 'examples' from VocabularyItem since we're replacing it with DictionaryExample[]
export interface VocabularyItemWithDictionary extends Omit<VocabularyItem, 'examples'> {
  word: string;
  translation: string;
  definition: string;
  part_of_speech: string;
  examples: DictionaryExample[];
  pronunciation?: string;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: Collocation[];
  difficulty_level?: string;
  article?: string;
  gender?: string;
  plural_form?: string;
  conjugation_hint?: string;
}

@Injectable({
  providedIn: 'root',
})
export class VocabularyService {
  private supabase = inject(SupabaseService);
  private dictionaryService = inject(DictionaryService);

  private vocabularySubject = new BehaviorSubject<VocabularyItemWithDictionary[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  vocabulary$ = this.vocabularySubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  // Getter to access current vocabulary value
  get currentVocabulary(): VocabularyItemWithDictionary[] {
    return this.vocabularySubject.value;
  }

  /**
   * Load vocabulary from Supabase with dictionary data joined
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

      const vocabularyItems = (data as VocabularyItem[]) || [];

      // Join with dictionary data
      const enrichedItems = await this.joinWithDictionary(vocabularyItems);

      this.vocabularySubject.next(enrichedItems);
    } catch (error) {
      console.error('[Kalaama] Failed to load vocabulary:', error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Get vocabulary for a specific language (used by ReviewService)
   */
  async getVocabulary(language: string): Promise<VocabularyItemWithDictionary[]> {
    try {
      const { data, error } = await this.supabase
        .from('vocabulary')
        .select('*')
        .eq('language', language)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vocabularyItems = (data as VocabularyItem[]) || [];
      return await this.joinWithDictionary(vocabularyItems);
    } catch (error) {
      console.error('[Kalaama] Failed to get vocabulary:', error);
      return [];
    }
  }

  /**
   * Add a word to vocabulary
   * Checks dictionary first, then creates user vocabulary entry
   */
  async addWord(input: {
    word?: string;
    dictionary_id?: string;
    language: string;
    context_sentence?: string;
    video_id?: string;
    video_title?: string;
    notes?: string;
    // Legacy fields for backward compatibility
    translation?: string;
    definition?: string;
    part_of_speech?: string;
    examples?: string[];
    pronunciation?: string;
  }): Promise<VocabularyItemWithDictionary | null> {
    try {
      let dictionaryId = input.dictionary_id;
      let dictionaryEntry: DictionaryWord | null = null;

      // If word is provided but no dictionary_id, search dictionary
      if (input.word && !dictionaryId) {
        dictionaryEntry = await this.dictionaryService.searchWord(input.word, input.language);
        if (dictionaryEntry) {
          dictionaryId = dictionaryEntry.id;
        } else {
          // Word not in dictionary - log as missing
          await this.dictionaryService.logMissingWord(input.word, {
            video_id: input.video_id,
            video_title: input.video_title,
            context_sentence: input.context_sentence
          });
        }
      }

      // Check if word already exists in user's vocabulary
      let existingQuery = this.supabase.from('vocabulary').select('*');

      if (dictionaryId) {
        existingQuery = existingQuery.eq('dictionary_id', dictionaryId);
      } else if (input.word) {
        existingQuery = existingQuery.eq('word', input.word).eq('language', input.language);
      }

      const { data: existing } = await existingQuery.single();

      // Prepare vocabulary entry
      const vocabularyEntry: Partial<VocabularyItem> = {
        dictionary_id: dictionaryId,
        language: input.language,
        context_sentence: input.context_sentence,
        video_id: input.video_id,
        video_title: input.video_title,
        notes: input.notes,
        mastery_level: existing?.mastery_level || 0,
        review_count: existing?.review_count || 0,

        // Legacy fields (for backward compatibility)
        word: input.word,
        translation: input.translation,
        definition: input.definition,
        part_of_speech: input.part_of_speech,
        examples: input.examples,
        pronunciation: input.pronunciation,
      };

      // Upsert vocabulary entry
      const { data, error } = await this.supabase
        .from('vocabulary')
        .upsert([vocabularyEntry])
        .select()
        .single();

      if (error) throw error;

      // Reload vocabulary to get enriched data
      await this.loadVocabulary();

      // Find and return the newly added word
      const addedWord = this.vocabularySubject.value.find(v => v.id === data.id);
      return addedWord || null;
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
  async updateWord(word: VocabularyItemWithDictionary): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vocabulary')
        .update({
          mastery_level: word.mastery_level,
          review_count: word.review_count,
          last_reviewed_at: word.last_reviewed_at || new Date().toISOString(),
          notes: word.notes,
          custom_examples: word.custom_examples,
          // SM-2 fields
          next_review_date: word.next_review_date,
          ease_factor: word.ease_factor,
          interval: word.interval,
          repetitions: word.repetitions,
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
   * Update user's personal notes for a word
   */
  async updateNotes(wordId: string, notes: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vocabulary')
        .update({
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wordId);

      if (error) throw error;

      // Update local cache
      const currentVocab = this.vocabularySubject.value;
      const index = currentVocab.findIndex(v => v.id === wordId);
      if (index >= 0) {
        currentVocab[index].notes = notes;
        this.vocabularySubject.next([...currentVocab]);
      }
    } catch (error) {
      console.error('[Kalaama] Failed to update notes:', error);
    }
  }

  /**
   * Update word with AI examples (legacy - for backward compatibility)
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
  search(query: string): VocabularyItemWithDictionary[] {
    const vocabulary = this.vocabularySubject.value;
    const lowerQuery = query.toLowerCase();
    return vocabulary.filter(
      (v) =>
        v.word.toLowerCase().includes(lowerQuery) ||
        v.translation.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Internal helper: Join vocabulary items with dictionary data
   */
  private async joinWithDictionary(
    vocabularyItems: VocabularyItem[]
  ): Promise<VocabularyItemWithDictionary[]> {
    // Separate dictionary-linked words from legacy words
    const dictionaryLinkedWords = vocabularyItems.filter(v => v.dictionary_id);
    const legacyWords = vocabularyItems.filter(v => !v.dictionary_id);

    // Batch fetch dictionary entries
    const dictionaryIds = dictionaryLinkedWords.map(v => v.dictionary_id!);
    const dictionaryEntries = dictionaryIds.length > 0
      ? await this.dictionaryService.getDictionaryEntries(dictionaryIds)
      : [];

    // Create a map for quick lookup
    const dictionaryMap = new Map<string, DictionaryWord>();
    dictionaryEntries.forEach(entry => {
      dictionaryMap.set(entry.id, entry);
    });

    // Merge vocabulary with dictionary data
    const enrichedWords: VocabularyItemWithDictionary[] = [];

    // Process dictionary-linked words
    for (const vocabItem of dictionaryLinkedWords) {
      const dictEntry = dictionaryMap.get(vocabItem.dictionary_id!);

      if (dictEntry) {
        enrichedWords.push({
          ...vocabItem,
          word: dictEntry.word,
          translation: dictEntry.french_translation,
          definition: dictEntry.french_definition,
          part_of_speech: dictEntry.part_of_speech,
          examples: dictEntry.examples,
          pronunciation: dictEntry.pronunciation_ipa,
          synonyms: dictEntry.synonyms,
          antonyms: dictEntry.antonyms,
          collocations: dictEntry.collocations,
          difficulty_level: dictEntry.difficulty_level,
          article: dictEntry.article,
          gender: dictEntry.gender,
          plural_form: dictEntry.plural_form,
          conjugation_hint: dictEntry.conjugation_hint,
        });
      } else {
        // Dictionary entry not found - use legacy data
        enrichedWords.push({
          ...vocabItem,
          word: vocabItem.word || '',
          translation: vocabItem.translation || '',
          definition: vocabItem.definition || '',
          part_of_speech: vocabItem.part_of_speech || '',
          examples: [],
        });
      }
    }

    // Process legacy words (no dictionary_id)
    for (const vocabItem of legacyWords) {
      enrichedWords.push({
        ...vocabItem,
        word: vocabItem.word || '',
        translation: vocabItem.translation || '',
        definition: vocabItem.definition || '',
        part_of_speech: vocabItem.part_of_speech || '',
        examples: vocabItem.examples?.map(ex => ({
          german: ex,
          french: '',
          level: 'A1' as const
        })) || [],
      });
    }

    return enrichedWords;
  }
}
