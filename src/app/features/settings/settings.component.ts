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
          <!-- AI Provider Selection -->
          <div>
            <label class="block text-sm text-slate-500 mb-1">AI Provider for Conversations</label>
            <select
              [(ngModel)]="aiProvider"
              (change)="saveAiProvider()"
              class="input"
            >
              <option value="gemini">Google Gemini (Recommended)</option>
              <option value="openai">OpenAI GPT-4</option>
              <option value="claude">Anthropic Claude</option>
            </select>
          </div>

          <!-- Gemini API Key -->
          <div>
            <label class="block text-sm text-slate-500 mb-1">Google Gemini API Key</label>
            <input
              type="password"
              [(ngModel)]="geminiApiKey"
              (blur)="saveApiKey('gemini')"
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

          <!-- OpenAI API Key (shown when selected) -->
          <div *ngIf="aiProvider === 'openai'">
            <label class="block text-sm text-slate-500 mb-1">OpenAI API Key</label>
            <input
              type="password"
              [(ngModel)]="openaiApiKey"
              (blur)="saveApiKey('openai')"
              class="input"
              placeholder="Enter your OpenAI API key"
            />
            <p class="text-xs text-slate-400 mt-1">
              Get your API key from
              <a href="https://platform.openai.com/api-keys" target="_blank" class="text-indigo-600 hover:underline">
                OpenAI Platform
              </a>
            </p>
          </div>

          <!-- Claude API Key (shown when selected) -->
          <div *ngIf="aiProvider === 'claude'">
            <label class="block text-sm text-slate-500 mb-1">Anthropic Claude API Key</label>
            <input
              type="password"
              [(ngModel)]="claudeApiKey"
              (blur)="saveApiKey('claude')"
              class="input"
              placeholder="Enter your Claude API key"
            />
            <p class="text-xs text-slate-400 mt-1">
              Get your API key from
              <a href="https://console.anthropic.com/settings/keys" target="_blank" class="text-indigo-600 hover:underline">
                Anthropic Console
              </a>
            </p>
          </div>

          <!-- Status indicator -->
          <div *ngIf="hasActiveApiKey()" class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>{{ aiProvider | titlecase }} API key configured</span>
          </div>

          <p class="text-xs text-slate-500">
            AI powers word definitions, language tutoring, and voice conversation features.
          </p>
        </div>
      </div>

      <!-- Voice & Learning Settings -->
      <div class="card">
        <h2 class="font-semibold mb-3">Voice Learning</h2>

        <div class="space-y-4">
          <!-- ElevenLabs API Key -->
          <div>
            <label class="block text-sm text-slate-500 mb-1">ElevenLabs API Key (Text-to-Speech)</label>
            <input
              type="password"
              [(ngModel)]="elevenlabsApiKey"
              (blur)="saveApiKey('elevenlabs')"
              class="input"
              placeholder="Enter your ElevenLabs API key"
            />
            <p class="text-xs text-slate-400 mt-1">
              Get your API key from
              <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" class="text-indigo-600 hover:underline">
                ElevenLabs
              </a>
              for natural AI voice responses.
            </p>
          </div>

          <div *ngIf="elevenlabsApiKey" class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>ElevenLabs configured - voice responses enabled</span>
          </div>

          <!-- Voice Selection (shown when ElevenLabs is configured) -->
          <div *ngIf="elevenlabsApiKey">
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
          <div *ngIf="elevenlabsApiKey">
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

  // API Keys
  geminiApiKey = '';
  openaiApiKey = '';
  claudeApiKey = '';
  elevenlabsApiKey = '';

  // AI Provider selection
  aiProvider: 'gemini' | 'openai' | 'claude' = 'gemini';

  // Voice settings
  voiceSettings = {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - default voice
    speed: 1.0,
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

    // Load all API keys and settings
    await this.loadAllApiKeys();
  }

  async saveSettings(): Promise<void> {
    await this.settingsService.updateSettings(this.settings);
  }

  private async loadAllApiKeys(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        'gemini_api_key',
        'openai_api_key',
        'claude_api_key',
        'elevenlabs_api_key',
        'ai_provider',
        'voice_settings',
      ]);

      if (result['gemini_api_key']) {
        this.geminiApiKey = result['gemini_api_key'];
      }
      if (result['openai_api_key']) {
        this.openaiApiKey = result['openai_api_key'];
      }
      if (result['claude_api_key']) {
        this.claudeApiKey = result['claude_api_key'];
      }
      if (result['elevenlabs_api_key']) {
        this.elevenlabsApiKey = result['elevenlabs_api_key'];
      }
      if (result['ai_provider']) {
        this.aiProvider = result['ai_provider'];
      }
      if (result['voice_settings']) {
        this.voiceSettings = { ...this.voiceSettings, ...result['voice_settings'] };
      }
    } catch (error) {
      console.warn('[Settings] Failed to load API keys:', error);
    }
  }

  async saveApiKey(provider: 'gemini' | 'openai' | 'claude' | 'elevenlabs'): Promise<void> {
    try {
      const keyMap: Record<string, string> = {
        gemini: this.geminiApiKey,
        openai: this.openaiApiKey,
        claude: this.claudeApiKey,
        elevenlabs: this.elevenlabsApiKey,
      };

      await chrome.storage.local.set({ [`${provider}_api_key`]: keyMap[provider] });
      console.log(`[Settings] ${provider} API key saved`);
    } catch (error) {
      console.error(`[Settings] Failed to save ${provider} API key:`, error);
    }
  }

  async saveAiProvider(): Promise<void> {
    try {
      await chrome.storage.local.set({ ai_provider: this.aiProvider });
      console.log('[Settings] AI provider saved:', this.aiProvider);
    } catch (error) {
      console.error('[Settings] Failed to save AI provider:', error);
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

  hasActiveApiKey(): boolean {
    switch (this.aiProvider) {
      case 'gemini':
        return !!this.geminiApiKey;
      case 'openai':
        return !!this.openaiApiKey;
      case 'claude':
        return !!this.claudeApiKey;
      default:
        return false;
    }
  }
}
