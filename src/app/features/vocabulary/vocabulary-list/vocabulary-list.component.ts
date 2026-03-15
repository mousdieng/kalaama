import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VocabularyService, VocabularyItem } from '../../../core/services/vocabulary.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-vocabulary-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  template: `
    <div class="p-4 space-y-4 animate-fade-in">
      <!-- Search and Filter -->
      <div class="flex gap-2">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (input)="filterVocabulary()"
          placeholder="Search words..."
          class="input flex-1"
        />
        <select
          [(ngModel)]="filterLanguage"
          (change)="loadVocabulary()"
          class="input w-24"
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

      <!-- Stats -->
      <div class="flex justify-between text-sm text-slate-500">
        <span>{{ filteredVocabulary.length }} words</span>
        <span>{{ masteredCount }} mastered</span>
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
        <div class="space-y-2 max-h-[400px] overflow-y-auto">
          @for (word of filteredVocabulary; track word.id) {
            <div
              class="card p-3 hover:shadow-md transition-shadow cursor-pointer"
              (click)="selectedWord = word"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-lg">{{ word.word }}</span>
                    <span class="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                      {{ word.language }}
                    </span>
                  </div>
                  <div class="text-slate-600 dark:text-slate-300 mt-1">
                    {{ word.translation }}
                  </div>
                  @if (word.context_sentence) {
                    <div class="text-sm text-slate-400 mt-1 italic truncate">
                      "{{ word.context_sentence }}"
                    </div>
                  }
                </div>

                <!-- Mastery indicator -->
                <div class="flex flex-col items-end gap-1">
                  <div class="flex gap-0.5">
                    @for (i of [0,1,2,3,4]; track i) {
                      <div
                        class="w-2 h-2 rounded-full"
                        [class.bg-primary-500]="i < word.mastery_level"
                        [class.bg-slate-300]="i >= word.mastery_level"
                      ></div>
                    }
                  </div>
                  <button
                    (click)="deleteWord($event, word)"
                    class="text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Word Detail Modal -->
      @if (selectedWord) {
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          (click)="selectedWord = null"
        >
          <div
            class="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl"
            (click)="$event.stopPropagation()"
          >
            <h2 class="text-2xl font-bold mb-2">{{ selectedWord.word }}</h2>
            <p class="text-lg text-slate-600 dark:text-slate-300 mb-4">
              {{ selectedWord.translation }}
            </p>

            @if (selectedWord.context_sentence) {
              <div class="mb-4">
                <div class="text-sm text-slate-500 mb-1">Context</div>
                <p class="text-sm italic">"{{ selectedWord.context_sentence }}"</p>
              </div>
            }

            @if (selectedWord.video_title) {
              <div class="mb-4">
                <div class="text-sm text-slate-500 mb-1">From video</div>
                <p class="text-sm">{{ selectedWord.video_title }}</p>
              </div>
            }

            <div class="flex items-center justify-between mb-4">
              <span class="text-sm text-slate-500">Mastery Level</span>
              <div class="flex gap-1">
                @for (i of [0,1,2,3,4]; track i) {
                  <button
                    (click)="updateMastery(selectedWord, i + 1)"
                    class="w-6 h-6 rounded-full transition-colors"
                    [class.bg-primary-500]="i < selectedWord.mastery_level"
                    [class.bg-slate-300]="i >= selectedWord.mastery_level"
                    [class.hover:bg-primary-400]="i >= selectedWord.mastery_level"
                  ></button>
                }
              </div>
            </div>

            <button
              (click)="selectedWord = null"
              class="w-full btn-secondary"
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

  loading = true;
  vocabulary: VocabularyItem[] = [];
  filteredVocabulary: VocabularyItem[] = [];
  selectedWord: VocabularyItem | null = null;
  searchQuery = '';
  filterLanguage = '';

  get masteredCount(): number {
    return this.filteredVocabulary.filter((v) => v.mastery_level >= 5).length;
  }

  async ngOnInit(): Promise<void> {
    await this.loadVocabulary();
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

  async deleteWord(event: Event, word: VocabularyItem): Promise<void> {
    event.stopPropagation();
    if (confirm(`Delete "${word.word}"?`)) {
      await this.vocabularyService.deleteWord(word.id);
    }
  }

  async updateMastery(word: VocabularyItem, level: number): Promise<void> {
    await this.vocabularyService.updateMastery(word.id, level);
    word.mastery_level = level;
  }
}
