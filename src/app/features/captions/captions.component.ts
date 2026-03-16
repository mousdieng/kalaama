import { Component, OnInit, OnDestroy, inject, NgZone, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingService, WordContextResponse } from '../../core/services/messaging.service';
import { SettingsService, UserSettings } from '../../core/services/settings.service';
import { VocabularyService } from '../../core/services/vocabulary.service';

interface SubtitleCue {
  text: string;
  words?: { word: string; index: number }[];
  startTime: number;
  endTime: number;
}

interface CaptionCue {
  text: string;
  words?: { word: string; index: number }[];
  start: number;
  end: number;
  translatedText?: string | null;
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
  templateUrl: './captions.component.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
      position: relative;
    }
  `]
})
export class CaptionsComponent implements OnInit, OnDestroy {
  @ViewChild('lyricsContainer') lyricsContainer!: ElementRef<HTMLDivElement>;

  private messagingService = inject(MessagingService);
  private settingsService = inject(SettingsService);
  private vocabularyService = inject(VocabularyService);
  private ngZone = inject(NgZone);

  isConnected = false;
  hasCaptions = false;
  statusText = 'Waiting for video...';
  videoInfo: VideoInfo = { videoId: null, title: null, language: null };

  // Lyrics-style display
  allCaptions: SubtitleCue[] = [];
  translatedCaptions: SubtitleCue[] = [];
  currentCueIndex = -1;
  currentCue: CaptionCue | null = null;

  // Caption translation (full line)
  captionTranslation: string | null = null;
  isTranslatingCaption = false;
  private lastTranslatedText: string | null = null;

  // Word translation
  selectedWord: string | null = null;
  translation: string | null = null;
  translationError: string | null = null;
  isTranslating = false;
  isSaving = false;
  showSavedToast = false;

  // AI word context
  wordContext: WordContextResponse | null = null;
  isLoadingContext = false;

  // Settings
  private settings: UserSettings = {
    target_language: 'es',
    native_language: 'en',
    subtitle_font_size: 18,
    subtitle_position: 'bottom',
    auto_pause_on_click: false,
    auto_pause_after_caption: false,
    highlight_unknown_words: true,
    show_pronunciation: true,
    theme: 'auto'
  };
  private settingsLoaded = false;
  private settingsPromise: Promise<void> | null = null;
  private videoPausedByUs = false;

  // Auto-scroll (always center current caption)

  async ngOnInit() {
    // IMPORTANT: Load settings FIRST and wait for them
    this.settingsPromise = this.loadSettings();
    await this.settingsPromise;
    this.settingsLoaded = true;

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
    // Cleanup if needed
  }

  private async loadSettings(): Promise<void> {
    try {
      const loadedSettings = await this.settingsService.waitForReady();
      if (loadedSettings) {
        this.settings = { ...this.settings, ...loadedSettings };
        console.log('[Captions] Settings loaded:', this.settings);
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
      this.allCaptions = [];
      this.translatedCaptions = [];
      this.currentCueIndex = -1;
      this.currentCue = null;
      this.videoInfo = { videoId: null, title: null, language: null };
    }
  }

  private handleMessage(message: { type: string; payload?: any }) {
    switch (message.type) {
      case 'ALL_CAPTIONS':
        this.handleAllCaptions(message.payload);
        break;
      case 'CUE_INDEX_CHANGE':
        this.handleCueIndexChange(message.payload);
        break;
      case 'CAPTION_CUE_CHANGE':
        // Legacy support - handle old cue change format
        this.handleLegacyCueChange(message.payload);
        break;
      case 'VIDEO_INFO':
        this.handleVideoInfo(message.payload);
        break;
      case 'CAPTION_STATUS':
        this.handleCaptionStatus(message.payload);
        break;
    }
  }

  private handleAllCaptions(payload: { captions: SubtitleCue[]; translatedCaptions: SubtitleCue[] }) {
    this.allCaptions = payload.captions || [];
    this.translatedCaptions = payload.translatedCaptions || [];
    this.hasCaptions = this.allCaptions.length > 0;

    // Scroll to current cue after DOM updates
    if (this.currentCueIndex >= 0) {
      setTimeout(() => this.scrollToCurrentCue(), 0);
    }
  }

  private handleCueIndexChange(payload: { currentIndex: number; cue: CaptionCue | null; translatedText?: string | null }) {
    const prevIndex = this.currentCueIndex;
    this.currentCueIndex = payload.currentIndex;
    this.currentCue = payload.cue;

    // Handle auto-pause after caption (when moving to a NEW caption, not -1)
    if (this.settings.auto_pause_after_caption &&
        prevIndex >= 0 &&
        payload.currentIndex >= 0 &&
        prevIndex !== payload.currentIndex) {
      this.messagingService.pauseVideo().catch(() => {});
    }

    // ALWAYS center the current caption in view
    if (this.currentCueIndex >= 0) {
      this.scrollToCurrentCue();
    }

    // Handle caption translation
    if (payload.cue) {
      if (payload.translatedText) {
        this.captionTranslation = payload.translatedText;
        this.lastTranslatedText = payload.cue.text;
        this.isTranslatingCaption = false;
      } else if (payload.cue.text !== this.lastTranslatedText) {
        this.translateCaption(payload.cue.text);
      }
    } else {
      this.captionTranslation = null;
      this.lastTranslatedText = null;
    }
  }

  private handleLegacyCueChange(cue: CaptionCue | null) {
    this.currentCue = cue;
    if (!cue) {
      this.captionTranslation = null;
      this.lastTranslatedText = null;
      return;
    }

    if (cue.translatedText) {
      this.captionTranslation = cue.translatedText;
      this.lastTranslatedText = cue.text;
      this.isTranslatingCaption = false;
    } else if (cue.text !== this.lastTranslatedText) {
      this.translateCaption(cue.text);
    }
  }

  private async translateCaption(text: string) {
    if (!this.settingsLoaded && this.settingsPromise) {
      await this.settingsPromise;
    }

    this.lastTranslatedText = text;
    this.isTranslatingCaption = true;

    try {
      const result = await this.messagingService.translateWord(
        text,
        this.settings.target_language,
        this.settings.native_language
      );
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

  // Parse text into word objects
  parseWords(text: string): { word: string; index: number }[] {
    if (!text) return [];
    return text.split(/\s+/).map((word, index) => ({ word, index }));
  }

  // Navigation methods
  goToPreviousCue(event: Event) {
    event.stopPropagation();
    if (this.currentCueIndex > 0) {
      const prev = this.allCaptions[this.currentCueIndex - 1];
      this.seekToCue(prev.startTime);
    }
  }

  replayCurrentCue(event: Event) {
    event.stopPropagation();
    if (this.currentCueIndex >= 0 && this.currentCueIndex < this.allCaptions.length) {
      const current = this.allCaptions[this.currentCueIndex];
      this.seekToCue(current.startTime);
    }
  }

  goToNextCue(event: Event) {
    event.stopPropagation();
    if (this.currentCueIndex < this.allCaptions.length - 1) {
      const next = this.allCaptions[this.currentCueIndex + 1];
      this.seekToCue(next.startTime);
    }
  }

  async seekToCue(time: number) {
    try {
      await this.messagingService.seekToTime(time);
    } catch (error) {
      console.warn('[Captions] Failed to seek:', error);
    }
  }

  // Scroll to current caption - always centers it
  private scrollToCurrentCue(): void {
    if (!this.lyricsContainer?.nativeElement || this.currentCueIndex < 0) return;

    const activeEl = this.lyricsContainer.nativeElement.querySelector(
      `[data-index="${this.currentCueIndex}"]`
    );

    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Word click handler
  async onWordClick(word: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const cleanWord = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!cleanWord) return;

    if (!this.settingsLoaded && this.settingsPromise) {
      await this.settingsPromise;
    }

    // Pause video when clicking on a word
    try {
      await this.messagingService.pauseVideo();
      this.videoPausedByUs = true;
    } catch (error) {
      console.warn('[Captions] Could not pause video:', error);
    }

    this.selectedWord = cleanWord;
    this.translation = null;
    this.translationError = null;
    this.wordContext = null;
    this.isTranslating = true;
    this.isLoadingContext = true;

    // Try to get AI context first (includes translation)
    try {
      const context = await this.messagingService.getWordContext(
        cleanWord,
        this.currentCue?.text || '',
        this.settings.target_language,
        this.settings.native_language
      );
      console.log('[Captions] Received word context:', context);
      this.wordContext = context;
      this.translation = context.translation;
      this.isLoadingContext = false;
    } catch (error: any) {
      console.warn('[Captions] AI context failed, using basic translation:', error);
      this.isLoadingContext = false;
      // Fall back to basic translation
      try {
        const result = await this.messagingService.translateWord(
          cleanWord,
          this.settings.target_language,
          this.settings.native_language
        );
        this.translation = result.translation;
      } catch (translateError: any) {
        this.translationError = translateError.message || 'Translation failed';
      }
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
        language: this.settings.target_language,
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
    // Resume video if we paused it
    if (this.videoPausedByUs) {
      this.messagingService.playVideo().catch(() => {});
      this.videoPausedByUs = false;
    }

    this.selectedWord = null;
    this.translation = null;
    this.translationError = null;
    this.wordContext = null;
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
