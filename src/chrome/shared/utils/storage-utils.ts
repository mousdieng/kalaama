/**
 * Chrome Storage Utilities
 * Helpers for working with chrome.storage API
 */

import type { StorageData, UserSettings, VocabularyItem, SupabaseSession } from '../types/storage';
import { DEFAULT_USER_SETTINGS } from '../types/storage';

/**
 * Get data from chrome.storage.local
 */
export async function getStorageData<K extends keyof StorageData>(
  keys: K[]
): Promise<Pick<StorageData, K>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result as Pick<StorageData, K>);
    });
  });
}

/**
 * Set data in chrome.storage.local
 */
export async function setStorageData(data: Partial<StorageData>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

/**
 * Remove data from chrome.storage.local
 */
export async function removeStorageData(keys: (keyof StorageData)[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, resolve);
  });
}

/**
 * Clear all storage data
 */
export async function clearStorageData(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}

// Session management

/**
 * Get Supabase session from storage
 */
export async function getSession(): Promise<SupabaseSession | null> {
  const { supabase_session } = await getStorageData(['supabase_session']);
  return supabase_session ?? null;
}

/**
 * Save Supabase session to storage
 */
export async function saveSession(session: SupabaseSession): Promise<void> {
  await setStorageData({ supabase_session: session });
}

/**
 * Clear Supabase session from storage
 */
export async function clearSession(): Promise<void> {
  await removeStorageData(['supabase_session']);
}

// Settings management

/**
 * Get user settings from storage
 */
export async function getSettings(): Promise<UserSettings> {
  const { user_settings } = await getStorageData(['user_settings']);
  return { ...DEFAULT_USER_SETTINGS, ...user_settings };
}

/**
 * Save user settings to storage
 */
export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  await setStorageData({
    user_settings: { ...current, ...settings },
  });
}

// Vocabulary cache management

/**
 * Get cached vocabulary
 */
export async function getCachedVocabulary(): Promise<VocabularyItem[] | null> {
  const { vocabulary_cache, vocabulary_cache_timestamp } = await getStorageData([
    'vocabulary_cache',
    'vocabulary_cache_timestamp',
  ]);

  if (!vocabulary_cache || !vocabulary_cache_timestamp) return null;

  // Check if cache is still valid (5 minutes)
  const cacheAge = Date.now() - vocabulary_cache_timestamp;
  if (cacheAge > 5 * 60 * 1000) return null;

  return vocabulary_cache;
}

/**
 * Cache vocabulary
 */
export async function cacheVocabulary(vocabulary: VocabularyItem[]): Promise<void> {
  await setStorageData({
    vocabulary_cache: vocabulary,
    vocabulary_cache_timestamp: Date.now(),
  });
}

/**
 * Clear vocabulary cache
 */
export async function clearVocabularyCache(): Promise<void> {
  await removeStorageData(['vocabulary_cache', 'vocabulary_cache_timestamp']);
}

// Extension state

/**
 * Check if extension is enabled
 */
export async function isExtensionEnabled(): Promise<boolean> {
  const { extension_enabled } = await getStorageData(['extension_enabled']);
  return extension_enabled ?? true;
}

/**
 * Set extension enabled state
 */
export async function setExtensionEnabled(enabled: boolean): Promise<void> {
  await setStorageData({ extension_enabled: enabled });
}

/**
 * Get current learning language
 */
export async function getCurrentLanguage(): Promise<string> {
  const { current_language } = await getStorageData(['current_language']);
  const settings = await getSettings();
  return current_language ?? settings.target_language;
}

/**
 * Set current learning language
 */
export async function setCurrentLanguage(language: string): Promise<void> {
  await setStorageData({ current_language: language });
}
