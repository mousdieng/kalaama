import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubtitleUploadService } from './subtitle-upload.service';
import { MessagingService } from '../../core/services/messaging.service';
import { DictionaryService } from '../../core/services/dictionary.service';
import { VocabularyService } from '../../core/services/vocabulary.service';
import { SettingsService } from '../../core/services/settings.service';
import type { SubtitleCue } from '../../../chrome/shared/types/messages';
import type { DictionaryWord } from '../../../chrome/shared/types/dictionary';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoInput') videoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('subtitleInput') subtitleInput!: ElementRef<HTMLInputElement>;

  private subtitleUploadService = inject(SubtitleUploadService);
  private messagingService = inject(MessagingService);
  private dictionaryService = inject(DictionaryService);
  private vocabularyService = inject(VocabularyService);
  private settingsService = inject(SettingsService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // File state
  videoFile: File | null = null;
  subtitleFile: File | null = null;
  videoUrl: string = '';
  videoLoaded = false;

  // Caption state
  currentCaption = '';
  currentCue: SubtitleCue | null = null;
  subtitleCues: SubtitleCue[] = [];

  // Learning controls
  autoPauseEnabled = false;
  loopSegment: { start: number; end: number } | null = null;
  playbackSpeed = 1;

  // Translation modal state
  showTranslationModal = false;
  selectedWord = '';
  translation = '';
  currentDictionaryEntry: DictionaryWord | null = null;
  loadingTranslation = false;
  translationError = '';

  // Settings
  settings: any = {};

  // Error handling
  hasError = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadSettings();
  }

  ngOnDestroy(): void {
    // Cleanup blob URL to free memory
    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load user settings
   */
  private async loadSettings(): Promise<void> {
    try {
      this.settings = await this.settingsService.getSettings();
    } catch (error) {
      console.error('[VideoPlayer] Failed to load settings:', error);
    }
  }

  /**
   * Handle video file selection
   */
  onVideoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate MIME type
    if (!file.type.startsWith('video/')) {
      this.showError('Please select a valid video file');
      return;
    }

    // Validate file size (max 2GB)
    const MAX_SIZE = 2 * 1024 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      this.showError('Video file is too large (max 2GB)');
      return;
    }

    this.videoFile = file;
    this.hasError = false;
    this.cdr.markForCheck();
  }

  /**
   * Handle subtitle file selection
   */
  onSubtitleSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.subtitleFile = file;
    this.hasError = false;
    this.cdr.markForCheck();
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type.startsWith('video/')) {
        this.videoFile = file;
      } else if (file.name.match(/\.(srt|vtt|ass|ssa)$/i)) {
        this.subtitleFile = file;
      }
    }

    this.cdr.markForCheck();
  }

  /**
   * Load video and subtitles
   */
  async loadVideo(): Promise<void> {
    if (!this.videoFile) return;

    try {
      // Create blob URL for video
      this.videoUrl = URL.createObjectURL(this.videoFile);
      this.videoLoaded = true;

      // Parse subtitles if provided
      if (this.subtitleFile) {
        this.subtitleCues = await this.subtitleUploadService.parseSubtitleFile(
          this.subtitleFile
        );
        console.log(`[VideoPlayer] Loaded ${this.subtitleCues.length} subtitle cues`);
      }

      this.cdr.markForCheck();

      // Initialize video sync after video element is ready
      setTimeout(() => {
        this.initializeVideoSync();
      }, 100);
    } catch (error: any) {
      this.showError(`Failed to load video: ${error.message}`);
      this.videoLoaded = false;
      URL.revokeObjectURL(this.videoUrl);
    }
  }

  /**
   * Initialize video sync with HTML5 video element
   */
  private initializeVideoSync(): void {
    if (!this.videoElement) {
      console.error('[VideoPlayer] Video element not found');
      return;
    }

    const video = this.videoElement.nativeElement;

    // Listen for timeupdate to sync captions
    video.addEventListener('timeupdate', () => this.handleTimeUpdate());

    // Listen for video errors
    video.addEventListener('error', (event) => this.onVideoError(event));

    console.log('[VideoPlayer] Video sync initialized');
  }

  /**
   * Handle video time update
   */
  private handleTimeUpdate(): void {
    if (!this.videoElement) return;

    const currentTime = this.videoElement.nativeElement.currentTime;
    const cue = this.findCueAtTime(currentTime);

    if (cue !== this.currentCue) {
      this.currentCue = cue;
      this.currentCaption = cue?.text || '';

      // Auto-pause logic
      if (this.autoPauseEnabled && cue) {
        this.videoElement.nativeElement.pause();
      }

      // Loop segment logic
      if (this.loopSegment && currentTime >= this.loopSegment.end) {
        this.videoElement.nativeElement.currentTime = this.loopSegment.start;
        this.videoElement.nativeElement.play();
      }

      this.cdr.markForCheck();
    }
  }

  /**
   * Find subtitle cue at given time
   */
  private findCueAtTime(time: number): SubtitleCue | null {
    return this.subtitleCues.find(cue =>
      time >= cue.startTime && time <= cue.endTime
    ) || null;
  }

  /**
   * Handle word click in caption
   */
  async onWordClick(word: string): Promise<void> {
    if (!word || word.trim().length === 0) return;

    const cleanWord = word.trim().toLowerCase().replace(/[.,!?;:"""()]/g, '');

    this.loadingTranslation = true;
    this.selectedWord = cleanWord;
    this.translationError = '';

    try {
      // 1. Search dictionary first
      const dictionaryEntry = await this.dictionaryService.searchWord(
        cleanWord,
        this.settings.target_language || 'de'
      );

      if (dictionaryEntry) {
        // Found in dictionary - show full data
        this.currentDictionaryEntry = dictionaryEntry;
        this.translation = dictionaryEntry.french_translation;
        this.showTranslationModal = true;
      } else {
        // Not in dictionary - log as missing
        await this.dictionaryService.logMissingWord(cleanWord, {
          video_id: 'custom_video',
          video_title: this.videoFile?.name || 'Custom Video',
          context_sentence: this.currentCue?.text || ''
        });

        // Fall back to free translation API
        const result = await this.messagingService.translateWord(
          cleanWord,
          this.settings.target_language || 'de',
          this.settings.native_language || 'fr'
        );

        this.translation = result.translation;
        this.currentDictionaryEntry = null;
        this.showTranslationModal = true;
      }
    } catch (error: any) {
      this.translationError = error.message || 'Translation failed';
    } finally {
      this.loadingTranslation = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Save current word to vocabulary
   */
  async saveWord(): Promise<void> {
    if (!this.selectedWord) return;

    try {
      await this.vocabularyService.addWord({
        dictionary_id: this.currentDictionaryEntry?.id,
        language: this.settings.target_language || 'de',
        context_sentence: this.currentCue?.text || '',
        video_id: 'custom_video',
        video_title: this.videoFile?.name || 'Custom Video'
      });

      this.showTranslationModal = false;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('[VideoPlayer] Failed to save word:', error);
    }
  }

  /**
   * Close translation modal
   */
  closeTranslationModal(): void {
    this.showTranslationModal = false;
    this.cdr.markForCheck();
  }

  /**
   * Toggle loop current segment
   */
  toggleLoop(): void {
    if (!this.currentCue) return;

    if (this.loopSegment) {
      this.loopSegment = null;
    } else {
      this.loopSegment = {
        start: this.currentCue.startTime,
        end: this.currentCue.endTime
      };
    }

    this.cdr.markForCheck();
  }

  /**
   * Toggle auto-pause
   */
  toggleAutoPause(): void {
    this.autoPauseEnabled = !this.autoPauseEnabled;
    this.cdr.markForCheck();
  }

  /**
   * Change playback speed
   */
  changeSpeed(event: Event): void {
    const speed = parseFloat((event.target as HTMLSelectElement).value);
    this.playbackSpeed = speed;

    if (this.videoElement) {
      this.videoElement.nativeElement.playbackRate = speed;
    }

    this.cdr.markForCheck();
  }

  /**
   * Handle video load error
   */
  private onVideoError(event: Event): void {
    console.error('[VideoPlayer] Video load error:', event);
    this.showError('Failed to load video file. Please check the file format.');
    this.videoLoaded = false;
    URL.revokeObjectURL(this.videoUrl);
    this.cdr.markForCheck();
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.hasError = true;
    this.errorMessage = message;
    this.cdr.markForCheck();
  }

  /**
   * Reset player and load new video
   */
  resetPlayer(): void {
    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
    }

    this.videoFile = null;
    this.subtitleFile = null;
    this.videoUrl = '';
    this.videoLoaded = false;
    this.currentCaption = '';
    this.currentCue = null;
    this.subtitleCues = [];
    this.loopSegment = null;
    this.autoPauseEnabled = false;
    this.playbackSpeed = 1;
    this.hasError = false;

    this.cdr.markForCheck();
  }
}
