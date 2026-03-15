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
    highlight_unknown_words: true,
    show_pronunciation: true,
    theme: 'auto',
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
  }

  async saveSettings(): Promise<void> {
    await this.settingsService.updateSettings(this.settings);
  }
}
