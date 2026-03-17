import { Injectable } from '@angular/core';

/**
 * VoiceService handles speech recognition using the Web Speech API
 * This is available in Chrome and other modern browsers
 */

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

// Global type for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private isListeningInternal = false;

  // Use content script for voice recognition (has mic permission on youtube.com)
  private useContentScript = true;

  // Map language codes to speech recognition locale codes
  private languageMap: Record<string, string> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    it: 'it-IT',
    pt: 'pt-PT',
    ru: 'ru-RU',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ko: 'ko-KR',
    ar: 'ar-SA',
    wo: 'wo-SN', // Wolof might not be fully supported
  };

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    // We primarily use content script for voice, but keep local as fallback
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('[VoiceService] Speech Recognition not supported locally, using content script');
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.isListeningInternal;
  }

  /**
   * Start listening and return a promise with the final transcript
   * Uses content script on YouTube pages (has mic permission)
   * @param language - Language code (e.g., 'es', 'fr')
   * @returns Promise that resolves with the final transcript
   */
  async listen(language: string): Promise<string> {
    if (this.isListeningInternal) {
      throw new Error('Already listening');
    }

    this.isListeningInternal = true;

    // Try content script first (runs on youtube.com where mic is permitted)
    if (this.useContentScript) {
      try {
        const result = await this.listenViaContentScript(language);
        this.isListeningInternal = false;
        return result;
      } catch (err: any) {
        console.warn('[VoiceService] Content script voice failed:', err.message);
        this.isListeningInternal = false;
        throw err;
      }
    }

    // Fallback to local recognition
    return this.listenLocal(language);
  }

  /**
   * Listen via content script (runs on YouTube where mic permission is granted)
   */
  private async listenViaContentScript(language: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Send message to content script on active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
          reject(new Error('No active tab'));
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'VOICE_START', payload: { language } },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (response?.success) {
              resolve(response.transcript);
            } else {
              reject(new Error(response?.error || 'Voice recognition failed'));
            }
          }
        );
      });
    });
  }

  /**
   * Local speech recognition (fallback)
   */
  private listenLocal(language: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      // Set language
      this.recognition.lang = this.languageMap[language] || language;

      let finalTranscript = '';
      let timeoutId: ReturnType<typeof setTimeout>;

      // Handle results
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        console.log('[VoiceService] Interim:', interimTranscript, 'Final:', finalTranscript);
      };

      // Handle errors
      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[VoiceService] Error:', event.error);
        this.isListeningInternal = false;
        clearTimeout(timeoutId);

        if (event.error === 'no-speech') {
          reject(new Error('no-speech'));
        } else if (event.error === 'audio-capture') {
          reject(new Error('Microphone not available. Please check permissions.'));
        } else if (event.error === 'not-allowed') {
          reject(new Error('Microphone access denied. Please allow microphone permissions.'));
        } else {
          reject(new Error(event.error));
        }
      };

      // Handle end
      this.recognition.onend = () => {
        console.log('[VoiceService] Recognition ended, transcript:', finalTranscript);
        this.isListeningInternal = false;
        clearTimeout(timeoutId);

        if (finalTranscript.trim()) {
          resolve(finalTranscript.trim());
        } else {
          reject(new Error('no-speech'));
        }
      };

      // Handle start
      this.recognition.onstart = () => {
        console.log('[VoiceService] Recognition started');
        this.isListeningInternal = true;
      };

      // Set timeout to auto-stop after 10 seconds
      timeoutId = setTimeout(() => {
        if (this.isListeningInternal) {
          console.log('[VoiceService] Timeout, stopping');
          this.stopListening();
        }
      }, 10000);

      // Start recognition
      try {
        this.recognition.start();
      } catch (err) {
        console.error('[VoiceService] Failed to start:', err);
        this.isListeningInternal = false;
        clearTimeout(timeoutId);
        reject(new Error('Failed to start speech recognition'));
      }
    });
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    // Stop via content script
    if (this.useContentScript) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'VOICE_STOP' }).catch(() => {});
        }
      });
    }

    // Also stop local recognition if active
    if (this.recognition && this.isListeningInternal) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('[VoiceService] Error stopping:', err);
      }
    }
    this.isListeningInternal = false;
  }

  /**
   * Abort recognition (discard results)
   */
  abort(): void {
    if (this.recognition && this.isListeningInternal) {
      try {
        this.recognition.abort();
      } catch (err) {
        console.warn('[VoiceService] Error aborting:', err);
      }
      this.isListeningInternal = false;
    }
  }

  /**
   * Request microphone permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks to release the microphone
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err: any) {
      // Don't log dismissed prompts as errors - they're expected user behavior
      if (err?.message?.includes('dismissed')) {
        console.log('[VoiceService] Permission prompt dismissed by user');
      } else {
        console.warn('[VoiceService] Permission not granted:', err?.message || err);
      }
      return false;
    }
  }

  /**
   * Check microphone permission status without prompting
   * Returns: 'granted', 'denied', or 'prompt' (not yet asked)
   */
  async checkPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      // Use Permissions API if available
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state as 'granted' | 'denied' | 'prompt';
      }
      // Fallback: try to access media devices
      // This will trigger the permission prompt if not yet asked
      return 'prompt';
    } catch (err) {
      console.warn('[VoiceService] Cannot check permission status:', err);
      return 'prompt';
    }
  }

  /**
   * Request permission and check status
   * Uses content script to check (runs on youtube.com where we have permission)
   */
  async ensurePermission(): Promise<{ status: 'granted' | 'denied' | 'prompt'; message: string; needsManualGrant?: boolean }> {
    // Check via content script (on youtube.com)
    if (this.useContentScript) {
      try {
        const hasPermission = await this.checkPermissionViaContentScript();
        if (hasPermission) {
          return { status: 'granted', message: 'Microphone access granted via YouTube' };
        }
        return {
          status: 'denied',
          message: 'Autorisez le microphone pour youtube.com en cliquant sur l\'icône du cadenas.',
          needsManualGrant: true
        };
      } catch (err: any) {
        // Content script not available, check if we're on YouTube
        console.warn('[VoiceService] Content script check failed:', err.message);
        return {
          status: 'denied',
          message: 'Veuillez ouvrir une vidéo YouTube pour utiliser la reconnaissance vocale.',
          needsManualGrant: true
        };
      }
    }

    // Fallback to local check
    const currentStatus = await this.checkPermissionStatus();

    if (currentStatus === 'granted') {
      return { status: 'granted', message: 'Microphone access granted' };
    }

    if (currentStatus === 'denied') {
      return {
        status: 'denied',
        message: 'Accès au microphone bloqué.',
        needsManualGrant: true
      };
    }

    return {
      status: 'prompt',
      message: 'Autorisation du microphone requise.',
      needsManualGrant: false
    };
  }

  /**
   * Check permission via content script (runs on youtube.com)
   */
  private checkPermissionViaContentScript(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
          reject(new Error('No active tab'));
          return;
        }

        // Check if we're on YouTube
        if (!tabs[0].url?.includes('youtube.com')) {
          reject(new Error('Not on YouTube'));
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'VOICE_CHECK_PERMISSION' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response?.hasPermission === true);
          }
        );
      });
    });
  }

  /**
   * Get supported language codes
   */
  getSupportedLanguages(): string[] {
    return Object.keys(this.languageMap);
  }

  /**
   * Check if a language is likely supported
   */
  isLanguageSupported(language: string): boolean {
    // Most common languages are supported
    const wellSupported = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'];
    return wellSupported.includes(language);
  }
}
