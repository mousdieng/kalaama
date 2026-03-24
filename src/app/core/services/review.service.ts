import { Injectable, inject } from '@angular/core';
import { VocabularyService, type VocabularyItem } from './vocabulary.service';
import { SupabaseService } from './supabase.service';

/**
 * Review Service
 * Implements SM-2 spaced repetition algorithm for vocabulary review
 *
 * SM-2 Algorithm Reference: https://super-memory.com/english/ol/2011/firstrevise.html
 *
 * Quality ratings (0-5):
 * 0 = Complete blackout (Again)
 * 1 = Incorrect response (Hard)
 * 2 = Incorrect but remembered
 * 3 = Correct but difficult (Good)
 * 4 = Correct but hesitated (Good)
 * 5 = Perfect recall, instant (Easy)
 */

export interface ReviewUpdate {
  next_review_date: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  mastery_level: number;
  last_reviewed_at: string;
}

export interface ReviewStats {
  dueCount: number;
  upcomingCount: number;
  reviewedToday: number;
  currentStreak: number;
  retentionRate: number;
}

export interface ReviewSession {
  wordId: string;
  word: string;
  translation: string;
  quality: number;
  reviewType: 'flashcard' | 'typing';
  timeSpentSeconds: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private vocabularyService = inject(VocabularyService);
  private supabase = inject(SupabaseService);

  // Constants for SM-2 algorithm
  private readonly MIN_EASE_FACTOR = 1.3;
  private readonly DEFAULT_EASE_FACTOR = 2.5;
  private readonly MAX_INTERVAL_DAYS = 180; // Cap max interval at 6 months
  private readonly TYPO_TOLERANCE = 0.2; // 20% character difference allowed

  /**
   * Get all vocabulary items due for review today
   * @param language Language code (e.g., 'es', 'fr')
   * @param limit Maximum number of words to return (default: 20)
   */
  async getDueWords(language: string, limit: number = 20): Promise<VocabularyItem[]> {
    try {
      // This will be implemented with direct Supabase query
      // For now, we'll get all vocabulary and filter locally
      const vocabulary = await this.vocabularyService.getVocabulary(language);

      const now = new Date();
      const dueWords = vocabulary
        .filter(word => {
          const nextReviewDate = word.next_review_date
            ? new Date(word.next_review_date)
            : new Date(word.created_at);
          return nextReviewDate <= now;
        })
        .sort((a, b) => {
          // Sort by next_review_date ascending (oldest first)
          const dateA = a.next_review_date ? new Date(a.next_review_date) : new Date(a.created_at);
          const dateB = b.next_review_date ? new Date(b.next_review_date) : new Date(b.created_at);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, limit);

      return dueWords;
    } catch (error) {
      console.error('[ReviewService] Failed to get due words:', error);
      return [];
    }
  }

  /**
   * Calculate SM-2 algorithm and return updated fields
   * Quality rating: 0-5 (0=Again, 3=Good, 5=Easy)
   */
  calculateSM2(
    quality: number,
    currentEaseFactor: number = this.DEFAULT_EASE_FACTOR,
    currentInterval: number = 1,
    currentRepetitions: number = 0
  ): ReviewUpdate {
    // Ensure quality is within valid range
    const validQuality = Math.max(0, Math.min(5, quality));

    let newEaseFactor = currentEaseFactor;
    let newInterval = currentInterval;
    let newRepetitions = currentRepetitions;

    if (validQuality < 3) {
      // Quality < 3: Failed to recall - reset interval
      newInterval = 1;
      newRepetitions = 0;
      newEaseFactor = Math.max(this.MIN_EASE_FACTOR, currentEaseFactor - 0.2);
    } else {
      // Quality >= 3: Successful recall - increase interval
      newRepetitions = currentRepetitions + 1;

      if (newRepetitions === 1) {
        newInterval = 1;
      } else if (newRepetitions === 2) {
        newInterval = 6;
      } else {
        // For repetitions >= 3: interval = previous_interval * ease_factor
        newInterval = Math.ceil(currentInterval * currentEaseFactor);
      }

      // Cap maximum interval at 180 days
      newInterval = Math.min(newInterval, this.MAX_INTERVAL_DAYS);

      // Adjust ease factor based on quality
      // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      const easeFaultFactor = 5 - validQuality;
      newEaseFactor +=
        0.1 - easeFaultFactor * (0.08 + easeFaultFactor * 0.02);
      newEaseFactor = Math.max(this.MIN_EASE_FACTOR, newEaseFactor);
    }

    // Calculate next review date
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);

    // Calculate mastery level (0-5 scale)
    const masteryLevel = this.calculateMasteryLevel(newRepetitions, validQuality);

    return {
      next_review_date: nextDate.toISOString(),
      ease_factor: Math.round(newEaseFactor * 100) / 100, // Round to 2 decimals
      interval: newInterval,
      repetitions: newRepetitions,
      mastery_level: masteryLevel,
      last_reviewed_at: new Date().toISOString()
    };
  }

  /**
   * Convert SM-2 metrics to mastery level (0-5)
   * 0 = New/Failed
   * 1 = Seen once
   * 2 = Beginner (1+ review)
   * 3 = Intermediate (3+ reviews)
   * 4 = Advanced (6+ reviews)
   * 5 = Mastered (10+ reviews with good performance)
   */
  private calculateMasteryLevel(repetitions: number, quality: number): number {
    if (repetitions >= 10 && quality >= 4) return 5; // Mastered
    if (repetitions >= 6 && quality >= 3) return 4;  // Advanced
    if (repetitions >= 3 && quality >= 3) return 3;  // Intermediate
    if (repetitions >= 1) return 2;                   // Beginner
    if (quality >= 3) return 1;                       // Seen once
    return 0;                                         // New/Failed
  }

  /**
   * Submit a review for a word
   * This updates the vocabulary item with SM-2 results
   */
  async submitReview(
    word: VocabularyItem,
    quality: number,
    reviewType: 'flashcard' | 'typing'
  ): Promise<void> {
    try {
      const currentEaseFactor = word.ease_factor ?? this.DEFAULT_EASE_FACTOR;
      const currentInterval = word.interval ?? 1;
      const currentRepetitions = word.repetitions ?? 0;

      // Calculate SM-2
      const update = this.calculateSM2(
        quality,
        currentEaseFactor,
        currentInterval,
        currentRepetitions
      );

      // Update review count
      const newReviewCount = (word.review_count ?? 0) + 1;

      // Prepare update payload
      const updatePayload = {
        ...word,
        next_review_date: update.next_review_date,
        ease_factor: update.ease_factor,
        interval: update.interval,
        repetitions: update.repetitions,
        mastery_level: update.mastery_level,
        last_reviewed_at: update.last_reviewed_at,
        review_count: newReviewCount
      };

      // Update vocabulary (this will sync to Supabase)
      await this.vocabularyService.updateWord(updatePayload);

      // Track review session (optional, for analytics)
      await this.trackReviewSession(
        word.id,
        word.language,
        quality >= 3 ? 1 : 0
      );
    } catch (error) {
      console.error('[ReviewService] Failed to submit review:', error);
      throw error;
    }
  }

  /**
   * Track review session for analytics
   */
  private async trackReviewSession(
    wordId: string,
    language: string,
    isCorrect: number
  ): Promise<void> {
    try {
      // This will be implemented to store in review_sessions table
      // For now, just log
      console.debug('[ReviewService] Review tracked:', {
        wordId,
        language,
        isCorrect: isCorrect === 1
      });
    } catch (error) {
      console.warn('[ReviewService] Failed to track review session:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get review statistics for a language
   */
  async getReviewStats(language: string): Promise<ReviewStats> {
    try {
      const vocabulary = await this.vocabularyService.getVocabulary(language);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Count due words (today or earlier)
      const dueCount = vocabulary.filter(word => {
        const nextReviewDate = word.next_review_date
          ? new Date(word.next_review_date)
          : new Date(word.created_at);
        return nextReviewDate <= now;
      }).length;

      // Count upcoming words (next 7 days)
      const upcomingCount = vocabulary.filter(word => {
        const nextReviewDate = word.next_review_date
          ? new Date(word.next_review_date)
          : new Date(word.created_at);
        return nextReviewDate > now && nextReviewDate <= sevenDaysFromNow;
      }).length;

      // Count reviewed today
      const reviewedToday = vocabulary.filter(word => {
        if (!word.last_reviewed_at) return false;
        const lastReviewDate = new Date(word.last_reviewed_at);
        return lastReviewDate >= today && lastReviewDate < tomorrow;
      }).length;

      // Calculate retention rate (% of words with mastery >= 3)
      const masteredCount = vocabulary.filter(
        word => (word.mastery_level ?? 0) >= 3
      ).length;
      const retentionRate = vocabulary.length > 0
        ? Math.round((masteredCount / vocabulary.length) * 100)
        : 0;

      // Calculate current streak (placeholder - would require daily session tracking)
      const currentStreak = 0;

      return {
        dueCount,
        upcomingCount,
        reviewedToday,
        currentStreak,
        retentionRate
      };
    } catch (error) {
      console.error('[ReviewService] Failed to get review stats:', error);
      return {
        dueCount: 0,
        upcomingCount: 0,
        reviewedToday: 0,
        currentStreak: 0,
        retentionRate: 0
      };
    }
  }

  /**
   * Get next due word for review (returns oldest due word)
   */
  async getNextDueWord(language: string): Promise<VocabularyItem | null> {
    const dueWords = await this.getDueWords(language, 1);
    return dueWords.length > 0 ? dueWords[0] : null;
  }

  /**
   * Check if a word is due for review
   */
  isWordDue(word: VocabularyItem): boolean {
    if (!word.next_review_date) {
      return true; // New words are always due
    }
    return new Date(word.next_review_date) <= new Date();
  }

  /**
   * Get days until next review
   */
  getDaysUntilNextReview(word: VocabularyItem): number {
    if (!word.next_review_date) {
      return 0;
    }
    const nextReview = new Date(word.next_review_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextReview.setHours(0, 0, 0, 0);

    const diffTime = nextReview.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Format next review date for display
   */
  formatNextReviewDate(word: VocabularyItem): string {
    if (!word.next_review_date) {
      return 'Today';
    }

    const daysUntil = this.getDaysUntilNextReview(word);

    if (daysUntil === 0) {
      return 'Today';
    } else if (daysUntil === 1) {
      return 'Tomorrow';
    } else if (daysUntil < 7) {
      return `In ${daysUntil} days`;
    } else if (daysUntil < 30) {
      const weeks = Math.ceil(daysUntil / 7);
      return `In ${weeks} week${weeks > 1 ? 's' : ''}`;
    } else {
      const months = Math.ceil(daysUntil / 30);
      return `In ${months} month${months > 1 ? 's' : ''}`;
    }
  }

  /**
   * Fuzzy match for typing mode
   * Returns the quality score based on how close the answer is
   * Allows typos and diacritical variations
   */
  fuzzyMatch(userAnswer: string, correctAnswer: string): { isMatch: boolean; quality: number } {
    // Normalize both strings
    const normalize = (str: string): string => {
      return str
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics (accents, tildes, etc.)
    };

    const normalizedUser = normalize(userAnswer);
    const normalizedCorrect = normalize(correctAnswer);

    // Exact match
    if (normalizedUser === normalizedCorrect) {
      return { isMatch: true, quality: 5 }; // Perfect (Easy)
    }

    // Calculate similarity
    const similarity = this.calculateSimilarity(normalizedUser, normalizedCorrect);

    // High similarity (>90%) - minor typos
    if (similarity > 0.9) {
      return { isMatch: true, quality: 4 }; // Good (hesitated)
    }

    // Medium similarity (>75%) - significant typos but recognizable
    if (similarity > 0.75) {
      return { isMatch: true, quality: 3 }; // Good (difficult)
    }

    // Low similarity - wrong answer
    return { isMatch: false, quality: 0 }; // Again
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns a value between 0 and 1 (1 = identical)
   */
  private calculateSimilarity(s1: string, s2: string): number {
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    if (maxLength === 0) return 1; // Both empty strings are identical
    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Used for fuzzy matching in typing mode
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    // Initialize first column and row
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate distance
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }
}
