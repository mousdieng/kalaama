/**
 * Video Sync Service
 * Synchronizes subtitles with video playback
 */
import type { ParsedSubtitle } from './subtitle-parser';
export type { ParsedSubtitle };
type CueChangeCallback = (cue: ParsedSubtitle | null) => void;
export declare class VideoSyncService {
    private video;
    private subtitles;
    private currentCueIndex;
    private rafId;
    private callbacks;
    constructor(video: HTMLVideoElement, subtitles: ParsedSubtitle[]);
    /**
     * Register a callback for cue changes
     */
    onCueChange(callback: CueChangeCallback): void;
    /**
     * Get the current active cue
     */
    getCurrentCue(): ParsedSubtitle | null;
    /**
     * Clean up resources
     */
    destroy(): void;
    private setupListeners;
    private onPlay;
    private onPause;
    private onSeek;
    private onRateChange;
    private startSync;
    private stopSync;
    private sync;
    private findCueAt;
    private emitCueChange;
}
//# sourceMappingURL=video-sync.d.ts.map