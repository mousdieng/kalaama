import { Injectable } from '@angular/core';

import type {
  ConversationTutorPayload,
  ConversationTutorResponse,
} from '../../../chrome/shared/types/messages';

export type MessageType =
  | 'GET_USER'
  | 'SAVE_WORD'
  | 'TRANSLATE_WORD'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_VOCABULARY'
  | 'DELETE_WORD'
  | 'GET_CAPTIONS'
  | 'GET_CURRENT_CAPTION'
  | 'CAPTION_CUE_CHANGE'
  | 'VIDEO_INFO'
  | 'CAPTION_STATUS'
  | 'VIDEO_CONTROL'
  | 'GET_WORD_CONTEXT'
  | 'ALL_CAPTIONS'
  | 'CUE_INDEX_CHANGE'
  | 'SEEK_TO_CUE'
  // Learning feature messages
  | 'GET_AI_TUTOR_RESPONSE'
  | 'GET_CONVERSATION_TUTOR_RESPONSE'
  | 'TEXT_TO_SPEECH';

export interface WordContextResponse {
  definition: string;
  partOfSpeech: string;
  examples: string[];
  pronunciation?: string;
  translation: string;
}

// AI Tutor types
export interface AITutorPayload {
  userResponse: string;
  lessonContext: string;
  currentPrompt: {
    id: string;
    instruction: string;
    targetPhrase?: string;
    expectedResponses?: string[];
    aiContext: string;
    hints?: string[];
  };
  language: string;
  nativeLanguage: string;
  conversationHistory?: Array<{ role: 'user' | 'tutor'; text: string; timestamp: number }>;
}

export interface AITutorResponse {
  text: string;
  isCorrect: boolean;
  correction?: string;
  pronunciation?: string;
  encouragement: string;
  shouldAdvance: boolean;
  xpEarned?: number;
}

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  /**
   * Send message to background service worker
   */
  async sendToBackground<T, R>(message: Message<T>): Promise<R> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Send message to content script in the current active tab
   */
  async sendToCurrentTab<T, R>(message: Message<T>): Promise<R> {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) throw new Error('No active tab');

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id!, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Send message to a specific tab
   */
  async sendToTab<T, R>(tabId: number, message: Message<T>): Promise<R> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Listen for messages
   */
  onMessage(
    callback: (
      message: Message,
      sender: chrome.runtime.MessageSender
    ) => void | Promise<unknown>
  ): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const result = callback(message, sender);

      if (result instanceof Promise) {
        result.then(sendResponse);
        return true; // Keep channel open for async response
      }

      return false;
    });
  }

  /**
   * Translate a word
   */
  async translateWord(
    word: string,
    fromLang: string,
    toLang: string
  ): Promise<{ translation: string; source: string }> {
    return this.sendToBackground({
      type: 'TRANSLATE_WORD',
      payload: { word, fromLang, toLang },
    });
  }

  /**
   * Pause the video
   */
  async pauseVideo(): Promise<void> {
    return this.sendToBackground({
      type: 'VIDEO_CONTROL',
      payload: { action: 'pause' },
    });
  }

  /**
   * Resume the video
   */
  async playVideo(): Promise<void> {
    return this.sendToBackground({
      type: 'VIDEO_CONTROL',
      payload: { action: 'play' },
    });
  }

  /**
   * Get AI word context (definition, examples, etc.)
   */
  async getWordContext(
    word: string,
    sentence: string,
    targetLanguage: string,
    nativeLanguage: string
  ): Promise<WordContextResponse> {
    return this.sendToBackground({
      type: 'GET_WORD_CONTEXT',
      payload: { word, sentence, targetLanguage, nativeLanguage },
    });
  }

  /**
   * Seek video to a specific time
   */
  async seekToTime(time: number): Promise<void> {
    return this.sendToBackground({
      type: 'SEEK_TO_CUE',
      payload: { time },
    });
  }

  /**
   * Get AI tutor response for language learning
   */
  async getAITutorResponse(payload: AITutorPayload): Promise<AITutorResponse> {
    return this.sendToBackground({
      type: 'GET_AI_TUTOR_RESPONSE',
      payload,
    });
  }

  /**
   * Convert text to speech using ElevenLabs
   * Returns and plays the audio
   */
  async textToSpeech(text: string, language: string, voiceId?: string): Promise<void> {
    try {
      const response = await this.sendToBackground<
        { text: string; language: string; voiceId?: string },
        { audioData: string; duration: number }
      >({
        type: 'TEXT_TO_SPEECH',
        payload: { text, language, voiceId },
      });

      if (response?.audioData) {
        // Play the audio
        await this.playAudioData(response.audioData);
      }
    } catch (error) {
      console.warn('[MessagingService] TTS failed:', error);
      // Fallback to browser TTS
      this.fallbackTTS(text, language);
    }
  }

  /**
   * Play base64 encoded audio data
   */
  private async playAudioData(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
        audio.onended = () => resolve();
        audio.onerror = (e) => reject(e);
        audio.play().catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Fallback to browser's built-in TTS
   */
  private fallbackTTS(text: string, language: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.getLocaleForLanguage(language);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Get locale code for language
   */
  private getLocaleForLanguage(lang: string): string {
    const locales: Record<string, string> = {
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
      wo: 'wo-SN',
    };
    return locales[lang] || lang;
  }

  /**
   * Get conversation-based AI tutor response
   * For vocabulary learning, phrase building, and roleplay
   */
  async getConversationTutorResponse(payload: ConversationTutorPayload): Promise<ConversationTutorResponse> {
    return this.sendToBackground({
      type: 'GET_CONVERSATION_TUTOR_RESPONSE',
      payload,
    });
  }
}
