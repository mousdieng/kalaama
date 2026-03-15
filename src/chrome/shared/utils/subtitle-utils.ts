/**
 * Subtitle Parsing Utilities
 * Parse YouTube's JSON3 and VTT subtitle formats
 */

import type {
  YouTubeJSON3Subtitles,
  YouTubeSubtitleEvent,
  ParsedSubtitle,
  ParsedWord,
} from '../types/youtube';

/**
 * Parse YouTube JSON3 subtitle format
 */
export function parseJSON3Subtitles(json: YouTubeJSON3Subtitles): ParsedSubtitle[] {
  const subtitles: ParsedSubtitle[] = [];

  for (const event of json.events) {
    if (!event.segs || event.segs.length === 0) continue;

    const startTime = event.tStartMs / 1000;
    const endTime = (event.tStartMs + event.dDurationMs) / 1000;

    // Combine segments into full text
    let fullText = '';
    const words: ParsedWord[] = [];
    let wordIndex = 0;

    for (const seg of event.segs) {
      const segText = seg.utf8.trim();
      if (!segText) continue;

      // Calculate word timing if offset is available
      const segStartTime = seg.tOffsetMs
        ? startTime + seg.tOffsetMs / 1000
        : undefined;

      // Split segment into words
      const segWords = segText.split(/\s+/);
      for (const word of segWords) {
        if (word) {
          words.push({
            word,
            startTime: segStartTime,
            index: wordIndex++,
          });
          fullText += (fullText ? ' ' : '') + word;
        }
      }
    }

    if (fullText) {
      subtitles.push({
        startTime,
        endTime,
        text: fullText,
        words,
      });
    }
  }

  return subtitles;
}

/**
 * Parse VTT subtitle format
 */
export function parseVTTSubtitles(vttContent: string): ParsedSubtitle[] {
  const subtitles: ParsedSubtitle[] = [];
  const lines = vttContent.split('\n');

  let currentSubtitle: Partial<ParsedSubtitle> | null = null;
  let currentText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header and empty lines
    if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
      if (currentSubtitle && currentText) {
        currentSubtitle.text = currentText.trim();
        currentSubtitle.words = textToWords(currentSubtitle.text);
        subtitles.push(currentSubtitle as ParsedSubtitle);
      }
      currentSubtitle = null;
      currentText = '';
      continue;
    }

    // Check for timestamp line
    const timestampMatch = line.match(
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
    );

    if (timestampMatch) {
      // Save previous subtitle if exists
      if (currentSubtitle && currentText) {
        currentSubtitle.text = currentText.trim();
        currentSubtitle.words = textToWords(currentSubtitle.text);
        subtitles.push(currentSubtitle as ParsedSubtitle);
      }

      const startTime = parseTimestamp(timestampMatch.slice(1, 5));
      const endTime = parseTimestamp(timestampMatch.slice(5, 9));

      currentSubtitle = {
        startTime,
        endTime,
        text: '',
        words: [],
      };
      currentText = '';
    } else if (currentSubtitle && !line.match(/^\d+$/)) {
      // Add text line (skip cue identifiers which are just numbers)
      currentText += (currentText ? ' ' : '') + stripVTTTags(line);
    }
  }

  // Don't forget the last subtitle
  if (currentSubtitle && currentText) {
    currentSubtitle.text = currentText.trim();
    currentSubtitle.words = textToWords(currentSubtitle.text);
    subtitles.push(currentSubtitle as ParsedSubtitle);
  }

  return subtitles;
}

/**
 * Parse timestamp components to seconds
 */
function parseTimestamp(parts: string[]): number {
  const [hours, minutes, seconds, milliseconds] = parts.map(Number);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Strip VTT formatting tags
 */
function stripVTTTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML-like tags
    .replace(/\{[^}]+\}/g, '') // Remove curly brace tags
    .trim();
}

/**
 * Convert text to word tokens
 */
function textToWords(text: string): ParsedWord[] {
  const words: ParsedWord[] = [];
  const wordMatches = text.match(/\S+/g) || [];

  wordMatches.forEach((word, index) => {
    words.push({
      word: cleanWord(word),
      index,
    });
  });

  return words;
}

/**
 * Clean a word (remove punctuation from start/end but preserve internal)
 */
function cleanWord(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/**
 * Find subtitle cue at a specific time
 */
export function findCueAtTime(
  subtitles: ParsedSubtitle[],
  time: number
): ParsedSubtitle | null {
  // Binary search for efficiency
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

/**
 * Merge consecutive subtitles that are too short
 */
export function mergeShortSubtitles(
  subtitles: ParsedSubtitle[],
  minDuration: number = 0.5
): ParsedSubtitle[] {
  const merged: ParsedSubtitle[] = [];

  for (const subtitle of subtitles) {
    const duration = subtitle.endTime - subtitle.startTime;

    if (
      merged.length > 0 &&
      duration < minDuration &&
      subtitle.startTime - merged[merged.length - 1].endTime < 0.1
    ) {
      // Merge with previous
      const prev = merged[merged.length - 1];
      prev.endTime = subtitle.endTime;
      prev.text += ' ' + subtitle.text;
      prev.words = textToWords(prev.text);
    } else {
      merged.push({ ...subtitle });
    }
  }

  return merged;
}
