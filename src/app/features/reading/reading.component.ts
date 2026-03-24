import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessagingService, WordContextResponse } from '../../core/services/messaging.service';
import { SettingsService, UserSettings } from '../../core/services/settings.service';
import { VocabularyService } from '../../core/services/vocabulary.service';

interface PageInfo {
  title: string;
  url: string;
  language: string;
}

@Component({
  selector: 'app-reading',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reading.component.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
      position: relative;
    }
  `]
})
export class ReadingComponent implements OnInit, OnDestroy {
  private messagingService = inject(MessagingService);
  private settingsService = inject(SettingsService);
  private vocabularyService = inject(VocabularyService);
  private ngZone = inject(NgZone);

  // Reading mode state
  isEnabled = false;
  isLoading = false;
  pageInfo: PageInfo = { title: '', url: '', language: '' };
  statusText = 'Open any web page to start reading';

  // Grammar highlighting
  grammarHighlighting = false;

  // Word translation state
  selectedWord: string | null = null;
  sentence: string | null = null;
  translation: string | null = null;
  translationError: string | null = null;
  isTranslating = false;
  isSaving = false;
  showSavedToast = false;

  // AI word context
  wordContext: WordContextResponse | null = null;
  isLoadingContext = false;

  // AI examples (10-20 examples)
  aiExamples: string[] = [];
  isLoadingAIExamples = false;

  // Settings
  private settings: UserSettings = {
    target_language: 'de',
    native_language: 'en',
    subtitle_font_size: 18,
    subtitle_position: 'bottom',
    auto_pause_on_click: false,
    auto_pause_after_caption: false,
    highlight_unknown_words: true,
    show_pronunciation: true,
    theme: 'auto',
    ai_examples_count: 15,
    repeat_count: 1
  };
  private settingsLoaded = false;
  private settingsPromise: Promise<void> | null = null;

  // Subscriptions
  private settingsSubscription: Subscription | null = null;
  private messageUnsubscribe: (() => void) | null = null;

  async ngOnInit() {
    // Load settings first
    this.settingsPromise = this.loadSettings();
    await this.settingsPromise;
    this.settingsLoaded = true;

    // Subscribe to settings changes
    this.settingsSubscription = this.settingsService.settings$.subscribe((settings) => {
        this.settings = { ...this.settings, ...settings };
    });

    // Listen for messages forwarded by service worker (not directly from content scripts)
    this.messageUnsubscribe = this.messagingService.onMessage((message, sender) => {
      // Ignore messages from content scripts (sender.tab exists)
      // Only process messages forwarded by the service worker (no sender.tab)
      if (sender.tab) {
        return; // Message came directly from content script, ignore it
      }
      this.ngZone.run(() => {
        this.handleMessage(message);
      });
    });

    // Check current page status
    this.checkCurrentPage();
  }

  ngOnDestroy() {
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
    if (this.messageUnsubscribe) {
      this.messageUnsubscribe();
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const loadedSettings = await this.settingsService.waitForReady();
      if (loadedSettings) {
        this.settings = { ...this.settings, ...loadedSettings };
        this.grammarHighlighting = (loadedSettings as any).grammar_highlighting || false;
      }
    } catch (error) {
      console.warn('[Reading] Failed to load settings:', error);
    }
  }

  private async checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.url) {
        this.statusText = 'Open a web page to start reading';
        return;
      }

      // Check for restricted URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        this.statusText = 'Cannot use on browser pages';
        return;
      }

      if (tab.url.includes('youtube.com')) {
        this.statusText = 'Use Captions tab for YouTube';
        return;
      }

      // Set page info from tab
      this.pageInfo = {
        title: tab.title || '',
        url: tab.url,
        language: ''
      };

      // Try to get status from content script
      if (tab.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_READING_MODE_STATUS' });
          if (response) {
            this.isEnabled = response.enabled;
            this.statusText = this.isEnabled ? 'Reading mode active - click any word!' : 'Click Enable to start';
          }
        } catch (error) {
          // Content script not loaded yet - that's OK, user can click Enable
          this.statusText = 'Click Enable to start reading';
        }
      }
    } catch (error) {
      console.warn('[Reading] Failed to check current page:', error);
      this.statusText = 'Open a web page to start reading';
    }
  }

  private handleMessage(message: { type: string; payload?: any }) {
    switch (message.type) {
      case 'READING_PAGE_INFO':
        this.handlePageInfo(message.payload);
        break;
      case 'READING_MODE_STATUS':
        this.handleModeStatus(message.payload);
        break;
      case 'READING_WORD_CLICK':
        this.handleWordClick(message.payload);
        break;
    }
  }

  private handlePageInfo(payload: PageInfo) {
    this.pageInfo = payload;
    this.statusText = this.isEnabled ? 'Reading mode active' : 'Click Enable to start';
  }

  private handleModeStatus(payload: { enabled: boolean }) {
    this.isEnabled = payload.enabled;
    this.statusText = this.isEnabled ? 'Reading mode active' : 'Click Enable to start';
  }

  private async handleWordClick(payload: { word: string; sentence: string; pageUrl: string; pageTitle: string }) {
    if (!this.settingsLoaded && this.settingsPromise) {
      await this.settingsPromise;
    }

    this.selectedWord = payload.word;
    this.sentence = payload.sentence;
    this.translation = null;
    this.translationError = null;
    this.wordContext = null;
    this.aiExamples = [];
    this.isTranslating = true;
    this.isLoadingContext = true;
    this.isLoadingAIExamples = true;

    // Try to get AI context first
    try {
      const context = await this.messagingService.getWordContext(
        payload.word,
        payload.sentence,
        this.settings.target_language,
        this.settings.native_language
      );
      this.wordContext = context;
      this.translation = context.translation;
      this.isLoadingContext = false;
    } catch (error: any) {
      this.isLoadingContext = false;
      // Fall back to basic translation
      try {
        const result = await this.messagingService.translateWord(
          payload.word,
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

    // Fetch AI examples (10-20 examples) in parallel
    this.fetchAIExamples(payload.word);
  }

  async toggleReadingMode() {
    this.isLoading = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if we can inject into this tab
      if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
        this.statusText = 'Cannot use on this page type';
        this.isLoading = false;
        return;
      }

      if (tab.url.includes('youtube.com')) {
        this.statusText = 'Use Captions tab for YouTube';
        this.isLoading = false;
        return;
      }

      if (tab?.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_READING_MODE' });
          if (response) {
            this.isEnabled = response.enabled;
            this.statusText = this.isEnabled ? 'Reading mode active - click any word!' : 'Click Enable to start';
          }
        } catch (msgError: any) {
          // Content script might not be loaded, try injecting it
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content/reading-content-script.js']
            });
            await chrome.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['content/reading-styles.css']
            });
            // Try again after injection
            await new Promise(resolve => setTimeout(resolve, 100));
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_READING_MODE' });
            if (response) {
              this.isEnabled = response.enabled;
              this.statusText = this.isEnabled ? 'Reading mode active - click any word!' : 'Click Enable to start';
            }
          } catch (injectError) {
            console.error('[Reading] Failed to inject content script:', injectError);
            this.statusText = 'Refresh page and try again';
          }
        }
      }
    } catch (error) {
      console.error('[Reading] Failed to toggle reading mode:', error);
      this.statusText = 'Failed - refresh page and try again';
    } finally {
      this.isLoading = false;
    }
  }

  async toggleGrammarHighlighting() {
    this.grammarHighlighting = !this.grammarHighlighting;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const messageType = this.grammarHighlighting ? 'ENABLE_GRAMMAR_HIGHLIGHTING' : 'DISABLE_GRAMMAR_HIGHLIGHTING';
        await chrome.tabs.sendMessage(tab.id, { type: messageType });
      }
      // Save setting
      await this.settingsService.updateSettings({ grammar_highlighting: this.grammarHighlighting } as any);
    } catch (error) {
      console.error('[Reading] Failed to toggle grammar highlighting:', error);
    }
  }

  async saveWord() {
    if (!this.selectedWord || !this.translation) return;

    this.isSaving = true;
    try {
      // Combine sentence with page info for context
      const contextInfo = this.sentence
        ? `${this.sentence} (from: ${this.pageInfo.title})`
        : `From: ${this.pageInfo.title} - ${this.pageInfo.url}`;

      const savedWord = await this.vocabularyService.addWord({
        word: this.selectedWord,
        translation: this.translation,
        language: this.settings.target_language,
        context_sentence: contextInfo,
        // Save full AI context if available
        definition: this.wordContext?.definition || '',
        part_of_speech: this.wordContext?.partOfSpeech || '',
        examples: this.wordContext?.examples || [],
        pronunciation: this.wordContext?.pronunciation || ''
      });

      // If we have AI examples loaded, save them too
      if (savedWord && this.aiExamples.length > 0) {
        await this.vocabularyService.updateAIExamples(savedWord.id, this.aiExamples);
      }

      this.showSavedToast = true;
      setTimeout(() => this.showSavedToast = false, 2000);
      this.closeTranslation();
    } catch (error) {
      console.error('[Reading] Failed to save word:', error);
    } finally {
      this.isSaving = false;
    }
  }

  closeTranslation() {
    this.selectedWord = null;
    this.sentence = null;
    this.translation = null;
    this.translationError = null;
    this.wordContext = null;
    this.aiExamples = [];
  }

  async fetchAIExamples(word: string): Promise<void> {
    try {
      // First check if word exists in vocabulary with stored AI examples
      const vocabulary = this.vocabularyService.currentVocabulary;
      const existingWord = vocabulary.find(
        (v: any) => v.word.toLowerCase() === word.toLowerCase() && v.language === this.settings.target_language
      );

      if (existingWord?.aiExamples && existingWord.aiExamples.length > 0) {
        this.aiExamples = existingWord.aiExamples;
        this.isLoadingAIExamples = false;
        return;
      }

      // No stored examples, fetch new ones
      const examplesCount = this.settings.ai_examples_count || 15;

      const response = await this.messagingService.getWordExamples(
        word,
        this.settings.target_language,
        this.settings.native_language,
        examplesCount
      );

      this.aiExamples = response.examples;

      // If word exists in vocabulary, update it with the new examples
      if (existingWord) {
        await this.vocabularyService.updateAIExamples(existingWord.id, response.examples);
      }
    } catch (error: any) {
      console.error('[Reading] Failed to fetch AI examples:', error);
      this.aiExamples = [];
    } finally {
      this.isLoadingAIExamples = false;
    }
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
