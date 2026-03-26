import { Injectable } from '@angular/core';
import type { SubtitleCue, WordToken } from '../../../chrome/shared/types/messages';

/**
 * SubtitleUploadService
 * Parses subtitle files in various formats (SRT, VTT, ASS/SSA)
 * Converts them to SubtitleCue[] for use with VideoSyncService
 */
@Injectable({
  providedIn: 'root'
})
export class SubtitleUploadService {

  /**
   * Parse subtitle file based on extension
   */
  async parseSubtitleFile(file: File): Promise<SubtitleCue[]> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const text = await this.readFileAsText(file);

    switch (fileExtension) {
      case 'srt':
        return this.parseSRT(text);
      case 'vtt':
        return this.parseVTT(text);
      case 'ass':
      case 'ssa':
        return this.parseASS(text);
      default:
        throw new Error(`Unsupported subtitle format: ${fileExtension}`);
    }
  }

  /**
   * Read file as text using FileReader
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Parse SRT format
   * Example:
   * 1
   * 00:00:00,000 --> 00:00:02,500
   * This is the first subtitle
   */
  private parseSRT(text: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];

    try {
      const blocks = text.trim().split(/\n\s*\n/);

      for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length < 3) continue;

        const timeLine = lines[1];
        const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

        if (!match) continue;

        const startTime = this.parseTimestamp(match[1], match[2], match[3], match[4]);
        const endTime = this.parseTimestamp(match[5], match[6], match[7], match[8]);
        const cueText = lines.slice(2).join(' ').trim();

        cues.push({
          startTime,
          endTime,
          text: cueText,
          words: this.tokenizeText(cueText)
        });
      }
    } catch (error) {
      console.error('[SubtitleUpload] Failed to parse SRT:', error);
      throw new Error('SRT file is malformed or corrupt');
    }

    if (cues.length === 0) {
      throw new Error('No valid subtitle cues found in SRT file');
    }

    return cues;
  }

  /**
   * Parse VTT format
   * Example:
   * WEBVTT
   *
   * 00:00:00.000 --> 00:00:02.500
   * This is the first subtitle
   */
  private parseVTT(text: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];

    try {
      const lines = text.split('\n');

      let i = 0;
      // Skip header lines until we find first timestamp
      while (i < lines.length && !lines[i].includes('-->')) {
        i++;
      }

      while (i < lines.length) {
        const line = lines[i];

        if (line.includes('-->')) {
          const match = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);

          if (match) {
            const startTime = this.parseTimestamp(match[1], match[2], match[3], match[4]);
            const endTime = this.parseTimestamp(match[5], match[6], match[7], match[8]);

            i++;
            const textLines: string[] = [];
            while (i < lines.length && lines[i].trim() !== '') {
              textLines.push(lines[i]);
              i++;
            }

            const cueText = textLines.join(' ').trim();

            cues.push({
              startTime,
              endTime,
              text: cueText,
              words: this.tokenizeText(cueText)
            });
          }
        }

        i++;
      }
    } catch (error) {
      console.error('[SubtitleUpload] Failed to parse VTT:', error);
      throw new Error('VTT file is malformed or corrupt');
    }

    if (cues.length === 0) {
      throw new Error('No valid subtitle cues found in VTT file');
    }

    return cues;
  }

  /**
   * Parse ASS/SSA format
   * Example:
   * [Events]
   * Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
   * Dialogue: 0,0:00:00.00,0:00:02.50,Default,,0,0,0,,This is the first subtitle
   */
  private parseASS(text: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];

    try {
      const lines = text.split('\n');

      let inEvents = false;

      for (const line of lines) {
        if (line.trim() === '[Events]') {
          inEvents = true;
          continue;
        }

        if (!inEvents || !line.startsWith('Dialogue:')) continue;

        const parts = line.substring('Dialogue:'.length).split(',');
        if (parts.length < 10) continue;

        const startTime = this.parseASSTimestamp(parts[1].trim());
        const endTime = this.parseASSTimestamp(parts[2].trim());
        const cueText = parts.slice(9).join(',').replace(/\\N/g, ' ').trim();

        cues.push({
          startTime,
          endTime,
          text: cueText,
          words: this.tokenizeText(cueText)
        });
      }
    } catch (error) {
      console.error('[SubtitleUpload] Failed to parse ASS:', error);
      throw new Error('ASS file is malformed or corrupt');
    }

    if (cues.length === 0) {
      throw new Error('No valid subtitle cues found in ASS file');
    }

    return cues;
  }

  /**
   * Convert timestamp to seconds
   */
  private parseTimestamp(hours: string, minutes: string, seconds: string, milliseconds: string): number {
    return parseInt(hours) * 3600 +
           parseInt(minutes) * 60 +
           parseInt(seconds) +
           parseInt(milliseconds) / 1000;
  }

  /**
   * Parse ASS timestamp (h:mm:ss.cc)
   */
  private parseASSTimestamp(timestamp: string): number {
    const match = timestamp.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
    if (!match) return 0;

    return parseInt(match[1]) * 3600 +
           parseInt(match[2]) * 60 +
           parseInt(match[3]) +
           parseInt(match[4]) / 100;
  }

  /**
   * Tokenize text into words for word-by-word display
   */
  private tokenizeText(text: string): WordToken[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return words.map((word, index) => ({
      word,
      index
    }));
  }
}
