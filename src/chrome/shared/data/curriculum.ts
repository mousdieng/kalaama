/**
 * Curriculum loader and types
 * Re-exports types from messages.ts and provides curriculum loading utilities
 */

import type { Unit, Lesson, LessonPrompt, ConversationUnit } from '../types/messages';

// Re-export types for convenience
export type { Unit, Lesson, LessonPrompt, ConversationUnit };

// Supported languages for learning
export const SUPPORTED_LANGUAGES = ['es', 'fr', 'de', 'it', 'pt', 'wo'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Language metadata
export const LANGUAGE_INFO: Record<SupportedLanguage, { name: string; flag: string; nativeName: string }> = {
  es: { name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  fr: { name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  de: { name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  it: { name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  pt: { name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
  wo: { name: 'Wolof', flag: '🇸🇳', nativeName: 'Wolof' },
};

// Curriculum registry - maps language codes to their curriculum data
const curriculumRegistry: Record<string, Unit[]> = {};

// Conversation-based curriculum registry (new format)
const conversationCurriculumRegistry: Record<string, ConversationUnit[]> = {};

/**
 * Register a curriculum for a language (old prompt-based format)
 */
export function registerCurriculum(languageCode: string, units: Unit[]): void {
  curriculumRegistry[languageCode] = units;
}

/**
 * Register a conversation-based curriculum for a language (new format)
 */
export function registerConversationCurriculum(languageCode: string, units: ConversationUnit[]): void {
  conversationCurriculumRegistry[languageCode] = units;
}

/**
 * Get curriculum for a language (old format)
 */
export function getCurriculum(languageCode: string): Unit[] | null {
  return curriculumRegistry[languageCode] || null;
}

/**
 * Get conversation-based curriculum for a language (new format)
 */
export function getConversationCurriculum(languageCode: string): ConversationUnit[] | null {
  return conversationCurriculumRegistry[languageCode] || null;
}

/**
 * Get a specific conversation unit by ID
 */
export function getConversationUnit(languageCode: string, unitId: string): ConversationUnit | null {
  const curriculum = getConversationCurriculum(languageCode);
  if (!curriculum) return null;
  return curriculum.find(unit => unit.id === unitId) || null;
}

/**
 * Check if a language has conversation-based curriculum
 */
export function hasConversationCurriculum(languageCode: string): boolean {
  return !!conversationCurriculumRegistry[languageCode];
}

/**
 * Get all available languages with curricula
 */
export function getAvailableLanguages(): string[] {
  return Object.keys(curriculumRegistry);
}

/**
 * Get a specific lesson by ID
 */
export function getLesson(languageCode: string, lessonId: string): Lesson | null {
  const curriculum = getCurriculum(languageCode);
  if (!curriculum) return null;

  for (const unit of curriculum) {
    const lesson = unit.lessons.find(l => l.id === lessonId);
    if (lesson) return lesson;
  }
  return null;
}

/**
 * Get the unit containing a specific lesson
 */
export function getUnitForLesson(languageCode: string, lessonId: string): Unit | null {
  const curriculum = getCurriculum(languageCode);
  if (!curriculum) return null;

  return curriculum.find(unit => unit.lessons.some(l => l.id === lessonId)) || null;
}

/**
 * Get the next lesson in the curriculum
 */
export function getNextLesson(languageCode: string, currentLessonId: string): Lesson | null {
  const curriculum = getCurriculum(languageCode);
  if (!curriculum) return null;

  let foundCurrent = false;
  for (const unit of curriculum) {
    for (const lesson of unit.lessons) {
      if (foundCurrent) return lesson;
      if (lesson.id === currentLessonId) foundCurrent = true;
    }
  }
  return null;
}

/**
 * Calculate total XP available in a curriculum
 */
export function getTotalAvailableXP(languageCode: string): number {
  const curriculum = getCurriculum(languageCode);
  if (!curriculum) return 0;

  return curriculum.reduce((total, unit) => {
    return total + unit.lessons.reduce((unitTotal, lesson) => unitTotal + lesson.xpReward, 0);
  }, 0);
}

/**
 * Helper to create a lesson prompt with defaults
 */
export function createPrompt(
  id: string,
  instruction: string,
  options: Partial<LessonPrompt> = {}
): LessonPrompt {
  return {
    id,
    instruction,
    aiContext: options.aiContext || `Help the student with: ${instruction}`,
    targetPhrase: options.targetPhrase,
    expectedResponses: options.expectedResponses,
    hints: options.hints,
    audioUrl: options.audioUrl,
  };
}

/**
 * Helper to create a lesson with defaults
 */
export function createLesson(
  id: string,
  unitId: string,
  title: string,
  prompts: LessonPrompt[],
  options: Partial<Lesson> = {}
): Lesson {
  return {
    id,
    unitId,
    title,
    description: options.description || title,
    type: options.type || 'conversation',
    prompts,
    xpReward: options.xpReward || 10,
    estimatedMinutes: options.estimatedMinutes || 5,
  };
}

/**
 * Helper to create a unit with defaults
 */
export function createUnit(
  id: string,
  title: string,
  lessons: Lesson[],
  options: Partial<Unit> = {}
): Unit {
  return {
    id,
    title,
    description: options.description || title,
    lessons,
    requiredXP: options.requiredXP || 0,
    icon: options.icon,
  };
}
