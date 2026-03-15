import { Injectable } from '@angular/core';

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
  | 'CAPTION_STATUS';

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
}
