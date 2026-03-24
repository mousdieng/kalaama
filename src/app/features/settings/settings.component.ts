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

        <div class="space-y-4">
          <!-- AI Examples Count -->
          <div>
            <label class="block text-sm text-slate-500 mb-1">
              AI Examples Count: {{ settings.ai_examples_count }}
            </label>
            <input
              type="range"
              [(ngModel)]="settings.ai_examples_count"
              (change)="saveSettings()"
              min="10"
              max="20"
              step="1"
              class="w-full"
            />
            <p class="text-xs text-slate-400 mt-1">
              Number of example sentences to generate for vocabulary words
            </p>
          </div>

          <p class="text-xs text-slate-500">
            AI powers word definitions, language tutoring, and voice conversation features.
            API keys are configured via environment variables.
          </p>
        </div>
      </div>

      <!-- Reading Mode Settings -->
      <div class="card">
        <h2 class="font-semibold mb-3">Reading Mode</h2>

        <div class="space-y-3">
          <label class="flex items-center justify-between">
            <div>
              <span class="text-sm">Grammar Highlighting</span>
              <p class="text-xs text-slate-400">Color-code words by part of speech</p>
            </div>
            <input
              type="checkbox"
              [(ngModel)]="readingSettings.grammar_highlighting"
              (change)="saveReadingSettings()"
              class="w-5 h-5 rounded text-primary-500"
            />
          </label>

          <div *ngIf="readingSettings.grammar_highlighting">
            <label class="block text-sm text-slate-500 mb-1">Highlight Style</label>
            <select
              [(ngModel)]="readingSettings.grammar_style"
              (change)="saveReadingSettings()"
              class="input"
            >
              <option value="color">Text Color</option>
              <option value="underline">Underline</option>
              <option value="background">Background</option>
            </select>
          </div>

          <label class="flex items-center justify-between">
            <div>
              <span class="text-sm">Show Grammar Legend</span>
              <p class="text-xs text-slate-400">Display color meanings on page</p>
            </div>
            <input
              type="checkbox"
              [(ngModel)]="readingSettings.grammar_legend"
              (change)="saveReadingSettings()"
              class="w-5 h-5 rounded text-primary-500"
            />
          </label>

          <p class="text-xs text-slate-500">
            Reading mode lets you click any word on web pages to translate it and save to vocabulary.
          </p>
        </div>
      </div>

      <!-- Voice & Learning Settings -->
      <div class="card">
        <h2 class="font-semibold mb-3">Voice Learning</h2>

        <div class="space-y-4">
          <!-- Voice Selection -->
          <div>
            <label class="block text-sm text-slate-500 mb-1">AI Tutor Voice</label>
            <select
              [(ngModel)]="voiceSettings.voiceId"
              (change)="saveVoiceSettings()"
              class="input"
            >
              <option value="EXAVITQu4vr4xnSDxMaL">Sarah (Female, Warm)</option>
              <option value="ErXwobaYiN019PkySvjV">Antoni (Male, Clear)</option>
              <option value="MF3mGyEYCl7XYWbV9V6O">Emily (Female, Soft)</option>
              <option value="TxGEqnHWrfWFTfGW9XjX">Josh (Male, Deep)</option>
              <option value="pNInz6obpgDQGcFmaJgB">Adam (Male, Narrator)</option>
            </select>
          </div>

          <!-- Speech Rate -->
          <div>
            <label class="block text-sm text-slate-500 mb-1">
              Speech Speed: {{ voiceSettings.speed }}x
            </label>
            <input
              type="range"
              [(ngModel)]="voiceSettings.speed"
              (change)="saveVoiceSettings()"
              min="0.5"
              max="1.5"
              step="0.1"
              class="w-full"
            />
          </div>

          <p class="text-xs text-slate-500">
            Voice learning lets you practice speaking with an AI tutor who responds in natural speech.
            ElevenLabs API key configured via environment variables.
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
    ai_examples_count: 15,
    repeat_count: 1,
  };

  // Voice settings
  voiceSettings = {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - default voice
    speed: 1.0,
  };

  // Reading mode settings
  readingSettings = {
    grammar_highlighting: false,
    grammar_style: 'color' as 'color' | 'underline' | 'background',
    grammar_legend: true,
  };

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

    // Load voice and reading settings
    await this.loadVoiceAndReadingSettings();
  }

  async saveSettings(): Promise<void> {
    await this.settingsService.updateSettings(this.settings);
  }

  private async loadVoiceAndReadingSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        'voice_settings',
        'reading_settings',
      ]);

      if (result['voice_settings']) {
        this.voiceSettings = { ...this.voiceSettings, ...result['voice_settings'] };
      }
      if (result['reading_settings']) {
        this.readingSettings = { ...this.readingSettings, ...result['reading_settings'] };
      }
    } catch (error) {
      console.warn('[Settings] Failed to load settings:', error);
    }
  }

  async saveReadingSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({ reading_settings: this.readingSettings });
      // Also update the main settings object for content script consumption
      await this.settingsService.updateSettings({
        ...this.settings,
        grammar_highlighting: this.readingSettings.grammar_highlighting,
        grammar_style: this.readingSettings.grammar_style,
        grammar_legend: this.readingSettings.grammar_legend,
      } as any);
      console.log('[Settings] Reading settings saved:', this.readingSettings);
    } catch (error) {
      console.error('[Settings] Failed to save reading settings:', error);
    }
  }

  async saveVoiceSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({ voice_settings: this.voiceSettings });
      console.log('[Settings] Voice settings saved:', this.voiceSettings);
    } catch (error) {
      console.error('[Settings] Failed to save voice settings:', error);
    }
  }
}
