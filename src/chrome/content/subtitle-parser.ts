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
export function parseJSON3Subtitles(json: YouTubeJSON3): ParsedSubtitle[] {
  const subtitles: ParsedSubtitle[] = [];

  if (!json.events) return subtitles;

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
      if (!segText || segText === '\n') continue;

      // Calculate word timing if offset is available
      const segStartTime = seg.tOffsetMs
        ? startTime + seg.tOffsetMs / 1000
        : undefined;

      // Split segment into words
      const segWords = segText.split(/\s+/);
      for (const word of segWords) {
        const cleanWord = word.trim();
        if (cleanWord) {
          words.push({
            word: cleanWord,
            startTime: segStartTime,
            index: wordIndex++,
          });
          fullText += (fullText ? ' ' : '') + cleanWord;
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

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip WEBVTT header and empty lines
    if (trimmedLine === 'WEBVTT' || trimmedLine === '' || trimmedLine.startsWith('NOTE')) {
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
    const timestampMatch = trimmedLine.match(
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
    } else if (currentSubtitle && !trimmedLine.match(/^\d+$/)) {
      // Add text line (skip cue identifiers)
      currentText += (currentText ? ' ' : '') + stripVTTTags(trimmedLine);
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

function parseTimestamp(parts: string[]): number {
  const [hours, minutes, seconds, milliseconds] = parts.map(Number);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function stripVTTTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^}]+\}/g, '')
    .trim();
}

function textToWords(text: string): ParsedWord[] {
  const words: ParsedWord[] = [];
  const wordMatches = text.match(/\S+/g) || [];

  wordMatches.forEach((word, index) => {
    words.push({
      word,
      index,
    });
  });

  return words;
}

/**
 * Parse YouTube XML subtitle format (fallback)
 */
export function parseXMLSubtitles(xmlContent: string): ParsedSubtitle[] {
  const subtitles: ParsedSubtitle[] = [];

  // Parse XML using DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const textElements = doc.querySelectorAll('text');

  textElements.forEach((element) => {
    const start = parseFloat(element.getAttribute('start') || '0');
    const dur = parseFloat(element.getAttribute('dur') || '0');
    const text = element.textContent?.trim() || '';

    if (text) {
      subtitles.push({
        startTime: start,
        endTime: start + dur,
        text: decodeHTMLEntities(text),
        words: textToWords(decodeHTMLEntities(text)),
      });
    }
  });

  return subtitles;
}

function decodeHTMLEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Auto-detect format and parse subtitles
 */
export function parseSubtitles(content: string): ParsedSubtitle[] {
  try {
    const parsed = JSON.parse(content);

    // Check if it's wrapped XML
    if (parsed.xml) {
      console.log('[Kalaama] Parsing XML subtitle format');
      return parseXMLSubtitles(parsed.xml);
    }

    // It's JSON3 format
    console.log('[Kalaama] Parsing JSON3 subtitle format');
    return parseJSON3Subtitles(parsed);
  } catch {
    // Try VTT format
    if (content.includes('WEBVTT')) {
      console.log('[Kalaama] Parsing VTT subtitle format');
      return parseVTTSubtitles(content);
    }

    // Try XML directly
    if (content.includes('<?xml') || content.includes('<transcript')) {
      console.log('[Kalaama] Parsing XML subtitle format (direct)');
      return parseXMLSubtitles(content);
    }

    console.error('[Kalaama] Unknown subtitle format');
    return [];
  }
}
