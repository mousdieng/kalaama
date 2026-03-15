import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingService } from '../../core/services/messaging.service';
import { SettingsService } from '../../core/services/settings.service';
import { VocabularyService } from '../../core/services/vocabulary.service';

interface CaptionCue {
  text: string;
  words?: { word: string; index: number }[];
  start: number;
  end: number;
  translatedText?: string | null;  // From native language track
}

interface VideoInfo {
  videoId: string | null;
  title: string | null;
  language: string | null;
}

@Component({
  selector: 'app-captions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full">
      <!-- Connection Status -->
      <div class="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full"
          [class.bg-green-500]="isConnected"
          [class.bg-slate-400]="!isConnected"
        ></span>
        <span class="text-sm text-slate-600 dark:text-slate-400">
          {{ statusText }}
        </span>
      </div>

      <!-- Video Info -->
      <div *ngIf="videoInfo.title" class="px-4 py-2 bg-slate-100 dark:bg-slate-800">
        <p class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
          {{ videoInfo.title }}
        </p>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Language: {{ getLanguageName(videoInfo.language) }}
        </p>
      </div>

      <!-- Caption Display -->
      <div class="flex-1 p-4 overflow-y-auto">
        <div *ngIf="!currentCue" class="text-center text-slate-500 dark:text-slate-400 py-8">
          <p *ngIf="isConnected && hasCaptions">No caption at this moment...</p>
          <p *ngIf="isConnected && !hasCaptions">No captions available for this video</p>
          <p *ngIf="!isConnected">Open a YouTube video to start learning</p>
        </div>

        <div *ngIf="currentCue" class="space-y-3">
          <!-- Original caption -->
          <div class="text-lg leading-relaxed">
            <span
              *ngFor="let wordObj of getWords()"
              class="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-0.5 rounded"
              [class.bg-indigo-100]="selectedWord === wordObj.word"
              [class.dark:bg-indigo-900]="selectedWord === wordObj.word"
              (click)="onWordClick(wordObj.word)"
            >
              {{ wordObj.word }}
            </span>
          </div>

          <!-- Caption translation -->
          <div class="text-base text-slate-500 dark:text-slate-400 italic border-l-2 border-indigo-300 dark:border-indigo-600 pl-3">
            <span *ngIf="isTranslatingCaption" class="text-slate-400">...</span>
            <span *ngIf="!isTranslatingCaption && captionTranslation">{{ captionTranslation }}</span>
          </div>
        </div>
      </div>

      <!-- Translation Panel -->
      <div
        *ngIf="selectedWord"
        class="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-lg"
      >
        <div class="flex justify-between items-start mb-2">
          <span class="font-semibold text-indigo-600 dark:text-indigo-400">
            {{ selectedWord }}
          </span>
          <button
            (click)="closeTranslation()"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="mb-3">
          <span *ngIf="isTranslating" class="text-slate-500">Translating...</span>
          <span *ngIf="!isTranslating && translation" class="text-slate-700 dark:text-slate-300">
            {{ translation }}
          </span>
          <span *ngIf="!isTranslating && translationError" class="text-red-500">
            {{ translationError }}
          </span>
        </div>

        <div class="flex gap-2">
          <button
            (click)="saveWord()"
            [disabled]="!translation || isSaving"
            class="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {{ isSaving ? 'Saving...' : 'Save Word' }}
          </button>
          <button
            (click)="closeTranslation()"
            class="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm"
          >
            Skip
          </button>
        </div>
      </div>

      <!-- Saved Toast -->
      <div
        *ngIf="showSavedToast"
        class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg text-sm"
      >
        Word saved!
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      position: relative;
    }
  `]
})
export class CaptionsComponent implements OnInit, OnDestroy {
  private messagingService = inject(MessagingService);
  private settingsService = inject(SettingsService);
  private vocabularyService = inject(VocabularyService);
  private ngZone = inject(NgZone);

  isConnected = false;
  hasCaptions = false;
  statusText = 'Waiting for video...';
  currentCue: CaptionCue | null = null;
  videoInfo: VideoInfo = { videoId: null, title: null, language: null };

  // Caption translation (full line)
  captionTranslation: string | null = null;
  isTranslatingCaption = false;
  private lastTranslatedText: string | null = null;

  selectedWord: string | null = null;
  translation: string | null = null;
  translationError: string | null = null;
  isTranslating = false;
  isSaving = false;
  showSavedToast = false;

  private settings = { targetLanguage: 'es', nativeLanguage: 'en' };

  ngOnInit() {
    // Load settings
    this.loadSettings();

    // Listen for messages from content script via service worker
    this.messagingService.onMessage((message) => {
      // Run inside Angular zone to trigger change detection
      this.ngZone.run(() => {
        this.handleMessage(message);
      });
    });

    // Check if there's an active YouTube tab
    this.checkActiveTab();

    // Listen for tab changes
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.onTabChange(activeInfo.tabId);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url && tab.active) {
        this.checkUrl(changeInfo.url);
      }
    });
  }

  ngOnDestroy() {
    // Cleanup listeners if needed
  }

  private async loadSettings() {
    try {
      const settings = await this.settingsService.getSettings();
      if (settings) {
        this.settings.targetLanguage = settings.target_language || 'es';
        this.settings.nativeLanguage = settings.native_language || 'en';
      }
    } catch (error) {
      console.warn('[Captions] Failed to load settings:', error);
    }
  }

  private async checkActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url?.includes('youtube.com/watch')) {
        this.isConnected = true;
        this.statusText = 'Connected';
        // Request current caption state
        if (tab.id) {
          this.messagingService.sendToTab(tab.id, { type: 'GET_CURRENT_CAPTION' }).catch(() => {});
        }
      }
    } catch (error) {
      console.warn('[Captions] Failed to check active tab:', error);
    }
  }

  private async onTabChange(tabId: number) {
    try {
      const tab = await chrome.tabs.get(tabId);
      this.checkUrl(tab.url || '');
      if (tab.url?.includes('youtube.com/watch')) {
        this.messagingService.sendToTab(tabId, { type: 'GET_CURRENT_CAPTION' }).catch(() => {});
      }
    } catch (error) {
      console.warn('[Captions] Tab change error:', error);
    }
  }

  private checkUrl(url: string) {
    if (url.includes('youtube.com/watch')) {
      this.isConnected = true;
      this.statusText = 'Connected';
    } else {
      this.isConnected = false;
      this.statusText = 'Waiting for video...';
      this.currentCue = null;
      this.videoInfo = { videoId: null, title: null, language: null };
    }
  }

  private handleMessage(message: { type: string; payload?: any }) {
    switch (message.type) {
      case 'CAPTION_CUE_CHANGE':
        this.handleCueChange(message.payload);
        break;
      case 'VIDEO_INFO':
        this.handleVideoInfo(message.payload);
        break;
      case 'CAPTION_STATUS':
        this.handleCaptionStatus(message.payload);
        break;
    }
  }

  private handleCueChange(cue: CaptionCue | null) {
    this.currentCue = cue;

    if (!cue) {
      this.captionTranslation = null;
      this.lastTranslatedText = null;
      return;
    }

    // Use native track translation if available (instant, no API)
    if (cue.translatedText) {
      this.captionTranslation = cue.translatedText;
      this.lastTranslatedText = cue.text;
      this.isTranslatingCaption = false;
    }
    // Fall back to API translation if no native track
    else if (cue.text !== this.lastTranslatedText) {
      this.translateCaption(cue.text);
    }
  }

  private async translateCaption(text: string) {
    this.lastTranslatedText = text;
    this.isTranslatingCaption = true;

    try {
      const result = await this.messagingService.translateWord(
        text,
        this.settings.targetLanguage,
        this.settings.nativeLanguage
      );
      // Only update if this is still the current text
      if (this.lastTranslatedText === text) {
        this.captionTranslation = result.translation;
      }
    } catch (error) {
      console.warn('[Captions] Translation failed:', error);
      this.captionTranslation = null;
    } finally {
      this.isTranslatingCaption = false;
    }
  }

  private handleVideoInfo(info: VideoInfo) {
    this.videoInfo = info;
    this.isConnected = true;
    this.statusText = 'Connected';
  }

  private handleCaptionStatus(status: { connected: boolean; hasCaptions: boolean }) {
    this.isConnected = status.connected;
    this.hasCaptions = status.hasCaptions;
    if (status.connected) {
      this.statusText = status.hasCaptions ? 'Captions ready' : 'No captions available';
    }
  }

  getWords(): { word: string; index: number }[] {
    if (!this.currentCue) return [];
    if (this.currentCue.words) return this.currentCue.words;
    return this.currentCue.text.split(/\s+/).map((word, index) => ({ word, index }));
  }

  async onWordClick(word: string) {
    // Clean the word
    const cleanWord = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!cleanWord) return;

    this.selectedWord = cleanWord;
    this.translation = null;
    this.translationError = null;
    this.isTranslating = true;

    try {
      const result = await this.messagingService.translateWord(
        cleanWord,
        this.settings.targetLanguage,
        this.settings.nativeLanguage
      );
      this.translation = result.translation;
    } catch (error: any) {
      this.translationError = error.message || 'Translation failed';
    } finally {
      this.isTranslating = false;
    }
  }

  async saveWord() {
    if (!this.selectedWord || !this.translation) return;

    this.isSaving = true;
    try {
      await this.vocabularyService.addWord({
        word: this.selectedWord,
        translation: this.translation,
        language: this.settings.targetLanguage,
        context_sentence: this.currentCue?.text || '',
        video_id: this.videoInfo.videoId || undefined,
        video_title: this.videoInfo.title || undefined
      });

      this.showSavedToast = true;
      setTimeout(() => this.showSavedToast = false, 2000);
      this.closeTranslation();
    } catch (error) {
      console.error('[Captions] Failed to save word:', error);
    } finally {
      this.isSaving = false;
    }
  }

  closeTranslation() {
    this.selectedWord = null;
    this.translation = null;
    this.translationError = null;
  }

  getLanguageName(code: string | null): string {
    if (!code) return 'Unknown';
    const languages: Record<string, string> = {
      en: 'English', es: 'Spanish', fr: 'French', de: 'German',
      it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
      ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof',
      'de-DE': 'German', 'en-US': 'English', 'es-ES': 'Spanish',
      'fr-FR': 'French', 'pt-BR': 'Portuguese'
    };
    return languages[code] || code;
  }
}
