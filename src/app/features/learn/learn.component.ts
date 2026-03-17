import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LearnService } from './services/learn.service';
import { SettingsService } from '../../core/services/settings.service';
import type { Unit, UserProgress, ConversationUnit } from '../../../chrome/shared/types/messages';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learn.component.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .unit-card {
      transition: all 0.3s ease;
    }

    .unit-card:hover:not(.locked) {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
    }

    .unit-card.locked {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    .current-unit {
      animation: pulse 2s ease-in-out infinite;
    }

    .vocab-tag {
      font-size: 0.65rem;
      padding: 2px 6px;
    }
  `]
})
export class LearnComponent implements OnInit {
  private router = inject(Router);
  private learnService = inject(LearnService);
  private settingsService = inject(SettingsService);

  // Conversation-based units (new themed approach)
  conversationUnits: ConversationUnit[] = [];

  // Legacy units (for languages without conversation curriculum)
  units: Unit[] = [];

  // Mode: 'conversation' or 'legacy'
  mode: 'conversation' | 'legacy' = 'conversation';

  userProgress: UserProgress | null = null;
  currentLanguage = 'de'; // Default to German for French speakers
  isLoading = true;
  error: string | null = null;

  // Language info for display
  languageInfo: { name: string; flag: string } = { name: 'Allemand', flag: '🇩🇪' };

  async ngOnInit(): Promise<void> {
    await this.loadLearningPath();
  }

  async loadLearningPath(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // Get target language from settings
      const settings = await this.settingsService.waitForReady();
      if (settings?.target_language) {
        this.currentLanguage = settings.target_language;
      }

      this.languageInfo = this.learnService.getLanguageInfo(this.currentLanguage);

      // Check if language has conversation curriculum (new themed approach)
      if (this.learnService.hasConversationCurriculum(this.currentLanguage)) {
        this.mode = 'conversation';
        const result = await this.learnService.getConversationLearningPath(this.currentLanguage);

        if (result) {
          this.conversationUnits = result.units;
          this.userProgress = result.userProgress;
        } else {
          this.error = 'Aucun cours disponible pour cette langue.';
        }
      } else {
        // Fallback to legacy curriculum
        this.mode = 'legacy';
        const result = await this.learnService.getLearningPath(this.currentLanguage);

        if (result) {
          this.units = result.units;
          this.userProgress = result.userProgress;
        } else {
          this.error = 'Aucun cours disponible pour cette langue.';
        }
      }
    } catch (err) {
      console.error('[Learn] Failed to load learning path:', err);
      this.error = 'Impossible de charger le parcours. Veuillez réessayer.';
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================
  // CONVERSATION MODE METHODS
  // ============================================

  isConversationUnitUnlocked(unit: ConversationUnit): boolean {
    if (!this.userProgress) return unit.requiredXP === 0;
    return this.userProgress.totalXP >= unit.requiredXP;
  }

  isConversationUnitCompleted(unit: ConversationUnit): boolean {
    if (!this.userProgress) return false;
    return this.userProgress.completedLessons[unit.id]?.completed ?? false;
  }

  getConversationUnitProgress(unit: ConversationUnit): number {
    if (!this.userProgress) return 0;
    const progress = this.userProgress.completedLessons[unit.id];
    return progress?.bestScore ?? 0;
  }

  getNextConversationUnit(): ConversationUnit | null {
    return this.learnService.getNextConversationUnit(this.conversationUnits, this.userProgress!);
  }

  startConversationUnit(unit: ConversationUnit): void {
    if (!this.isConversationUnitUnlocked(unit)) {
      return;
    }
    // Navigate to lesson with unit ID
    this.router.navigate(['/learn/lesson', unit.id]);
  }

  startNextConversationUnit(): void {
    const next = this.getNextConversationUnit();
    if (next) {
      this.startConversationUnit(next);
    }
  }

  // ============================================
  // LEGACY MODE METHODS
  // ============================================

  isUnitUnlocked(unit: Unit): boolean {
    if (!this.userProgress) return unit.requiredXP === 0;
    return this.userProgress.totalXP >= unit.requiredXP;
  }

  isLessonCompleted(lessonId: string): boolean {
    if (!this.userProgress) return false;
    return this.userProgress.completedLessons[lessonId]?.completed ?? false;
  }

  getLessonProgress(lessonId: string): number {
    if (!this.userProgress) return 0;
    const progress = this.userProgress.completedLessons[lessonId];
    return progress?.bestScore ?? 0;
  }

  getCompletedLessonsInUnit(unit: Unit): number {
    return unit.lessons.filter(l => this.isLessonCompleted(l.id)).length;
  }

  getUnitProgress(unit: Unit): number {
    const completed = this.getCompletedLessonsInUnit(unit);
    return Math.round((completed / unit.lessons.length) * 100);
  }

  getCurrentUnit(): Unit | null {
    for (const unit of this.units) {
      if (this.isUnitUnlocked(unit)) {
        const hasIncomplete = unit.lessons.some(l => !this.isLessonCompleted(l.id));
        if (hasIncomplete) return unit;
      }
    }
    return null;
  }

  getNextLesson(): { unit: Unit; lessonId: string } | null {
    for (const unit of this.units) {
      if (this.isUnitUnlocked(unit)) {
        const nextLesson = unit.lessons.find(l => !this.isLessonCompleted(l.id));
        if (nextLesson) {
          return { unit, lessonId: nextLesson.id };
        }
      }
    }
    return null;
  }

  startLesson(lessonId: string, unit: Unit): void {
    if (!this.isUnitUnlocked(unit)) {
      return;
    }
    this.router.navigate(['/learn/lesson', lessonId]);
  }

  startNextLesson(): void {
    const next = this.getNextLesson();
    if (next) {
      this.startLesson(next.lessonId, next.unit);
    }
  }

  // ============================================
  // SHARED METHODS
  // ============================================

  formatXP(xp: number): string {
    if (xp >= 1000) {
      return (xp / 1000).toFixed(1) + 'k';
    }
    return xp.toString();
  }

  getStreakEmoji(): string {
    if (!this.userProgress) return '🔥';
    const streak = this.userProgress.currentStreak;
    if (streak >= 30) return '🏆';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '🔥';
    return '✨';
  }

  getXPToNextUnit(): number {
    if (this.mode === 'conversation') {
      const next = this.conversationUnits.find(u => !this.isConversationUnitUnlocked(u));
      if (next && this.userProgress) {
        return Math.max(0, next.requiredXP - this.userProgress.totalXP);
      }
    }
    return 0;
  }
}
