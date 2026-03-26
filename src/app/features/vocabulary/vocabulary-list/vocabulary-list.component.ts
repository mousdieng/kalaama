import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VocabularyService, VocabularyItem, VocabularyItemWithDictionary } from '../../../core/services/vocabulary.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { MessagingService } from '../../../core/services/messaging.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ReviewService, ReviewStats } from '../../../core/services/review.service';

@Component({
  selector: 'app-vocabulary-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  template: `
    <div class="p-4 space-y-4 animate-fade-in">
      <!-- Search and Filter -->
      <div class="flex gap-2">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (input)="filterVocabulary()"
            placeholder="Search words..."
            class="input pl-10 w-full"
          />
        </div>
        <select
          [(ngModel)]="filterLanguage"
          (change)="loadVocabulary()"
          class="input w-28"
        >
          <option value="">All</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="wo">Wolof</option>
        </select>
      </div>

      <!-- Stats and Review Button -->
      <div class="space-y-3">
        <div class="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Total Words</div>
              <div class="text-lg font-bold text-slate-900 dark:text-white">{{ filteredVocabulary.length }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Mastered</div>
              <div class="text-lg font-bold text-green-600 dark:text-green-400">{{ masteredCount }}</div>
            </div>
          </div>
        </div>

        <!-- Review Stats and Button -->
        <button
          (click)="startReview()"
          class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 active:scale-95"
          [disabled]="dueCount === 0"
        >
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l-4 4m0 0l-4-4m4 4V3m0 0h.01M12 15a6 6 0 100-12 6 6 0 000 12z"/>
            </svg>
            <span>Start Review</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold bg-white/20 px-2 py-1 rounded-full">
              {{ dueCount }} due
            </span>
          </div>
        </button>
      </div>

      <!-- Vocabulary List -->
      @if (loading) {
        <app-loading message="Loading vocabulary..." />
      } @else if (filteredVocabulary.length === 0) {
        <div class="text-center py-12 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p class="mb-2">No vocabulary yet</p>
          <p class="text-sm">Start watching YouTube with Kalaama!</p>
        </div>
      } @else {
        <div class="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          @for (word of filteredVocabulary; track word.id) {
            <div
              class="card p-4 hover:shadow-md transition-all cursor-pointer group relative"
              (click)="selectWord(word)"
            >
              <!-- Language badge in top-right corner -->
              <div class="absolute top-2 right-2 text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                <button
                  (click)="deleteWord($event, word)"
                  class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
                  title="Delete word"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <!-- Word -->
              <div class="mb-2 pr-12">
                <h3 class="font-bold text-xl text-slate-900 dark:text-white">
                  {{ word.word }}
                </h3>
              </div>

              <!-- Translation -->
              <div className=" flex gap-2">
                <div class="mb-3">
                  <p class="text-base text-slate-700 dark:text-slate-300">
                    {{ word.translation }}
                  </p>
                </div>

                <!-- Part of speech (if available) -->
                @if (word.part_of_speech) {
                  <div class="mb-2">
                    <span class="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
                      {{ word.part_of_speech }}
                    </span>
                  </div>
                }
              </div>

              <!-- Context preview (shortened) -->
              @if (word.context_sentence) {
                <div class="text-sm text-slate-500 dark:text-slate-400 italic mb-3">
                  "{{ truncateText(word.context_sentence, 80) }}"
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Word Detail Modal -->
      @if (selectedWord) {
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          style="margin-top: 0px !important;"
          (click)="selectedWord = null"
        >
          <div
            class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <!-- Header -->
            <div class="flex items-start justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div class="flex-1">
                <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {{ selectedWord.word }}
                </h2>
                @if (selectedWord.pronunciation) {
                  <p class="text-sm text-slate-500 dark:text-slate-400">
                    {{ selectedWord.pronunciation }}
                  </p>
                }
              </div>
              <button
                (click)="selectedWord = null"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Translation -->
            <div class="mb-5">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-xl font-medium text-indigo-600 dark:text-indigo-400">
                  {{ selectedWord.translation }}
                </p>
                @if (selectedWord.part_of_speech) {
                  <span class="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    {{ selectedWord.part_of_speech }}
                  </span>
                }
                <span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ selectedWord.language }}
                </span>
              </div>
            </div>

            <!-- Definition -->
            @if (selectedWord.definition) {
              <div class="mb-5 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Definition
                </div>
                <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {{ selectedWord.definition }}
                </p>
              </div>
            }

            <!-- Examples (AI-generated) -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  AI Examples
                </div>
                <div class="flex items-center gap-2">
                  @if (!isLoadingExamples && aiExamples.length > 0) {
                    <span class="text-xs text-slate-400">{{ aiExamples.length }} examples</span>
                    <button
                      (click)="regenerateExamples()"
                      class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      title="Regenerate with current settings"
                    >
                      Regenerate
                    </button>
                  }
                </div>
              </div>

              @if (isLoadingExamples) {
                <div class="flex items-center justify-center py-8">
                  <svg class="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="ml-2 text-sm text-slate-600 dark:text-slate-400">Generating examples...</span>
                </div>
              } @else if (examplesError) {
                <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {{ examplesError }}
                </div>
              } @else if (aiExamples.length > 0) {
                <div class="space-y-2 max-h-64 overflow-y-auto pr-2">
                  @for (example of aiExamples; track example) {
                    <div class="pl-3 py-2 border-l-3 border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 rounded-r">
                      <p class="text-sm text-slate-700 dark:text-slate-300">{{ example }}</p>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-sm text-slate-500 dark:text-slate-400 italic">No examples available</p>
              }
            </div>

            <!-- Context -->
            @if (selectedWord.context_sentence) {
              <div class="mb-5">
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Context
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                  "{{ selectedWord.context_sentence }}"
                </p>
              </div>
            }

            <!-- Source Video -->
            @if (selectedWord.video_title) {
              <div class="mb-5">
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  From video
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400">{{ selectedWord.video_title }}</p>
              </div>
            }

            <!-- Mastery Level -->
            <div class="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Mastery Level</span>
                <span class="text-xs text-slate-500">Tap to update</span>
              </div>
              <div class="flex gap-2">
                @for (i of [0,1,2,3,4]; track i) {
                  <button
                    (click)="updateMastery(selectedWord, i + 1)"
                    class="flex-1 h-10 rounded-lg transition-all"
                    [class.bg-indigo-500]="i < selectedWord.mastery_level"
                    [class.bg-slate-200]="i >= selectedWord.mastery_level"
                    [class.dark:bg-indigo-600]="i < selectedWord.mastery_level"
                    [class.dark:bg-slate-700]="i >= selectedWord.mastery_level"
                    [class.hover:bg-indigo-400]="i < selectedWord.mastery_level"
                    [class.hover:bg-slate-300]="i >= selectedWord.mastery_level"
                    [class.dark:hover:bg-indigo-500]="i < selectedWord.mastery_level"
                    [class.dark:hover:bg-slate-600]="i >= selectedWord.mastery_level"
                  ></button>
                }
              </div>
            </div>

            <!-- Close Button -->
            <button
              (click)="selectedWord = null"
              class="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class VocabularyListComponent implements OnInit {
  private vocabularyService = inject(VocabularyService);
  private messagingService = inject(MessagingService);
  private settingsService = inject(SettingsService);
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  loading = true;
  vocabulary: VocabularyItemWithDictionary[] = [];
  filteredVocabulary: VocabularyItemWithDictionary[] = [];
  selectedWord: VocabularyItemWithDictionary | null = null;
  searchQuery = '';
  filterLanguage = '';

  // Examples fetching state
  aiExamples: string[] = [];
  isLoadingExamples = false;
  examplesError: string | null = null;

  // Review stats
  reviewStats: ReviewStats | null = null;
  dueCount = 0;

  get masteredCount(): number {
    return this.filteredVocabulary.filter((v) => v.mastery_level >= 5).length;
  }

  async ngOnInit(): Promise<void> {
    await this.loadVocabulary();
    await this.loadReviewStats();
  }

  async loadVocabulary(): Promise<void> {
    this.loading = true;
    await this.vocabularyService.loadVocabulary(
      this.filterLanguage || undefined,
      100
    );

    this.vocabularyService.vocabulary$.subscribe((vocabulary) => {
      this.vocabulary = vocabulary;
      this.filterVocabulary();
      this.loading = false;
    });
  }

  filterVocabulary(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredVocabulary = this.vocabulary.filter(
      (word) =>
        word.word.toLowerCase().includes(query) ||
        word.translation.toLowerCase().includes(query)
    );
  }

  async deleteWord(event: Event, word: VocabularyItemWithDictionary): Promise<void> {
    event.stopPropagation();
    if (confirm(`Delete "${word.word}"?`)) {
      await this.vocabularyService.deleteWord(word.id);
    }
  }

  async updateMastery(word: VocabularyItemWithDictionary, level: number): Promise<void> {
    await this.vocabularyService.updateMastery(word.id, level);
    word.mastery_level = level;
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  async selectWord(word: VocabularyItemWithDictionary): Promise<void> {
    this.selectedWord = word;
    this.examplesError = null;

    // Debug: Check what examples exist
    console.log('[Vocabulary] Word selected:', word.word);
    console.log('[Vocabulary] Has aiExamples?', !!word.aiExamples);
    console.log('[Vocabulary] aiExamples count:', word.aiExamples?.length || 0);
    console.log('[Vocabulary] Has old examples?', !!word.examples);
    console.log('[Vocabulary] old examples count:', word.examples?.length || 0);

    // Check if word already has AI examples stored
    if (word.aiExamples && word.aiExamples.length > 0) {
      console.log('[Vocabulary] Using stored AI examples:', word.aiExamples.length);
      this.aiExamples = word.aiExamples;
      this.isLoadingExamples = false;
      return;
    }

    // Fetch AI examples if not stored
    await this.fetchAIExamples(word);
  }

  async fetchAIExamples(word: VocabularyItemWithDictionary, force: boolean = false): Promise<void> {
    this.aiExamples = [];
    this.isLoadingExamples = true;
    this.examplesError = null;

    try {
      const settings = await this.settingsService.waitForReady();
      const targetLanguage = settings?.target_language || 'de';
      const nativeLanguage = settings?.native_language || 'en';
      const examplesCount = settings?.ai_examples_count || 15;

      console.log(`[Vocabulary] Fetching ${examplesCount} AI examples for "${word.word}"...`);
      console.log(`[Vocabulary] Settings - Target: ${targetLanguage}, Native: ${nativeLanguage}, Count: ${examplesCount}`);

      const response = await this.messagingService.getWordExamples(
        word.word,
        targetLanguage,
        nativeLanguage,
        examplesCount
      );

      console.log('[Vocabulary] API Response:', response);
      console.log('[Vocabulary] Examples received:', response.examples.length);
      response.examples.forEach((ex, i) => console.log(`  ${i+1}. ${ex}`));

      this.aiExamples = response.examples;

      // Save the examples to the vocabulary item
      await this.vocabularyService.updateAIExamples(word.id, response.examples);

      console.log('[Vocabulary] AI examples fetched and saved:', response.examples.length);

      // Update the word object in memory
      if (this.selectedWord) {
        this.selectedWord.aiExamples = response.examples;
      }
    } catch (error: any) {
      console.error('[Vocabulary] Failed to fetch examples:', error);
      this.examplesError = 'Failed to load examples';
    } finally {
      this.isLoadingExamples = false;
    }
  }

  async regenerateExamples(): Promise<void> {
    if (!this.selectedWord) return;
    console.log('[Vocabulary] Regenerating examples...');
    await this.fetchAIExamples(this.selectedWord, true);
  }

  /**
   * Load review statistics
   */
  private async loadReviewStats(): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();
      const language = settings.target_language || 'es';
      this.reviewStats = await this.reviewService.getReviewStats(language);
      this.dueCount = this.reviewStats.dueCount;
    } catch (error) {
      console.warn('[Vocabulary] Failed to load review stats:', error);
    }
  }

  /**
   * Start a review session
   */
  async startReview(): Promise<void> {
    if (this.dueCount === 0) {
      alert('No words due for review today!');
      return;
    }
    this.router.navigate(['/review']);
  }
}
