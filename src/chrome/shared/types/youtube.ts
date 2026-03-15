/**
 * YouTube API Types
 * Types for YouTube's internal APIs and DOM structure
 */

export interface YouTubePlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: YouTubeCaptionTrack[];
      translationLanguages?: YouTubeTranslationLanguage[];
    };
  };
  videoDetails?: {
    videoId: string;
    title: string;
    author: string;
    lengthSeconds: string;
    channelId: string;
    shortDescription: string;
    thumbnail: {
      thumbnails: YouTubeThumbnail[];
    };
  };
}

export interface YouTubeCaptionTrack {
  baseUrl: string;
  name: {
    simpleText: string;
  };
  vssId: string;
  languageCode: string;
  kind?: string; // 'asr' for auto-generated
  isTranslatable: boolean;
}

export interface YouTubeTranslationLanguage {
  languageCode: string;
  languageName: {
    simpleText: string;
  };
}

export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

// JSON3 subtitle format (YouTube's native format)
export interface YouTubeJSON3Subtitles {
  wireMagic: string;
  events: YouTubeSubtitleEvent[];
}

export interface YouTubeSubtitleEvent {
  tStartMs: number;
  dDurationMs: number;
  segs?: YouTubeSubtitleSegment[];
  wWinId?: number;
}

export interface YouTubeSubtitleSegment {
  utf8: string;
  tOffsetMs?: number;
}

// Parsed subtitle types
export interface ParsedSubtitle {
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  words: ParsedWord[];
}

export interface ParsedWord {
  word: string;
  startTime?: number;
  endTime?: number;
  index: number;
}

// Video state
export interface VideoState {
  videoId: string;
  title: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
}
