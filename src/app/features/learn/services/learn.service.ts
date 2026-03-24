import { Injectable, inject } from '@angular/core';
import { MessagingService } from '../../../core/services/messaging.service';
import type {
  Unit,
  Lesson,
  UserProgress,
  LessonProgress,
  LearningPathResponse,
  SaveLessonProgressPayload,
  ConversationUnit,
} from '../../../../chrome/shared/types/messages';

// Import curriculum data directly (for offline support)
import {
  getCurriculum,
  getLesson as getCurriculumLesson,
  getConversationCurriculum,
  getConversationUnit as getConversationUnitFromCurriculum,
  registerConversationCurriculum,
  LANGUAGE_INFO,
  type SupportedLanguage,
} from '../../../../chrome/shared/data/curriculum';

// Import Spanish curriculum to register it
import '../../../../chrome/shared/data/curriculum/spanish';

// Import German curriculum and register it
import { GERMAN_CURRICULUM } from '../../../../chrome/shared/data/curriculum/german';

// Register German conversation curriculum
registerConversationCurriculum('de', GERMAN_CURRICULUM);

@Injectable({
  providedIn: 'root'
})
export class LearnService {
  private messagingService = inject(MessagingService);

  // Cache for curriculum and progress
  private curriculumCache: Map<string, Unit[]> = new Map();
  private progressCache: UserProgress | null = null;

  /**
   * Get the learning path for a language
   * Returns units and user progress
   */
  async getLearningPath(language: string): Promise<LearningPathResponse | null> {
    try {
      // Try to get curriculum from local data first
      let units = this.curriculumCache.get(language);

      if (!units) {
        // Load from local curriculum data
        units = getCurriculum(language) || [];
        if (units.length > 0) {
          this.curriculumCache.set(language, units);
        }
      }

      // Get user progress from storage
      const userProgress = await this.getUserProgress(language);

      return {
        units,
        userProgress,
      };
    } catch (error) {
      console.error('[LearnService] Failed to get learning path:', error);
      return null;
    }
  }

  /**
   * Get a specific lesson by ID
   */
  async getLesson(lessonId: string, language: string): Promise<Lesson | null> {
    // Try local curriculum first
    const lesson = getCurriculumLesson(language, lessonId);
    if (lesson) return lesson;

    // Fallback: search in cached curriculum
    const curriculum = this.curriculumCache.get(language) || getCurriculum(language);
    if (!curriculum) return null;

    for (const unit of curriculum) {
      const found = unit.lessons.find(l => l.id === lessonId);
      if (found) return found;
    }

    return null;
  }

  /**
   * Get user's learning progress
   */
  async getUserProgress(language: string): Promise<UserProgress> {
    try {
      const result = await chrome.storage.local.get('learning_progress');
      const allProgress = result['learning_progress'] || {};

      // Get or create progress for this language
      const progress: UserProgress = allProgress[language] || this.getDefaultProgress(language);

      this.progressCache = progress;
      return progress;
    } catch (error) {
      console.error('[LearnService] Failed to get user progress:', error);
      return this.getDefaultProgress(language);
    }
  }

  /**
   * Save lesson progress
   */
  async saveLessonProgress(
    language: string,
    lessonId: string,
    score: number,
    completed: boolean,
    timeSpentSeconds: number
  ): Promise<void> {
    try {
      // Get current progress
      const result = await chrome.storage.local.get('learning_progress');
      const allProgress = result['learning_progress'] || {};
      const languageProgress: UserProgress = allProgress[language] || this.getDefaultProgress(language);

      // Get existing lesson progress or create new
      const existingLesson = languageProgress.completedLessons[lessonId];
      const lessonProgress: LessonProgress = {
        lessonId,
        completed: completed || existingLesson?.completed || false,
        score,
        bestScore: Math.max(score, existingLesson?.bestScore || 0),
        attempts: (existingLesson?.attempts || 0) + 1,
        completedAt: completed ? new Date().toISOString() : existingLesson?.completedAt,
        timeSpentSeconds: (existingLesson?.timeSpentSeconds || 0) + timeSpentSeconds,
      };

      // Update progress
      languageProgress.completedLessons[lessonId] = lessonProgress;

      // Award XP for completion
      if (completed && !existingLesson?.completed) {
        const lesson = await this.getLesson(lessonId, language);
        if (lesson) {
          languageProgress.totalXP += lesson.xpReward;
        }
      }

      // Update streak
      await this.updateStreak(languageProgress);

      // Save back
      allProgress[language] = languageProgress;
      await chrome.storage.local.set({ learning_progress: allProgress });

      // Update cache
      this.progressCache = languageProgress;

    } catch (error) {
      console.error('[LearnService] Failed to save lesson progress:', error);
      throw error;
    }
  }

  /**
   * Add XP to user's progress
   */
  async addXP(language: string, xp: number): Promise<void> {
    try {
      const result = await chrome.storage.local.get('learning_progress');
      const allProgress = result['learning_progress'] || {};
      const languageProgress: UserProgress = allProgress[language] || this.getDefaultProgress(language);

      languageProgress.totalXP += xp;

      allProgress[language] = languageProgress;
      await chrome.storage.local.set({ learning_progress: allProgress });
      this.progressCache = languageProgress;
    } catch (error) {
      console.error('[LearnService] Failed to add XP:', error);
    }
  }

  /**
   * Update user's streak
   */
  private async updateStreak(progress: UserProgress): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const lastPractice = progress.lastPracticeDate;

    if (lastPractice === today) {
      // Already practiced today
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastPractice === yesterdayStr) {
      // Continuing streak
      progress.currentStreak += 1;
      progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
    } else if (lastPractice !== today) {
      // Streak broken
      progress.currentStreak = 1;
    }

    progress.lastPracticeDate = today;
  }

  /**
   * Get default progress for a new user
   */
  private getDefaultProgress(language: string): UserProgress {
    return {
      totalXP: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: '',
      completedLessons: {},
      unlockedUnits: [],
      currentLanguage: language,
    };
  }

  /**
   * Get language display info
   */
  getLanguageInfo(code: string): { name: string; flag: string } {
    const info = LANGUAGE_INFO[code as SupportedLanguage];
    if (info) {
      return { name: info.name, flag: info.flag };
    }

    // Fallback for unsupported languages
    const fallbacks: Record<string, { name: string; flag: string }> = {
      en: { name: 'English', flag: '🇬🇧' },
      es: { name: 'Spanish', flag: '🇪🇸' },
      fr: { name: 'French', flag: '🇫🇷' },
      de: { name: 'German', flag: '🇩🇪' },
      it: { name: 'Italian', flag: '🇮🇹' },
      pt: { name: 'Portuguese', flag: '🇵🇹' },
      ru: { name: 'Russian', flag: '🇷🇺' },
      zh: { name: 'Chinese', flag: '🇨🇳' },
      ja: { name: 'Japanese', flag: '🇯🇵' },
      ko: { name: 'Korean', flag: '🇰🇷' },
      ar: { name: 'Arabic', flag: '🇸🇦' },
      wo: { name: 'Wolof', flag: '🇸🇳' },
    };

    return fallbacks[code] || { name: code.toUpperCase(), flag: '🌍' };
  }

  /**
   * Check if a lesson is completed
   */
  isLessonCompleted(lessonId: string): boolean {
    return this.progressCache?.completedLessons[lessonId]?.completed ?? false;
  }

  /**
   * Get cached progress
   */
  getCachedProgress(): UserProgress | null {
    return this.progressCache;
  }

  /**
   * Reset progress for a language (for testing)
   */
  async resetProgress(language: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get('learning_progress');
      const allProgress = result['learning_progress'] || {};

      delete allProgress[language];

      await chrome.storage.local.set({ learning_progress: allProgress });
      this.progressCache = null;
    } catch (error) {
      console.error('[LearnService] Failed to reset progress:', error);
    }
  }

  // ============================================
  // CONVERSATION-BASED LEARNING
  // ============================================

  /**
   * Get conversation units for a language (new themed format)
   */
  async getConversationLearningPath(language: string): Promise<{
    units: ConversationUnit[];
    userProgress: UserProgress;
  } | null> {
    try {
      // Get conversation curriculum
      const units = getConversationCurriculum(language) || [];

      if (units.length === 0) {
        console.warn('[LearnService] No conversation curriculum for', language);
        return null;
      }

      // Get user progress
      const userProgress = await this.getUserProgress(language);

      return { units, userProgress };
    } catch (error) {
      console.error('[LearnService] Failed to get conversation learning path:', error);
      return null;
    }
  }

  /**
   * Get a specific conversation unit by ID
   */
  async getConversationUnit(unitId: string, language: string): Promise<ConversationUnit | null> {
    const unit = getConversationUnitFromCurriculum(language, unitId);
    return unit || null;
  }

  /**
   * Check if a language has conversation-based curriculum
   */
  hasConversationCurriculum(language: string): boolean {
    const curriculum = getConversationCurriculum(language);
    return curriculum !== null && curriculum.length > 0;
  }

  /**
   * Save progress for a conversation unit
   */
  async saveConversationProgress(
    language: string,
    unitId: string,
    score: number,
    completed: boolean,
    timeSpentSeconds: number,
    xpEarned: number
  ): Promise<void> {
    try {
      // Get current progress
      const result = await chrome.storage.local.get('learning_progress');
      const allProgress = result['learning_progress'] || {};
      const languageProgress: UserProgress = allProgress[language] || this.getDefaultProgress(language);

      // Get existing unit progress or create new
      const existingUnit = languageProgress.completedLessons[unitId];
      const unitProgress: LessonProgress = {
        lessonId: unitId,
        completed: completed || existingUnit?.completed || false,
        score,
        bestScore: Math.max(score, existingUnit?.bestScore || 0),
        attempts: (existingUnit?.attempts || 0) + 1,
        completedAt: completed ? new Date().toISOString() : existingUnit?.completedAt,
        timeSpentSeconds: (existingUnit?.timeSpentSeconds || 0) + timeSpentSeconds,
      };

      // Update progress
      languageProgress.completedLessons[unitId] = unitProgress;

      // Add XP
      if (completed && !existingUnit?.completed) {
        languageProgress.totalXP += xpEarned;
      }

      // Update streak
      await this.updateStreak(languageProgress);

      // Save back
      allProgress[language] = languageProgress;
      await chrome.storage.local.set({ learning_progress: allProgress });

      // Update cache
      this.progressCache = languageProgress;
    } catch (error) {
      console.error('[LearnService] Failed to save conversation progress:', error);
      throw error;
    }
  }

  /**
   * Check if a conversation unit is unlocked based on XP
   */
  isConversationUnitUnlocked(unit: ConversationUnit, userProgress: UserProgress): boolean {
    return userProgress.totalXP >= unit.requiredXP;
  }

  /**
   * Get next unlocked conversation unit that's not completed
   */
  getNextConversationUnit(units: ConversationUnit[], userProgress: UserProgress): ConversationUnit | null {
    for (const unit of units) {
      if (this.isConversationUnitUnlocked(unit, userProgress)) {
        const isCompleted = userProgress.completedLessons[unit.id]?.completed ?? false;
        if (!isCompleted) {
          return unit;
        }
      }
    }
    return null;
  }
}
