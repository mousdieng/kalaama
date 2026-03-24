/**
 * Kalaama Content Script
 * Injected into YouTube pages to detect videos, extract captions,
 * and send them to the side panel
 */

import { extractCaptions, fetchCaptionContent, type CaptionTrack } from './subtitle-extractor';
import { parseSubtitles } from './subtitle-parser';
import { VideoSyncService, type ParsedSubtitle } from './video-sync';

// Voice Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

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
}

class KalaamaContentScript {
  private videoSync: VideoSyncService | null = null;
  private subtitles: ParsedSubtitle[] = [];
  private translatedSubtitles: ParsedSubtitle[] = [];
  private currentVideoId: string | null = null;
  private currentLanguage: string | null = null;
  private nativeLanguage: string = 'en';
  private availableTracks: CaptionTrack[] = [];

  // Voice recognition
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private voiceLanguage = 'de-DE';

  // Loop control
  private loopInterval: number | null = null;
  private loopStart: number = 0;
  private loopEnd: number = 0;

  // Repeat count for captions
  private repeatCount: number = 1;
  private currentRepeatIndex: number = 0;
  private lastCueIndex: number = -1;
  private autoPauseEnabled: boolean = false;

  // Language code mapping
  private languageMap: Record<string, string> = {
    en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
    it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU', zh: 'zh-CN',
    ja: 'ja-JP', ko: 'ko-KR', ar: 'ar-SA', wo: 'wo-SN',
  };

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log('[Kalaama] Content script initialized');

    // Load user settings
    await this.loadSettings();
    console.log('[Kalaama] Settings loaded');

    // Initialize voice recognition
    this.initVoiceRecognition();

    // Wait for YouTube player to be ready
    console.log('[Kalaama] Waiting for player...');
    await this.waitForPlayer();
    console.log('[Kalaama] Player found');

    // Detect video changes
    this.observeVideoChanges();

    // Listen for messages from popup/service worker/side panel
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Initial video detection
    console.log('[Kalaama] Calling onVideoChange...');
    this.onVideoChange();
  }

  private initVoiceRecognition(): void {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn('[Kalaama] Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    console.log('[Kalaama] Voice recognition initialized');
  }

  private startVoiceRecognition(language: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      this.voiceLanguage = this.languageMap[language] || language;
      this.recognition.lang = this.voiceLanguage;

      let finalTranscript = '';
      let timeoutId: ReturnType<typeof setTimeout>;

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

        // Send interim results to side panel
        this.sendToSidePanel({
          type: 'VOICE_INTERIM',
          payload: { interim: interimTranscript, final: finalTranscript }
        });
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[Kalaama] Voice error:', event.error);
        this.isListening = false;
        clearTimeout(timeoutId);

        if (event.error === 'no-speech') {
          reject(new Error('no-speech'));
        } else if (event.error === 'not-allowed') {
          reject(new Error('Microphone access denied'));
        } else {
          reject(new Error(event.error));
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        clearTimeout(timeoutId);

        if (finalTranscript.trim()) {
          resolve(finalTranscript.trim());
        } else {
          reject(new Error('no-speech'));
        }
      };

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      // Auto-stop after 10 seconds
      timeoutId = setTimeout(() => {
        if (this.isListening) {
          this.stopVoiceRecognition();
        }
      }, 10000);

      try {
        this.recognition.start();
      } catch (err) {
        console.error('[Kalaama] Failed to start voice:', err);
        this.isListening = false;
        clearTimeout(timeoutId);
        reject(new Error('Failed to start speech recognition'));
      }
    });
  }

  private stopVoiceRecognition(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('[Kalaama] Error stopping voice:', err);
      }
      this.isListening = false;
    }
  }

  private async checkVoicePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.warn('[Kalaama] Voice permission check failed:', err);
      return false;
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      // Add timeout to prevent hanging if service worker doesn't respond
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Settings load timeout')), 3000);
      });

      const messagePromise = chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });

      const response = await Promise.race([messagePromise, timeoutPromise]) as any;

      if (response?.native_language) {
        this.nativeLanguage = response.native_language;
      }
      if (response?.auto_pause_after_caption !== undefined) {
        this.autoPauseEnabled = response.auto_pause_after_caption;
      }
      if (response?.repeat_count !== undefined) {
        this.repeatCount = response.repeat_count;
      }
      console.log('[Kalaama] Settings loaded successfully:', response);
    } catch (error) {
      console.warn('[Kalaama] Failed to load settings (using defaults):', error);
      // Continue with defaults - don't block caption loading
    }
  }

  private async waitForPlayer(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        const player = document.querySelector('video.html5-main-video');
        if (player) {
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }

  private observeVideoChanges(): void {
    // Observe URL changes for SPA navigation
    let lastUrl = location.href;

    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        this.onVideoChange();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also listen for YouTube's navigation events
    window.addEventListener('yt-navigate-finish', () => this.onVideoChange());
  }

  private async onVideoChange(): Promise<void> {
    const videoId = this.getVideoId();
    console.log('[Kalaama] onVideoChange called, videoId:', videoId, 'currentVideoId:', this.currentVideoId);
    if (!videoId || videoId === this.currentVideoId) {
      console.log('[Kalaama] Skipping - no videoId or same video');
      return;
    }

    console.log('[Kalaama] Video changed:', videoId);
    this.currentVideoId = videoId;

    // Reset state
    this.subtitles = [];
    this.translatedSubtitles = [];
    this.availableTracks = [];
    if (this.videoSync) {
      this.videoSync.destroy();
      this.videoSync = null;
    }

    // Notify side panel that video changed
    this.sendToSidePanel({
      type: 'VIDEO_INFO',
      payload: {
        videoId,
        title: this.getVideoTitle(),
        language: null
      }
    });

    // Wait a bit for YouTube to fully load
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Extract captions
    try {
      const tracks = await extractCaptions(videoId);
      this.availableTracks = tracks;

      if (tracks.length > 0) {
        // Only use non-auto-generated tracks
        const preferredTrack = tracks.find((t) => !t.isAutoGenerated);

        if (!preferredTrack) {
          console.log('[Kalaama] Only auto-generated captions available, skipping...');
          this.sendToSidePanel({
            type: 'CAPTION_STATUS',
            payload: {
              connected: true,
              hasCaptions: false,
              isAutoGenerated: true,
              message: 'Only auto-generated captions available (currently disabled)',
              availableLanguages: tracks.map(t => t.languageCode)
            }
          });
          return;
        }

        await this.loadCaptions(preferredTrack);

        // Try to load native language track for translation
        const nativeTrack = tracks.find(
          (t) => t.languageCode === this.nativeLanguage ||
                 t.languageCode.startsWith(this.nativeLanguage + '-')
        );

        if (nativeTrack && nativeTrack.languageCode !== preferredTrack.languageCode) {
          await this.loadTranslatedCaptions(nativeTrack);
        }

        // Notify side panel
        this.sendToSidePanel({
          type: 'CAPTION_STATUS',
          payload: {
            connected: true,
            hasCaptions: true,
            trackCount: tracks.length,
            language: preferredTrack.languageCode,
            hasNativeTrack: !!nativeTrack && nativeTrack.languageCode !== preferredTrack.languageCode,
            availableLanguages: tracks.map(t => t.languageCode)
          }
        });
      } else {
        this.sendToSidePanel({
          type: 'CAPTION_STATUS',
          payload: {
            connected: true,
            hasCaptions: false
          }
        });
      }
    } catch (error) {
      console.error('[Kalaama] Failed to extract captions:', error);
      this.sendToSidePanel({
        type: 'CAPTION_STATUS',
        payload: {
          connected: true,
          hasCaptions: false,
          error: (error as Error).message
        }
      });
    }
  }

  private async loadTranslatedCaptions(track: CaptionTrack): Promise<void> {
    try {
      const content = await fetchCaptionContent(track.baseUrl);
      this.translatedSubtitles = parseSubtitles(content);

      // Send updated ALL_CAPTIONS with translations now loaded
      console.log('[Kalaama] [loadTranslatedCaptions] Sending ALL_CAPTIONS with translations:', {
        captionsCount: this.subtitles.length,
        translatedCount: this.translatedSubtitles.length
      });
      this.sendToSidePanel({
        type: 'ALL_CAPTIONS',
        payload: {
          captions: this.subtitles,
          translatedCaptions: this.translatedSubtitles
        }
      });
    } catch (error) {
      console.warn('[Kalaama] Failed to load translated captions:', error);
      this.translatedSubtitles = [];
    }
  }

  private async loadCaptions(track: CaptionTrack): Promise<void> {
    try {

      const content = await fetchCaptionContent(track.baseUrl);
      this.subtitles = parseSubtitles(content);
      this.currentLanguage = track.languageCode;


      // Notify side panel with video info
      this.sendToSidePanel({
        type: 'VIDEO_INFO',
        payload: {
          videoId: this.currentVideoId,
          title: this.getVideoTitle(),
          language: track.languageCode
        }
      });

      // Setup video sync
      const video = document.querySelector('video.html5-main-video') as HTMLVideoElement;
      if (video) {
        this.videoSync = new VideoSyncService(video, this.subtitles);
        this.videoSync.onCueChange((cue, cueIndex) => {
          // Get fresh video reference
          const currentVideo = document.querySelector('video.html5-main-video') as HTMLVideoElement;

          // Handle repeat logic - check if we moved to a NEW cue
          // IMPORTANT: Repeat is disabled when auto-pause is enabled (they conflict)
          if (cueIndex >= 0 && cueIndex !== this.lastCueIndex && this.lastCueIndex >= 0) {
            // We just moved from lastCueIndex to cueIndex
            // Check if we need to repeat the previous cue (only if auto-pause is OFF)
            if (!this.autoPauseEnabled && this.repeatCount > 1 && this.currentRepeatIndex < this.repeatCount - 1) {
              const prevCue = this.subtitles[this.lastCueIndex];
              if (prevCue && currentVideo) {
                this.currentRepeatIndex++;
                // Seek back to previous cue
                currentVideo.currentTime = prevCue.startTime + 0.05;
                return; // Don't emit the cue change yet
              }
            }
            // Done repeating or no repeat needed - move to new cue
            this.lastCueIndex = cueIndex;
            this.currentRepeatIndex = 0;
          } else if (this.lastCueIndex < 0 && cueIndex >= 0) {
            // First cue detected
            this.lastCueIndex = cueIndex;
            this.currentRepeatIndex = 0;
          }

          // Find matching translated cue using multiple strategies
          let translatedText: string | null = null;
          if (cue && this.translatedSubtitles.length > 0) {
            const translatedCue = this.findMatchingCue(cue.startTime, this.translatedSubtitles, {
              currentIndex: cueIndex,
              tolerance: 0.5 // 500ms tolerance for fuzzy matching
            });
            translatedText = translatedCue?.text || null;
          }

          // Send cue index change to side panel (for lyrics-style display)
          this.sendToSidePanel({
            type: 'CUE_INDEX_CHANGE',
            payload: {
              currentIndex: cueIndex,
              cue: cue ? { ...cue, translatedText } : null,
              translatedText
            }
          });
        });

        // Send all captions after setup (for lyrics-style display)
        console.log('[Kalaama] [loadCaptions] Sending ALL_CAPTIONS:', {
          captionsCount: this.subtitles.length,
          translatedCount: this.translatedSubtitles.length
        });
        this.sendToSidePanel({
          type: 'ALL_CAPTIONS',
          payload: {
            captions: this.subtitles,
            translatedCaptions: this.translatedSubtitles
          }
        });
      }
    } catch (error) {
      console.error('[Kalaama] Failed to load captions:', error);
    }
  }

  /**
   * Find matching cue using multiple strategies:
   * 1. Exact time match (binary search)
   * 2. Index-based match (same position in translated track)
   * 3. Fuzzy time match (nearest within tolerance)
   */
  private findMatchingCue(
    time: number,
    subtitles: ParsedSubtitle[],
    options?: { currentIndex?: number; tolerance?: number }
  ): ParsedSubtitle | null {
    if (subtitles.length === 0) return null;

    // Strategy 1: Exact time match (binary search)
    const exactMatch = this.exactTimeMatch(time, subtitles);
    if (exactMatch) return exactMatch;

    // Strategy 2: Index-based match (useful when tracks have same structure)
    const currentIndex = options?.currentIndex;
    if (currentIndex !== undefined && currentIndex >= 0 && currentIndex < subtitles.length) {
      const indexCue = subtitles[currentIndex];
      // Accept if reasonably close in time (within 2 seconds)
      if (Math.abs(indexCue.startTime - time) < 2.0) {
        return indexCue;
      }
    }

    // Strategy 3: Fuzzy time match (find nearest within tolerance)
    const tolerance = options?.tolerance ?? 0.5; // 500ms default
    return this.fuzzyTimeMatch(time, subtitles, tolerance);
  }

  private exactTimeMatch(time: number, subtitles: ParsedSubtitle[]): ParsedSubtitle | null {
    let low = 0;
    let high = subtitles.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cue = subtitles[mid];

      if (time >= cue.startTime && time <= cue.endTime) {
        return cue;
      } else if (time < cue.startTime) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return null;
  }

  private fuzzyTimeMatch(time: number, subtitles: ParsedSubtitle[], tolerance: number): ParsedSubtitle | null {
    let bestMatch: ParsedSubtitle | null = null;
    let bestDistance = Infinity;

    for (const cue of subtitles) {
      // Check if time is within cue range (with tolerance)
      const startDistance = Math.abs(cue.startTime - time);
      const endDistance = Math.abs(cue.endTime - time);
      const minDistance = Math.min(startDistance, endDistance);

      // If time is within the cue range, distance is 0
      const distance = (time >= cue.startTime && time <= cue.endTime) ? 0 : minDistance;

      if (distance < bestDistance && distance <= tolerance) {
        bestDistance = distance;
        bestMatch = cue;
      }

      // Early exit if we've passed the time window
      if (cue.startTime > time + tolerance) break;
    }

    return bestMatch;
  }

  /**
   * Send message to side panel via service worker
   */
  private async sendToSidePanel(message: { type: string; payload: unknown }): Promise<void> {
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      // Side panel might not be open, that's OK
      console.debug('[Kalaama] Could not send to side panel:', error);
    }
  }

  private handleMessage(
    message: { type: string; payload?: unknown },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean {
    switch (message.type) {
      case 'GET_CAPTIONS':
        sendResponse({ subtitles: this.subtitles });
        break;

      case 'GET_VIDEO_INFO':
        sendResponse({
          videoId: this.currentVideoId,
          title: this.getVideoTitle(),
          language: this.currentLanguage
        });
        break;

      case 'GET_CURRENT_CAPTION':
        // Send current state to side panel
        this.sendToSidePanel({
          type: 'VIDEO_INFO',
          payload: {
            videoId: this.currentVideoId,
            title: this.getVideoTitle(),
            language: this.currentLanguage
          }
        });
        this.sendToSidePanel({
          type: 'CAPTION_STATUS',
          payload: {
            connected: true,
            hasCaptions: this.subtitles.length > 0
          }
        });
        // Send ALL captions for lyrics-style display
        if (this.subtitles.length > 0) {
          this.sendToSidePanel({
            type: 'ALL_CAPTIONS',
            payload: {
              captions: this.subtitles,
              translatedCaptions: this.translatedSubtitles
            }
          });
        }
        // Send current cue index
        if (this.videoSync) {
          const currentCue = this.videoSync.getCurrentCue();
          const currentIndex = this.videoSync.getCurrentCueIndex();
          this.sendToSidePanel({
            type: 'CUE_INDEX_CHANGE',
            payload: {
              currentIndex,
              cue: currentCue,
              translatedText: null
            }
          });
        }
        sendResponse({ received: true });
        break;

      case 'VIDEO_CONTROL':
        this.handleVideoControl(message.payload as { action: 'pause' | 'play' | 'toggle' });
        sendResponse({ success: true });
        break;

      case 'SEEK_TO_CUE':
        this.handleSeekToCue(message.payload as { time: number });
        sendResponse({ success: true });
        break;

      // Voice recognition commands (runs on youtube.com context where mic is permitted)
      case 'VOICE_START':
        this.handleVoiceStart(message.payload as { language: string }, sendResponse);
        return true; // Keep channel open for async response

      case 'VOICE_STOP':
        this.stopVoiceRecognition();
        sendResponse({ success: true });
        break;

      case 'VOICE_CHECK_PERMISSION':
        this.checkVoicePermission().then(hasPermission => {
          sendResponse({ hasPermission });
        });
        return true; // Keep channel open for async response

      // Video control: playback speed
      case 'SET_PLAYBACK_SPEED':
        this.handleSetPlaybackSpeed(message.payload as { speed: number });
        sendResponse({ success: true });
        break;

      // Video control: loop segment
      case 'SET_LOOP_SEGMENT':
        this.handleSetLoopSegment(message.payload as { startTime: number; endTime: number });
        sendResponse({ success: true });
        break;

      case 'CLEAR_LOOP_SEGMENT':
        this.handleClearLoopSegment();
        sendResponse({ success: true });
        break;

      // Video control: repeat count
      case 'SET_REPEAT_COUNT':
        this.handleSetRepeatCount(message.payload as { count: number });
        sendResponse({ success: true });
        break;

      // Video control: change subtitle track
      case 'CHANGE_SUBTITLE_TRACK':
        this.handleChangeSubtitleTrack(message.payload as { languageCode: string });
        sendResponse({ success: true });
        break;

      // Update auto-pause setting
      case 'SET_AUTO_PAUSE':
        this.handleSetAutoPause(message.payload as { enabled: boolean });
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }

    return true;
  }

  private handleVideoControl(payload: { action: 'pause' | 'play' | 'toggle' }): void {
    const video = document.querySelector('video.html5-main-video') as HTMLVideoElement;
    if (!video) {
      console.warn('[Kalaama] No video element found for control');
      return;
    }

    switch (payload.action) {
      case 'pause':
        video.pause();
          break;
      case 'play':
        video.play();
          break;
      case 'toggle':
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
        break;
    }
  }

  private handleSeekToCue(payload: { time: number }): void {
    const video = document.querySelector('video.html5-main-video') as HTMLVideoElement;
    if (!video) {
      console.warn('[Kalaama] No video element found for seek');
      return;
    }

    if (payload.time !== undefined && payload.time >= 0) {
      video.currentTime = payload.time;
    }
  }

  private handleVoiceStart(payload: { language: string }, sendResponse: (response: unknown) => void): void {
    this.startVoiceRecognition(payload.language)
      .then(transcript => {
        console.log('[Kalaama] Voice result:', transcript);
        sendResponse({ success: true, transcript });
      })
      .catch(err => {
        console.error('[Kalaama] Voice error:', err.message);
        sendResponse({ success: false, error: err.message });
      });
  }

  /**
   * Set video playback speed
   */
  private handleSetPlaybackSpeed(payload: { speed: number }): void {
    const video = document.querySelector('video.html5-main-video') as HTMLVideoElement;
    if (video) {
      video.playbackRate = payload.speed;
    }
  }

  /**
   * Set a loop segment between start and end times
   */
  private handleSetLoopSegment(payload: { startTime: number; endTime: number }): void {
    const video = document.querySelector('video.html5-main-video') as HTMLVideoElement;
    if (!video) return;

    this.loopStart = payload.startTime;
    this.loopEnd = payload.endTime;

    // Clear any existing loop
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
    }

    // Check every 100ms if we've passed the loop end
    this.loopInterval = window.setInterval(() => {
      if (video.currentTime >= this.loopEnd) {
        video.currentTime = this.loopStart;
      }
    }, 100);

  }

  /**
   * Clear the current loop segment
   */
  private handleClearLoopSegment(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    this.loopStart = 0;
    this.loopEnd = 0;
  }

  /**
   * Set the number of times to repeat each caption
   */
  private handleSetRepeatCount(payload: { count: number }): void {
    this.repeatCount = payload.count;
    this.currentRepeatIndex = 0;
  }

  /**
   * Set auto-pause enabled state
   */
  private handleSetAutoPause(payload: { enabled: boolean }): void {
    this.autoPauseEnabled = payload.enabled;
    // Reset repeat state when auto-pause is toggled
    if (this.autoPauseEnabled) {
      this.currentRepeatIndex = 0;
    }
  }

  /**
   * Change the subtitle track language
   */
  private async handleChangeSubtitleTrack(payload: { languageCode: string }): Promise<void> {
    const track = this.availableTracks.find(t => t.languageCode === payload.languageCode);
    if (!track) {
      console.warn('[Kalaama] Track not found for language:', payload.languageCode);
      return;
    }

    await this.loadCaptions(track);

    // Notify side panel of track change
    this.sendToSidePanel({
      type: 'CAPTION_STATUS',
      payload: {
        connected: true,
        hasCaptions: true,
        language: track.languageCode,
        availableLanguages: this.availableTracks.map(t => t.languageCode)
      }
    });
  }

  private getVideoId(): string | null {
    const url = new URL(location.href);
    return url.searchParams.get('v');
  }

  private getVideoTitle(): string {
    const titleElement = document.querySelector(
      'h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata'
    );
    return titleElement?.textContent?.trim() || '';
  }
}

// Initialize
new KalaamaContentScript();
