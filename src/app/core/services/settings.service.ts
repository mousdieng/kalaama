import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

// =============================================================================
// SUPABASE DISABLED - Using chrome.storage.local only
// =============================================================================
// import { SupabaseService } from './supabase.service';
// =============================================================================

export interface UserSettings {
  target_language: string;
  native_language: string;
  subtitle_font_size: number;
  subtitle_position: 'top' | 'bottom';
  auto_pause_on_click: boolean;
  auto_pause_after_caption: boolean;
  highlight_unknown_words: boolean;
  show_pronunciation: boolean;
  theme: 'light' | 'dark' | 'auto';
  ai_examples_count: number; // Number of AI examples to generate (10-20)
  repeat_count: number; // Number of times to repeat each caption (1-10)
}

const DEFAULT_SETTINGS: UserSettings = {
  target_language: 'es',
  native_language: 'en',
  subtitle_font_size: 18,
  subtitle_position: 'bottom',
  auto_pause_on_click: false,
  auto_pause_after_caption: false,
  highlight_unknown_words: true,
  show_pronunciation: true,
  theme: 'auto',
  ai_examples_count: 15, // Default to 15 examples
  repeat_count: 1, // Default to 1 (no repeat)
};

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  // SUPABASE DISABLED
  // private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  private settingsSubject = new BehaviorSubject<UserSettings>(DEFAULT_SETTINGS);
  private settingsReadySubject = new BehaviorSubject<boolean>(false);
  private settingsLoadPromise: Promise<void> | null = null;

  settings$ = this.settingsSubject.asObservable();
  ready$ = this.settingsReadySubject.asObservable();

  get currentSettings(): UserSettings {
    return this.settingsSubject.value;
  }

  /**
   * Check if settings are loaded and ready
   */
  get isReady(): boolean {
    return this.settingsReadySubject.value;
  }

  /**
   * Get settings (loads if not already loaded)
   */
  async getSettings(): Promise<UserSettings> {
    await this.loadSettings();
    return this.settingsSubject.value;
  }

  /**
   * Wait for settings to be ready
   */
  async waitForReady(): Promise<UserSettings> {
    if (this.isReady) {
      return this.settingsSubject.value;
    }
    await this.loadSettings();
    return this.settingsSubject.value;
  }

  /**
   * Load settings from chrome.storage.local
   * Uses singleton pattern to avoid multiple concurrent loads
   */
  async loadSettings(): Promise<void> {
    // If already loaded, return immediately
    if (this.settingsReadySubject.value) {
      return;
    }

    // If loading in progress, wait for it
    if (this.settingsLoadPromise) {
      return this.settingsLoadPromise;
    }

    // Start loading
    this.settingsLoadPromise = this.doLoadSettings();
    return this.settingsLoadPromise;
  }

  private async doLoadSettings(): Promise<void> {
    try {
      // Load from local storage
      const localSettings = await this.getLocalSettings();
      if (localSettings) {
        this.settingsSubject.next({ ...DEFAULT_SETTINGS, ...localSettings });
      }

      // =============================================================================
      // SUPABASE DISABLED - Uncomment when ready
      // =============================================================================
      // const user = this.authService.currentUser;
      // if (user) {
      //   try {
      //     const { data, error } = await this.supabase
      //       .from('user_settings')
      //       .select('*')
      //       .eq('user_id', user.id)
      //       .single();
      //
      //     if (data && !error) {
      //       const settings = { ...DEFAULT_SETTINGS, ...data };
      //       this.settingsSubject.next(settings);
      //       await this.saveLocalSettings(settings);
      //     }
      //   } catch (error) {
      //     console.warn('[Kalaama] Failed to load settings from Supabase:', error);
      //   }
      // }
      // =============================================================================

      console.log('[Kalaama] Settings loaded:', this.settingsSubject.value);
    } finally {
      // Mark as ready even if there was an error (we have defaults)
      this.settingsReadySubject.next(true);
    }
  }

  /**
   * Update settings (saves to chrome.storage.local)
   */
  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    const newSettings = { ...this.settingsSubject.value, ...updates };
    this.settingsSubject.next(newSettings);

    // Save to local storage
    await this.saveLocalSettings(newSettings);

    // Broadcast settings change to all YouTube tabs
    try {
      const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            payload: newSettings
          }).catch(() => {}); // Ignore errors for tabs without content script
        }
      }
    } catch (error) {
      console.debug('[Kalaama] Could not broadcast settings:', error);
    }

    console.log('[Kalaama] Settings saved to local storage');

    // =============================================================================
    // SUPABASE DISABLED - Uncomment when ready
    // =============================================================================
    // const user = this.authService.currentUser;
    // if (user) {
    //   try {
    //     await this.supabase.from('user_settings').upsert(
    //       {
    //         user_id: user.id,
    //         ...newSettings,
    //         updated_at: new Date().toISOString(),
    //       },
    //       { onConflict: 'user_id' }
    //     );
    //   } catch (error) {
    //     console.warn('[Kalaama] Failed to sync settings to Supabase:', error);
    //   }
    // }
    // =============================================================================
  }

  /**
   * Get settings from local chrome storage
   */
  private async getLocalSettings(): Promise<Partial<UserSettings> | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        resolve(result['settings'] || null);
      });
    });
  }

  /**
   * Save settings to local chrome storage
   */
  private async saveLocalSettings(settings: UserSettings): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ settings: settings }, resolve);
    });
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    this.settingsSubject.next(DEFAULT_SETTINGS);
    await this.saveLocalSettings(DEFAULT_SETTINGS);
    console.log('[Kalaama] Settings reset to defaults');
  }
}
