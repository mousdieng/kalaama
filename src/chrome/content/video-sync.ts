/**
 * Video Sync Service
 * Synchronizes subtitles with video playback
 */

import type { ParsedSubtitle } from './subtitle-parser';
export type { ParsedSubtitle };

type CueChangeCallback = (cue: ParsedSubtitle | null, index: number) => void;

export class VideoSyncService {
  private video: HTMLVideoElement;
  private subtitles: ParsedSubtitle[];
  private currentCueIndex = -1;
  private intervalId: number | null = null;
  private callbacks: CueChangeCallback[] = [];
  private readonly SYNC_INTERVAL_MS = 50; // Sync every 50ms for better responsiveness

  constructor(video: HTMLVideoElement, subtitles: ParsedSubtitle[]) {
    this.video = video;
    this.subtitles = subtitles;
    this.setupListeners();
    this.startSync();
  }

  /**
   * Register a callback for cue changes
   */
  onCueChange(callback: CueChangeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Get the current active cue
   */
  getCurrentCue(): ParsedSubtitle | null {
    if (this.currentCueIndex >= 0 && this.currentCueIndex < this.subtitles.length) {
      return this.subtitles[this.currentCueIndex];
    }
    return null;
  }

  /**
   * Get the current cue index (-1 if no cue active)
   */
  getCurrentCueIndex(): number {
    return this.currentCueIndex;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopSync();
    this.callbacks = [];
    this.video.removeEventListener('play', this.onPlay);
    this.video.removeEventListener('pause', this.onPause);
    this.video.removeEventListener('seeking', this.onSeek);
    this.video.removeEventListener('ratechange', this.onRateChange);
  }

  private setupListeners(): void {
    this.onPlay = this.onPlay.bind(this);
    this.onPause = this.onPause.bind(this);
    this.onSeek = this.onSeek.bind(this);
    this.onRateChange = this.onRateChange.bind(this);

    this.video.addEventListener('play', this.onPlay);
    this.video.addEventListener('pause', this.onPause);
    this.video.addEventListener('seeking', this.onSeek);
    this.video.addEventListener('ratechange', this.onRateChange);
  }

  private onPlay(): void {
    this.startSync();
  }

  private onPause(): void {
    // Keep syncing even when paused for seeking
  }

  private onSeek(): void {
    this.currentCueIndex = -1;
    this.sync();
  }

  private onRateChange(): void {
    // Playback rate changed, continue syncing
  }

  private startSync(): void {
    if (this.intervalId !== null) return;

    // Use setInterval instead of requestAnimationFrame
    // RAF pauses when tab is not visible, but we need sync to work
    // even when user is interacting with the side panel
    this.intervalId = window.setInterval(() => {
      this.sync();
    }, this.SYNC_INTERVAL_MS);

    // Also sync immediately
    this.sync();
  }

  private stopSync(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private sync(): void {
    const currentTime = this.video.currentTime;
    const cueIndex = this.findCueAt(currentTime);

    if (cueIndex !== this.currentCueIndex) {
      this.currentCueIndex = cueIndex;
      const cue = cueIndex >= 0 ? this.subtitles[cueIndex] : null;
      this.emitCueChange(cue);
    }
  }

  /**
   * Find the cue at the given time, with gap-tolerant matching.
   * Handles gaps between cues (common in auto-generated subtitles).
   */
  private findCueAt(time: number): number {
    if (this.subtitles.length === 0) return -1;

    const first = this.subtitles[0];
    const last = this.subtitles[this.subtitles.length - 1];

    // Before first cue - show first cue if within 0.5s lookahead
    if (time < first.startTime) {
      return time >= first.startTime - 0.5 ? 0 : -1;
    }

    // After last cue - keep showing last cue for 0.5s after it ends
    if (time > last.endTime) {
      return time <= last.endTime + 0.5 ? this.subtitles.length - 1 : -1;
    }

    // Binary search with gap handling
    let low = 0;
    let high = this.subtitles.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cue = this.subtitles[mid];

      // Direct hit - time is within this cue
      if (time >= cue.startTime && time <= cue.endTime) {
        return mid;
      }

      if (time < cue.startTime) {
        // Time is before this cue - check if we're in a gap
        if (mid > 0) {
          const prevCue = this.subtitles[mid - 1];
          // If time is between prevCue.endTime and cue.startTime (in a gap)
          if (time > prevCue.endTime && time < cue.startTime) {
            const gapSize = cue.startTime - prevCue.endTime;
            const timeToPrev = time - prevCue.endTime;
            const timeToNext = cue.startTime - time;

            // For small gaps (< 1 second), prefer showing the upcoming cue
            // This makes captions appear slightly before speech (more natural for reading)
            if (gapSize < 1.0) {
              return timeToNext < 0.3 ? mid : mid - 1;
            }
            // For larger gaps, stay with previous cue briefly, then go blank
            return timeToPrev < 0.3 ? mid - 1 : -1;
          }
        }
        high = mid - 1;
      } else {
        // time > cue.endTime
        low = mid + 1;
      }
    }

    return -1;
  }

  private emitCueChange(cue: ParsedSubtitle | null): void {
    for (const callback of this.callbacks) {
      try {
        callback(cue, this.currentCueIndex);
      } catch (error) {
        console.error('[Kalaama] Cue change callback error:', error);
      }
    }
  }
}
