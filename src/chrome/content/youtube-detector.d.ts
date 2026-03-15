/**
 * YouTube Detector
 * Detects YouTube video pages and extracts video information
 */
export interface VideoInfo {
    videoId: string;
    title: string;
    channelName: string;
    duration: number;
}
/**
 * Check if current page is a YouTube watch page
 */
export declare function isYouTubeWatchPage(): boolean;
/**
 * Extract video ID from URL
 */
export declare function getVideoId(): string | null;
/**
 * Get video element from YouTube player
 */
export declare function getVideoElement(): HTMLVideoElement | null;
/**
 * Get YouTube player container
 */
export declare function getPlayerContainer(): HTMLElement | null;
/**
 * Get video info from page
 */
export declare function getVideoInfo(): VideoInfo | null;
/**
 * Wait for video element to be ready
 */
export declare function waitForVideo(timeout?: number): Promise<HTMLVideoElement>;
/**
 * Watch for navigation changes (YouTube SPA)
 */
export declare function onVideoChange(callback: (videoId: string) => void): () => void;
/**
 * Check if YouTube's native captions are currently visible
 */
export declare function areNativeCaptionsVisible(): boolean;
/**
 * Hide YouTube's native captions
 */
export declare function hideNativeCaptions(): void;
/**
 * Show YouTube's native captions
 */
export declare function showNativeCaptions(): void;
//# sourceMappingURL=youtube-detector.d.ts.map