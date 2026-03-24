import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReviewService } from '../../core/services/review.service';
import { VocabularyService, type VocabularyItem } from '../../core/services/vocabulary.service';
import { SettingsService } from '../../core/services/settings.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ReviewCard {
  word: VocabularyItem;
  mode: 'flashcard' | 'typing';
  showAnswer: boolean;
  typedAnswer: string;
  quality: number | null;
  isGraded: boolean;
  isCorrect?: boolean;
}

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewComponent implements OnInit, OnDestroy {
  private reviewService = inject(ReviewService);
  private vocabularyService = inject(VocabularyService);
  private settingsService = inject(SettingsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // Session data
  dueWords: VocabularyItem[] = [];
  currentIndex = 0;
  sessionStartTime = new Date();
  sessionsReviewedCount = 0;
  correctCount = 0;

  // UI state
  isLoading = true;
  hasError = false;
  errorMessage = '';
  sessionActive = false;
  sessionComplete = false;

  // Review settings
  dailyGoal = 20;
  reviewModes: ('flashcard' | 'typing')[] = ['flashcard', 'typing'];

  // Current card state
  currentCard: ReviewCard | null = null;

  get currentWord(): VocabularyItem | null {
    return this.currentCard?.word || null;
  }

  get progressPercent(): number {
    if (this.dueWords.length === 0) return 0;
    return Math.round(((this.currentIndex + 1) / this.dueWords.length) * 100);
  }

  get totalWords(): number {
    return this.dueWords.length;
  }

  get isSessionComplete(): boolean {
    return this.sessionComplete;
  }

  get accuracyPercent(): number {
    if (this.sessionsReviewedCount === 0) return 0;
    return Math.round((this.correctCount / this.sessionsReviewedCount) * 100);
  }

  get sessionDurationSeconds(): number {
    const now = new Date();
    return Math.floor((now.getTime() - this.sessionStartTime.getTime()) / 1000);
  }

  ngOnInit(): void {
    this.loadReviewSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load due words and initialize review session
   */
  private async loadReviewSession(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;

    try {
      // Get settings
      const settings = await this.settingsService.getSettings();
      this.dailyGoal = settings.review_daily_goal || 20;
      this.reviewModes = settings.review_modes || ['flashcard', 'typing'];

      // Get due words
      const language = settings.target_language || 'es';
      this.dueWords = await this.reviewService.getDueWords(language, this.dailyGoal);

      if (this.dueWords.length === 0) {
        this.hasError = true;
        this.errorMessage = 'No words due for review today! Great job keeping up with your vocabulary.';
        this.isLoading = false;
        this.cdr.markForCheck();
        return;
      }

      // Initialize session
      this.sessionActive = true;
      this.currentIndex = 0;
      this.loadCard(0);

      this.isLoading = false;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('[Review] Failed to load review session:', error);
      this.hasError = true;
      this.errorMessage = 'Failed to load review session. Please try again.';
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Load a specific card
   */
  private loadCard(index: number): void {
    if (index >= this.dueWords.length) {
      this.completeSession();
      return;
    }

    const word = this.dueWords[index];
    const mode = this.getRandomMode();

    this.currentCard = {
      word,
      mode,
      showAnswer: false,
      typedAnswer: '',
      quality: null,
      isGraded: false
    };

    this.currentIndex = index;
    this.cdr.markForCheck();
  }

  /**
   * Get random review mode
   */
  private getRandomMode(): 'flashcard' | 'typing' {
    if (this.reviewModes.length === 0) return 'flashcard';
    if (this.reviewModes.length === 1) return this.reviewModes[0];
    return this.reviewModes[Math.floor(Math.random() * this.reviewModes.length)];
  }

  /**
   * Flashcard: Show answer
   */
  flipCard(): void {
    if (this.currentCard) {
      this.currentCard.showAnswer = true;
      this.cdr.markForCheck();
    }
  }

  /**
   * Flashcard: Self-grade and move to next card
   */
  submitFlashcardGrade(quality: number): void {
    if (!this.currentCard) return;

    this.currentCard.quality = quality;
    this.currentCard.isGraded = true;

    // Update counters
    this.sessionsReviewedCount++;
    if (quality >= 3) {
      this.correctCount++;
    }

    // Submit review to service
    this.submitReview();

    // Move to next card after delay
    setTimeout(() => {
      this.nextCard();
    }, 500);
  }

  /**
   * Typing: Check answer
   */
  checkAnswer(): void {
    if (!this.currentCard || this.currentCard.isGraded) return;

    const typed = this.currentCard.typedAnswer.trim().toLowerCase();
    const correct = this.currentCard.word.translation.toLowerCase().trim();

    // Simple exact match or fuzzy match
    const isCorrect = this.fuzzyMatch(typed, correct);

    this.currentCard.isCorrect = isCorrect;
    this.currentCard.isGraded = true;

    // Set quality based on correctness
    this.currentCard.quality = isCorrect ? 5 : 0;

    // Update counters
    this.sessionsReviewedCount++;
    if (isCorrect) {
      this.correctCount++;
    }

    // Submit review to service
    this.submitReview();

    this.cdr.markForCheck();
  }

  /**
   * Fuzzy matching for typing answers
   * Allows for minor typos (Levenshtein distance)
   */
  private fuzzyMatch(typed: string, correct: string, tolerance: number = 2): boolean {
    // Exact match
    if (typed === correct) return true;

    // Levenshtein distance
    const distance = this.levenshteinDistance(typed, correct);
    const maxLength = Math.max(typed.length, correct.length);

    // Allow up to 2 character differences for short words
    // Allow up to 3 for longer words
    const maxDifference = maxLength < 6 ? 1 : 2;

    return distance <= maxDifference;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = Array(len2 + 1)
      .fill(null)
      .map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    return matrix[len2][len1];
  }

  /**
   * Submit review to service
   */
  private async submitReview(): Promise<void> {
    if (!this.currentCard) return;

    try {
      await this.reviewService.submitReview(
        this.currentCard.word,
        this.currentCard.quality || 0,
        this.currentCard.mode
      );
    } catch (error) {
      console.error('[Review] Failed to submit review:', error);
    }
  }

  /**
   * Move to next card
   */
  nextCard(): void {
    if (this.currentIndex + 1 >= this.dueWords.length) {
      this.completeSession();
    } else {
      this.loadCard(this.currentIndex + 1);
    }
  }

  /**
   * Complete review session
   */
  private completeSession(): void {
    this.sessionActive = false;
    this.sessionComplete = true;
    this.cdr.markForCheck();
  }

  /**
   * Restart review session
   */
  restartSession(): void {
    this.sessionComplete = false;
    this.currentIndex = 0;
    this.sessionsReviewedCount = 0;
    this.correctCount = 0;
    this.sessionStartTime = new Date();
    this.loadReviewSession();
  }

  /**
   * Back to vocabulary list
   */
  goBack(): void {
    this.router.navigate(['/vocabulary']);
  }

  /**
   * Skip current card (mark as 0 quality - "Again")
   */
  skipCard(): void {
    if (!this.currentCard || this.currentCard.isGraded) return;

    this.currentCard.quality = 0;
    this.currentCard.isGraded = true;

    this.sessionsReviewedCount++;
    this.submitReview();

    setTimeout(() => {
      this.nextCard();
    }, 300);
  }
}
