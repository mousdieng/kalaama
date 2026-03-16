import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, UserSettings } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 space-y-4 animate-fade-in">
      <h1 class="text-xl font-bold mb-4">Settings</h1>

      <!-- Language Settings -->
      <div class="card">
        <h2 class="font-semibold mb-3">Languages</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-slate-500 mb-1">I'm learning</label>
            <select
              [(ngModel)]="settings.target_language"
              (change)="saveSettings()"
              class="input"
            >
              @for (lang of languages; track lang.code) {
                <option [value]="lang.code">{{ lang.flag }} {{ lang.name }}</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-sm text-slate-500 mb-1">My native language</label>
            <select
              [(ngModel)]="settings.native_language"
              (change)="saveSettings()"
              class="input"
            >
              @for (lang of languages; track lang.code) {
                <option [value]="lang.code">{{ lang.flag }} {{ lang.name }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Subtitle Settings -->
      <div class="card">
        <h2 class="font-semibold mb-3">Subtitles</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-slate-500 mb-1">
              Font size: {{ settings.subtitle_font_size }}px
            </label>
            <input
              type="range"
              [(ngModel)]="settings.subtitle_font_size"
              (change)="saveSettings()"
              min="12"
              max="32"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm text-slate-500 mb-1">Position</label>
            <select
              [(ngModel)]="settings.subtitle_position"
              (change)="saveSettings()"
              class="input"
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Behavior Settings -->
      <div class="card">
        <h2 class="font-semibold mb-3">Behavior</h2>

        <div class="space-y-3">
          <label class="flex items-center justify-between">
            <span class="text-sm">Pause video when clicking a word</span>
            <input
              type="checkbox"
              [(ngModel)]="settings.auto_pause_on_click"
              (change)="saveSettings()"
              class="w-5 h-5 rounded text-primary-500"
            />
          </label>

          <label class="flex items-center justify-between">
            <span class="text-sm">Pause after each caption (learning mode)</span>
            <input
              type="checkbox"
              [(ngModel)]="settings.auto_pause_after_caption"
              (change)="saveSettings()"
              class="w-5 h-5 rounded text-primary-500"
            />
          </label>

          <label class="flex items-center justify-between">
            <span class="text-sm">Highlight unknown words</span>
            <input
              type="checkbox"
              [(ngModel)]="settings.highlight_unknown_words"
              (change)="saveSettings()"
              class="w-5 h-5 rounded text-primary-500"
            />
          </label>

          <label class="flex items-center justify-between">
            <span class="text-sm">Show pronunciation</span>
            <input
              type="checkbox"
              [(ngModel)]="settings.show_pronunciation"
              (change)="saveSettings()"
              class="w-5 h-5 rounded text-primary-500"
            />
          </label>
        </div>
      </div>

      <!-- Theme Settings -->
      <div class="card">
        <h2 class="font-semibold mb-3">Appearance</h2>

        <div>
          <label class="block text-sm text-slate-500 mb-1">Theme</label>
          <select
            [(ngModel)]="settings.theme"
            (change)="saveSettings()"
            class="input"
          >
            <option value="auto">System Default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <!-- AI Settings -->
      <div class="card">
        <h2 class="font-semibold mb-3">AI Features</h2>

        <div class="space-y-3">
          <div>
            <label class="block text-sm text-slate-500 mb-1">Google Gemini API Key</label>
            <input
              type="password"
              [(ngModel)]="geminiApiKey"
              (blur)="saveGeminiKey()"
              class="input"
              placeholder="Enter your Gemini API key"
            />
            <p class="text-xs text-slate-400 mt-1">
              Get your free API key from
              <a href="https://makersuite.google.com/app/apikey" target="_blank" class="text-indigo-600 hover:underline">
                Google AI Studio
              </a>
            </p>
          </div>

          <div *ngIf="geminiApiKey" class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>API key configured</span>
          </div>

          <p class="text-xs text-slate-500">
            With an API key, you'll get detailed word definitions, examples, and pronunciation when clicking on words.
          </p>
        </div>
      </div>

      <!-- Version -->
      <div class="text-center text-sm text-slate-400 pt-4">
        Kalaama v1.0.0
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);

  settings: UserSettings = {
    target_language: 'es',
    native_language: 'en',
    subtitle_font_size: 18,
    subtitle_position: 'bottom',
    auto_pause_on_click: false,
    auto_pause_after_caption: false,
    highlight_unknown_words: true,
    show_pronunciation: true,
    theme: 'auto',
  };

  geminiApiKey = '';

  languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'wo', name: 'Wolof', flag: '🇸🇳' },
  ];

  async ngOnInit(): Promise<void> {
    await this.settingsService.loadSettings();
    this.settingsService.settings$.subscribe((settings) => {
      this.settings = { ...settings };
    });

    // Load Gemini API key
    await this.loadGeminiKey();
  }

  async saveSettings(): Promise<void> {
    await this.settingsService.updateSettings(this.settings);
  }

  private async loadGeminiKey(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('gemini_api_key');
      if (result['gemini_api_key']) {
        this.geminiApiKey = result['gemini_api_key'];
      }
    } catch (error) {
      console.warn('[Settings] Failed to load Gemini API key:', error);
    }
  }

  async saveGeminiKey(): Promise<void> {
    try {
      await chrome.storage.local.set({ gemini_api_key: this.geminiApiKey });
      console.log('[Settings] Gemini API key saved');
    } catch (error) {
      console.error('[Settings] Failed to save Gemini API key:', error);
    }
  }
}
