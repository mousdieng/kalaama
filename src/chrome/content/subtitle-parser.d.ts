/**
 * Subtitle Parser
 * Parses YouTube's JSON3 subtitle format
 */
export interface ParsedSubtitle {
    startTime: number;
    endTime: number;
    text: string;
    words: ParsedWord[];
}
export interface ParsedWord {
    word: string;
    startTime?: number;
    endTime?: number;
    index: number;
}
interface YouTubeJSON3 {
    events: Array<{
        tStartMs: number;
        dDurationMs: number;
        segs?: Array<{
            utf8: string;
            tOffsetMs?: number;
        }>;
    }>;
}
/**
 * Parse YouTube JSON3 subtitle format
 */
export declare function parseJSON3Subtitles(json: YouTubeJSON3): ParsedSubtitle[];
/**
 * Parse VTT subtitle format
 */
export declare function parseVTTSubtitles(vttContent: string): ParsedSubtitle[];
export {};
//# sourceMappingURL=subtitle-parser.d.ts.map