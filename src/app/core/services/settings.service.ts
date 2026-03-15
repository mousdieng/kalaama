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
  highlight_unknown_words: boolean;
  show_pronunciation: boolean;
  theme: 'light' | 'dark' | 'auto';
}

const DEFAULT_SETTINGS: UserSettings = {
  target_language: 'es',
  native_language: 'en',
  subtitle_font_size: 18,
  subtitle_position: 'bottom',
  auto_pause_on_click: false,
  highlight_unknown_words: true,
  show_pronunciation: true,
  theme: 'auto',
};

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  // SUPABASE DISABLED
  // private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  private settingsSubject = new BehaviorSubject<UserSettings>(DEFAULT_SETTINGS);

  settings$ = this.settingsSubject.asObservable();

  get currentSettings(): UserSettings {
    return this.settingsSubject.value;
  }

  /**
   * Get settings (loads if not already loaded)
   */
  async getSettings(): Promise<UserSettings> {
    await this.loadSettings();
    return this.settingsSubject.value;
  }

  /**
   * Load settings from chrome.storage.local
   */
  async loadSettings(): Promise<void> {
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

    console.log('[Kalaama] Settings loaded from local storage');
  }

  /**
   * Update settings (saves to chrome.storage.local)
   */
  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    const newSettings = { ...this.settingsSubject.value, ...updates };
    this.settingsSubject.next(newSettings);

    // Save to local storage
    await this.saveLocalSettings(newSettings);

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
      chrome.storage.local.get(['user_settings'], (result) => {
        resolve(result['user_settings'] || null);
      });
    });
  }

  /**
   * Save settings to local chrome storage
   */
  private async saveLocalSettings(settings: UserSettings): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ user_settings: settings }, resolve);
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
