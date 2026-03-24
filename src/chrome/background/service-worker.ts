console.log('[Kalaama SW] Service worker script starting...');

/**
 * Kalaama Background Service Worker
 * Handles message routing and local storage
 *
 * NOTE: Supabase integration is commented out for now.
 * All data is stored locally in chrome.storage.local
 */

// =============================================================================
// SUPABASE DISABLED - Uncomment when ready to integrate
// =============================================================================
// import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
// const SUPABASE_URL = 'YOUR_SUPABASE_URL';
// const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
// const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// =============================================================================

// Environment variables (injected at build time)
declare const ENV_GEMINI_API_KEY: string;
declare const ENV_OPENAI_API_KEY: string;
declare const ENV_CLAUDE_API_KEY: string;
declare const ENV_ELEVENLABS_API_KEY: string;

import type {
  Message,
  SaveWordPayload,
  TranslateWordPayload,
  FetchCaptionsPayload,
  VideoControlPayload,
  WordContextPayload,
  WordContextResponse,
  SeekToCuePayload,
  AITutorPayload,
  AITutorResponse,
  TTSPayload,
  TTSResponse,
  AIProvider,
  ConversationTutorPayload,
  ConversationTutorResponse,
  ConversationPhase,
  GrammarAnalysisPayload,
  GrammarAnalysisResponse,
  GetWordExamplesPayload,
  WordExamplesResponse,
} from '../shared/types/messages';

const MYMEMORY_EMAIL = 'kalaama@example.com';

// Local user (no auth for now)
const LOCAL_USER = {
  id: 'local-user',
  email: 'local@kalaama.app',
};

/**
 * Get API key from storage with fallback to environment variable
 * Priority: 1) User setting in chrome.storage, 2) Environment variable (injected at build time)
 */
async function getApiKey(keyName: 'gemini_api_key' | 'openai_api_key' | 'claude_api_key' | 'elevenlabs_api_key'): Promise<string | null> {
  // Try to get from chrome.storage first (user-configured)
  const storage = await chrome.storage.local.get(keyName);
  if (storage[keyName]) {
    return storage[keyName];
  }

  // Fallback to environment variable (injected at build time)
  const envKey = {
    'gemini_api_key': ENV_GEMINI_API_KEY,
    'openai_api_key': ENV_OPENAI_API_KEY,
    'claude_api_key': ENV_CLAUDE_API_KEY,
    'elevenlabs_api_key': ENV_ELEVENLABS_API_KEY,
  }[keyName];

  // Filter out placeholder values
  if (envKey && envKey.startsWith('__') && envKey.endsWith('__')) {
    return null;
  }

  return envKey || null;
}

// =============================================================================
// CACHE INFRASTRUCTURE - 3-tier caching system for API responses
// =============================================================================

// Cache key generators
function generateCacheKey(word: string, targetLang: string, nativeLang: string): string {
  return `wordcontext::${word.toLowerCase()}::${targetLang}::${nativeLang}`;
}

function generateExamplesCacheKey(word: string, targetLang: string, nativeLang: string, count: number): string {
  return `wordexamples::${word.toLowerCase()}::${targetLang}::${nativeLang}::${count}`;
}

// In-memory cache with LRU eviction
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly maxSize: number = 1000;

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    // Remove if exists
    this.cache.delete(key);

    // Add to end
    this.cache.set(key, { value, timestamp: Date.now() });

    // Evict oldest if exceeds max size
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Initialize caches
const wordContextCache = new LRUCache<WordContextResponse>();
const wordExamplesCache = new LRUCache<WordExamplesResponse>();

/**
 * Get cached word context from 3-tier cache:
 * 1. In-memory cache (instant)
 * 2. chrome.storage.local (persistent)
 * 3. Returns null if not found
 */
async function getCachedWordContext(cacheKey: string): Promise<WordContextResponse | null> {
  // Tier 1: In-memory cache
  const memoryEntry = wordContextCache.get(cacheKey);
  if (memoryEntry) {
    return memoryEntry;
  }

  // Tier 2: Chrome storage
  try {
    const storage = await chrome.storage.local.get(cacheKey);
    if (storage[cacheKey]) {
      // Move to memory cache for next access
      wordContextCache.set(cacheKey, storage[cacheKey]);
      return storage[cacheKey];
    }
  } catch (error) {
    console.warn(`[Kalaama] Cache storage read error: ${error}`);
  }

  return null;
}

/**
 * Store word context in both caches (memory + storage)
 */
async function setCachedWordContext(cacheKey: string, context: WordContextResponse): Promise<void> {
  // Store in memory cache
  wordContextCache.set(cacheKey, context);

  // Store in chrome.storage for persistence
  try {
    await chrome.storage.local.set({ [cacheKey]: context });
  } catch (error) {
    console.warn(`[Kalaama] Cache storage write error: ${error}`);
  }
}

/**
 * Get cached word examples from 3-tier cache
 */
async function getCachedWordExamples(cacheKey: string): Promise<WordExamplesResponse | null> {
  // Tier 1: In-memory cache
  const memoryEntry = wordExamplesCache.get(cacheKey);
  if (memoryEntry) {
    return memoryEntry;
  }

  // Tier 2: Chrome storage
  try {
    const storage = await chrome.storage.local.get(cacheKey);
    if (storage[cacheKey]) {
      wordExamplesCache.set(cacheKey, storage[cacheKey]);
      return storage[cacheKey];
    }
  } catch (error) {
    console.warn(`[Kalaama] Cache storage read error: ${error}`);
  }

  return null;
}

/**
 * Store word examples in both caches
 */
async function setCachedWordExamples(cacheKey: string, examples: WordExamplesResponse): Promise<void> {
  wordExamplesCache.set(cacheKey, examples);

  try {
    await chrome.storage.local.set({ [cacheKey]: examples });
  } catch (error) {
    console.warn(`[Kalaama] Cache storage write error: ${error}`);
  }
}

/**
 * Check vocabulary table for already saved word context
 * Returns cached AI context if word was previously processed
 */
async function getWordFromVocabulary(word: string, language: string): Promise<WordContextResponse | null> {
  try {
    const storage = await chrome.storage.local.get('vocabulary');
    const vocabulary = storage.vocabulary || [];

    for (const entry of vocabulary) {
      if (entry.word && entry.word.toLowerCase() === word.toLowerCase() &&
          entry.language === language) {
        // Construct response from saved vocabulary entry
        const response: WordContextResponse = {
          definition: entry.definition || '',
          partOfSpeech: entry.part_of_speech || '',
          examples: entry.examples || [],
          pronunciation: entry.pronunciation || '',
          translation: entry.translation || word
        };
        return response;
      }
    }
  } catch (error) {
    console.warn(`[Kalaama] Vocabulary lookup error: ${error}`);
  }

  return null;
}

// =============================================================================
// REQUEST DEDUPLICATION - Prevent duplicate API calls for same word
// =============================================================================

// Track in-flight requests to deduplicate concurrent requests for same word
const inFlightRequests: Map<string, Promise<any>> = new Map();

/**
 * Execute request with deduplication
 * If same request is already in progress, return existing promise
 * Otherwise, execute and store promise
 */
function executeWithDeduplication<T>(
  cacheKey: string,
  executor: () => Promise<T>
): Promise<T> {
  // Check if request already in flight
  const existingPromise = inFlightRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  // Create new promise and track it
  const promise = executor()
    .then((result) => {
      // Remove from in-flight on success
      inFlightRequests.delete(cacheKey);
      return result;
    })
    .catch((error) => {
      // Remove from in-flight on error (allow retries)
      inFlightRequests.delete(cacheKey);
      throw error;
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

// =============================================================================
// RATE LIMITER - Token bucket algorithm for 15 requests/minute
// Gemini free tier: 15 RPM (requests per minute)
// =============================================================================

class TokenBucketRateLimiter {
  private tokens: number;
  private readonly maxTokens: number = 15; // 15 requests per minute (Gemini free tier)
  private readonly refillRate: number = 0.25; // 1 token per 4 seconds (15 per minute)
  private lastRefillTime: number = Date.now();

  constructor() {
    this.tokens = this.maxTokens;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = Math.min(elapsedSeconds * this.refillRate, this.maxTokens);

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Try to consume a token
   * Returns true if token available, false if rate limited
   */
  tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get time in seconds until next token available
   */
  getTimeUntilNextToken(): number {
    this.refill();
    return Math.ceil((1 - this.tokens) / this.refillRate);
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset limiter (useful for testing)
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }
}

// Global rate limiter instance
const rateLimiter = new TokenBucketRateLimiter();

// =============================================================================
// REQUEST QUEUE - Priority queue respecting rate limit
// =============================================================================

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  priority: number; // 1 = user-facing (word clicks), 0 = background (examples)
  resolve: (value: T) => void;
  reject: (error: any) => void;
  enqueuedAt: number;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing: boolean = false;

  /**
   * Enqueue a request with priority
   * Priority 1: user-facing (word context clicks)
   * Priority 0: background (word examples, grammar analysis)
   */
  enqueue<T>(execute: () => Promise<T>, priority: number = 1): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute,
        priority,
        resolve,
        reject,
        enqueuedAt: Date.now()
      });

      // Sort by priority (higher priority first) and enqueue time (FIFO within priority)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.enqueuedAt - b.enqueuedAt; // Earlier enqueue time first (FIFO)
      });

      this.processQueue();
    });
  }

  /**
   * Process queue respecting rate limit
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue[0];

      // Try to get a token
      if (rateLimiter.tryConsume()) {
        // Token available, process immediately
        this.queue.shift();

        try {
          const result = await request.execute();
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      } else {
        // No token available, wait before trying again
        const waitTime = rateLimiter.getTimeUntilNextToken();
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000 + 100)); // Add 100ms buffer
      }
    }

    this.processing = false;
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue (use with caution)
   */
  clear(): void {
    this.queue.forEach(req => req.reject(new Error('Queue cleared')));
    this.queue = [];
  }
}

// Global request queue
const requestQueue = new RequestQueue();

// =============================================================================
// RETRY LOGIC - Exponential backoff for 429 errors
// =============================================================================

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
}

/**
 * Execute fetch with exponential backoff retry on 429 errors
 * Backoff schedule: 1s → 2s → 4s → 8s (default max 3 retries = 4 total attempts)
 */
async function executeWithRetry(
  fetchFn: () => Promise<Response>,
  options: RetryOptions = {}
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 1000;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn();

      // Check for 429 rate limit error
      if (response.status === 429) {
        // Parse Retry-After header if available
        const retryAfter = response.headers.get('Retry-After');
        let delayMs = initialDelayMs * Math.pow(2, attempt);

        if (retryAfter) {
          // Retry-After can be in seconds or HTTP-date format
          const retrySeconds = parseInt(retryAfter, 10);
          if (!isNaN(retrySeconds)) {
            delayMs = retrySeconds * 1000;
          }
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        } else {
          return response; // Return 429 response to caller for fallback handling
        }
      }

      // Success or non-429 error
      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, initialDelayMs * Math.pow(2, attempt)));
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('All retries exhausted');
}

// =============================================================================
// FREE API INTEGRATION (Wiktionary, Tatoeba, Linguee) - FALLBACK SYSTEM
// =============================================================================

// ISO 639-1 to ISO 639-3 language code mapping (for Tatoeba API)
const ISO_639_1_TO_639_3: Record<string, string> = {
  'en': 'eng',  // English
  'es': 'spa',  // Spanish
  'fr': 'fra',  // French
  'de': 'deu',  // German
  'it': 'ita',  // Italian
  'pt': 'por',  // Portuguese
  'ru': 'rus',  // Russian
  'zh': 'cmn',  // Chinese (Mandarin)
  'ja': 'jpn',  // Japanese
  'ko': 'kor',  // Korean
  'ar': 'ara',  // Arabic
  'wo': 'wol',  // Wolof
};

/**
 * Convert ISO 639-1 language code to ISO 639-3 for Tatoeba API
 */
function convertToISO6393(iso6391: string): string {
  return ISO_639_1_TO_639_3[iso6391] || iso6391;
}

/**
 * Wiktionary API result
 */
interface WiktionaryResult {
  translation: string | null;
  definition: string | null;
  partOfSpeech: string | null;
  pronunciation: string | null;
}

/**
 * Fetch word definition from Wiktionary
 * Uses parsing API to get translations and definitions
 */
async function fetchFromWiktionary(word: string, targetLang: string, nativeLang: string): Promise<WiktionaryResult> {
  try {
    // Use native language Wiktionary to get translation definition
    // This is more reliable for translations
    const parseUrl = `https://${nativeLang}.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&format=json`;

    const response = await fetch(parseUrl);

    if (!response.ok) {
      return { translation: null, definition: null, partOfSpeech: null, pronunciation: null };
    }

    const data = await response.json() as Record<string, any>;
    const html = data.parse?.text?.['*'] || '';

    // If empty, word not found
    if (!html || html.length === 0) {
      return { translation: null, definition: null, partOfSpeech: null, pronunciation: null };
    }

    let translation: string | null = null;
    let definition: string | null = null;
    let partOfSpeech: string | null = null;
    let pronunciation: string | null = null;

    // Extract definition - look for the first list item with content
    const listMatch = html.match(/<li[^>]*>(.*?)<\/li>/i);
    if (listMatch) {
      const text = listMatch[1].replace(/<[^>]*>/g, '').trim();
      if (text && text.length > 0) {
        definition = text.substring(0, 200);
      }
    }

    // Extract part of speech - usually appears in parentheses or as a bold heading
    const posMatch = html.match(/<dt[^>]*>(.*?)<\/dt>/i);
    if (posMatch) {
      const text = posMatch[1].replace(/<[^>]*>/g, '').trim();
      if (text && text.length > 0) {
        partOfSpeech = text.substring(0, 50);
      }
    }

    // For translation: use simple logic
    // The first definition line usually contains the translation
    if (definition && !translation) {
      translation = definition;
    }

    // Extract pronunciation if available (usually in parentheses)
    const pronMatch = html.match(/\(([^)]*(?:pronunciation|pronunciation guide)[^)]*)\)/i);
    if (pronMatch) {
      pronunciation = pronMatch[1].trim();
    }

    return {
      translation: translation || null,
      definition: definition || null,
      partOfSpeech: partOfSpeech || null,
      pronunciation: pronunciation || null
    };
  } catch (error) {
    console.warn('[Kalaama] Wiktionary fetch failed:', error);
    return { translation: null, definition: null, partOfSpeech: null, pronunciation: null };
  }
}

/**
 * Fetch example sentences from Tatoeba
 */
async function fetchFromTatoeba(word: string, targetLang: string, nativeLang: string, count: number = 15): Promise<string[]> {
  try {
    // Convert language codes to ISO 639-3 for Tatoeba API
    const fromLang = convertToISO6393(targetLang);
    const toLang = convertToISO6393(nativeLang);

    // Build API URL
    const params = new URLSearchParams({
      query: word,
      from: fromLang,
      to: toLang,
      trans_filter: 'limit', // Only get sentences with translations
      sort: 'relevance'
    });

    const apiUrl = `https://tatoeba.org/en/api_v0/search?${params.toString()}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as Record<string, any>;
    const results = data.results || [];

    // Format examples as "Source (Translation)"
    const examples = results.slice(0, count).map((result: Record<string, any>) => {
      const source = result.text || '';
      const translations = result.translations || [];

      if (translations.length > 0 && translations[0].length > 0) {
        const translation = translations[0][0].text || '';
        return `${source} (${translation})`;
      }

      return source;
    }).filter((ex: string) => ex.length > 0);

    return examples;
  } catch (error) {
    console.warn('[Kalaama] Tatoeba fetch failed:', error);
    return [];
  }
}

/**
 * Linguee API result
 */
interface LingueeResult {
  translation: string | null;
  definition: string | null;
  examples: string[];
}

/**
 * Fetch translations and examples from Linguee (HTML scraping)
 */
async function fetchFromLinguee(word: string, targetLang: string, nativeLang: string): Promise<LingueeResult> {
  try {
    // Map language codes to Linguee format (e.g., de-en for German-English)
    const langMap: Record<string, string> = {
      'en': 'en',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'it': 'it',
      'pt': 'pt',
      'ru': 'ru',
      'zh': 'zh',
      'ja': 'ja',
      'ko': 'ko',
      'ar': 'ar',
      'wo': 'wo'
    };

    const targetCode = langMap[targetLang] || targetLang;
    const nativeCode = langMap[nativeLang] || nativeLang;
    const langPair = `${targetCode}-${nativeCode}`;

    // Build Linguee URL
    const url = `https://www.linguee.com/${langPair}/search?source_lang=${targetCode}&target_lang=${nativeCode}&query=${encodeURIComponent(word)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return { translation: null, definition: null, examples: [] };
    }

    const html = await response.text();

    // Parse HTML to extract translations and examples
    let translation: string | null = null;
    let definition: string | null = null;
    const examples: string[] = [];

    // Extract main translation from the first translation entry
    // Look for pattern: <span class="translation">...</span>
    const translationMatch = html.match(/<a[^>]*class="[^"]*translation[^"]*"[^>]*>([^<]+)<\/a>/);
    if (translationMatch) {
      translation = translationMatch[1].trim();
    }

    // If main translation not found, try alternative patterns
    if (!translation) {
      const altMatch = html.match(/<div[^>]*class="[^"]*dictLink[^"]*"[^>]*>([^<]+)<\/div>/);
      if (altMatch) {
        translation = altMatch[1].trim();
      }
    }

    // Extract examples - look for example sentences with translations
    const examplePattern = /<div[^>]*class="[^"]*example[^"]*"[^>]*>([^<]+)<\/div>/g;
    let match;
    while ((match = examplePattern.exec(html)) !== null && examples.length < 10) {
      const example = match[1].trim();
      if (example.length > 0 && example.length < 200) {
        examples.push(example);
      }
    }

    // Alternative example pattern
    if (examples.length < 5) {
      const exampleSentencePattern = /<span[^>]*class="[^"]*sentence[^"]*"[^>]*>([^<]+)<\/span>/g;
      while ((match = exampleSentencePattern.exec(html)) !== null && examples.length < 10) {
        const example = match[1].trim();
        if (example.length > 0 && example.length < 200 && !examples.includes(example)) {
          examples.push(example);
        }
      }
    }

    return {
      translation: translation || null,
      definition: definition || null,
      examples: examples.slice(0, 5) // Limit to 5 examples
    };
  } catch (error) {
    console.warn('[Kalaama] Linguee fetch failed, continuing with other sources:', error instanceof Error ? error.message : 'Unknown error');
    return { translation: null, definition: null, examples: [] };
  }
}

/**
 * Fetch word context from all free APIs in parallel (Wiktionary + Tatoeba + Linguee)
 * Returns combined results with priority: Wiktionary > Linguee > MyMemory (for translation only)
 */
async function fetchFromFreeAPIs(word: string, targetLanguage: string, nativeLanguage: string): Promise<WordContextResponse> {
  try {
    // Call all 3 APIs in parallel
    const [wiktResult, tatoResult, lingueeResult] = await Promise.allSettled([
      fetchFromWiktionary(word, targetLanguage, nativeLanguage),
      fetchFromTatoeba(word, targetLanguage, nativeLanguage, 15),
      fetchFromLinguee(word, targetLanguage, nativeLanguage)
    ]);

    // Extract values (handle rejections)
    const wikt = wiktResult.status === 'fulfilled' ? wiktResult.value : null;
    const tato = tatoResult.status === 'fulfilled' ? tatoResult.value : [];
    const ling = lingueeResult.status === 'fulfilled' ? lingueeResult.value : null;

    // Combine with priority: Wiktionary > Linguee > MyMemory (for translation)
    let translation = wikt?.translation || ling?.translation || '';
    const definition = wikt?.definition || ling?.definition || '';
    const partOfSpeech = wikt?.partOfSpeech || '';
    const pronunciation = wikt?.pronunciation || '';
    const examples = tato && tato.length > 0 ? tato : (ling?.examples || []);

    // If still no translation, try MyMemory as absolute fallback
    if (!translation || translation.trim().length === 0) {
      try {
        const mymemResult = await translateWord({
          word,
          fromLang: targetLanguage,
          toLang: nativeLanguage
        });
        translation = mymemResult.translation;
      } catch {
        // MyMemory also failed
      }
    }

    // Validate: must have translation at minimum
    if (!translation || translation.trim().length === 0) {
      throw new Error('No translation available from any source');
    }

    return {
      translation: translation.trim(),
      definition: definition?.trim() || '',
      partOfSpeech: partOfSpeech?.trim() || '',
      pronunciation: pronunciation?.trim() || '',
      examples: examples
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Kalaama] Free APIs failed:', errorMsg);
    throw new Error('Unable to fetch word info. Please try again.');
  }
}

// Message handler
console.log('[Kalaama SW] Registering message listener...');
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('[Kalaama SW] Received message:', message.type, 'from:', sender.tab ? `tab ${sender.tab.id}` : 'extension');
  handleMessage(message, sender)
    .then((response) => {
      console.log('[Kalaama SW] Sending response for:', message.type);
      sendResponse(response);
    })
    .catch((error) => {
      console.error('[Kalaama SW] Error handling:', message.type, error);
      sendResponse({ error: error.message });
    });
  return true; // Keep channel open for async response
});
console.log('[Kalaama SW] Message listener registered!');

/**
 * Main message handler - routes messages to appropriate functions
 */
async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case 'GET_USER':
      return getUser();

    case 'SAVE_WORD':
      return saveWord(message.payload as SaveWordPayload);

    case 'TRANSLATE_WORD':
      return translateWord(message.payload as TranslateWordPayload);

    case 'GET_SETTINGS':
      return getSettings();

    case 'UPDATE_SETTINGS':
      return updateSettings(message.payload);

    case 'GET_VOCABULARY':
      return getVocabulary(message.payload as { language?: string; limit?: number });

    case 'DELETE_WORD':
      return deleteWord(message.payload as { wordId: string });

    case 'FETCH_CAPTIONS': 
      return fetchCaptions(message.payload as FetchCaptionsPayload);

    // Side panel relay messages
    case 'CAPTION_CUE_CHANGE':
    case 'VIDEO_INFO':
    case 'CAPTION_STATUS':
    case 'ALL_CAPTIONS':
    case 'CUE_INDEX_CHANGE':
    // Reading mode messages to forward to side panel
    case 'READING_PAGE_INFO':
    case 'READING_MODE_STATUS':
    case 'READING_WORD_CLICK':
      // Forward to side panel
      await sendToSidePanel(message);
      return { forwarded: true };

    // Grammar analysis for reading mode
    case 'GET_GRAMMAR_ANALYSIS':
      return getGrammarAnalysis(message.payload as GrammarAnalysisPayload);

    // Video control - forward to content script
    case 'VIDEO_CONTROL':
    case 'SEEK_TO_CUE':
    case 'SET_PLAYBACK_SPEED':
    case 'SET_LOOP_SEGMENT':
    case 'CLEAR_LOOP_SEGMENT':
    case 'SET_REPEAT_COUNT':
    case 'SET_AUTO_PAUSE':
    case 'CHANGE_SUBTITLE_TRACK':
    case 'GET_VIDEO_STATE':
      return forwardToContentScript(message);

    // AI word context
    case 'GET_WORD_CONTEXT':
      return getWordContext(message.payload as WordContextPayload);

    // Get word examples (20 examples for vocabulary detail)
    case 'GET_WORD_EXAMPLES':
      return getWordExamples(message.payload as GetWordExamplesPayload);

    // AI Tutor for learning feature
    case 'GET_AI_TUTOR_RESPONSE':
      return getAITutorResponse(message.payload as AITutorPayload);

    // Conversation-based AI Tutor (new themed learning)
    case 'GET_CONVERSATION_TUTOR_RESPONSE':
      return getConversationTutorResponse(message.payload as ConversationTutorPayload);

    // Text-to-Speech
    case 'TEXT_TO_SPEECH':
      return textToSpeech(message.payload as TTSPayload);

    // Fetch file for PDF reading (file:// URLs)
    case 'FETCH_FILE_DATA':
      return fetchFileData(message.payload as { url: string });

    default:
      console.warn('[Kalaama] Unknown message type:', message.type);
      return { error: 'Unknown message type' };
  }
}

/**
 * Fetch file data (for file:// URLs that content scripts can't access)
 */
async function fetchFileData(payload: { url: string }): Promise<{ data: number[] } | { error: string }> {
  console.log('[Kalaama] Fetching file:', payload.url);

  try {
    const response = await fetch(payload.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    // Convert ArrayBuffer to regular array for JSON serialization
    const data = Array.from(new Uint8Array(arrayBuffer));
    console.log('[Kalaama] File fetched, size:', data.length);
    return { data };
  } catch (error) {
    console.error('[Kalaama] Failed to fetch file:', error);
    return { error: (error as Error).message };
  }
}

/**
 * Get current user (local mode - always returns local user)
 */
async function getUser(): Promise<typeof LOCAL_USER> {
  // SUPABASE DISABLED - Return local user
  // const { data: { user } } = await supabase.auth.getUser();
  // return user;
  return LOCAL_USER;
}

/**
 * Save a word to vocabulary (using chrome.storage.local)
 */
async function saveWord(payload: SaveWordPayload): Promise<unknown> {
  const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');

  const wordId = `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Check if word already exists
  const existingIndex = vocabulary.findIndex(
    (v: any) => v.word === payload.word && v.language === payload.language
  );

  const wordEntry = {
    id: existingIndex >= 0 ? vocabulary[existingIndex].id : wordId,
    user_id: LOCAL_USER.id,
    word: payload.word,
    translation: payload.translation,
    language: payload.language,
    context_sentence: payload.contextSentence || null,
    video_id: payload.videoId || null,
    video_title: payload.videoTitle || null,
    // Full AI context from Gemini
    definition: payload.definition || '',
    part_of_speech: payload.partOfSpeech || '',
    examples: payload.examples || [],
    pronunciation: payload.pronunciation || '',
    mastery_level: 0,
    review_count: 0,
    created_at: existingIndex >= 0 ? vocabulary[existingIndex].created_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    vocabulary[existingIndex] = wordEntry;
  } else {
    vocabulary.unshift(wordEntry);
  }

  await chrome.storage.local.set({ vocabulary });

  console.log('[Kalaama] Word saved:', wordEntry.word);
  return wordEntry;
}

/**
 * Translate a word using free APIs
 */
async function translateWord(payload: TranslateWordPayload): Promise<{ translation: string; source: string }> {
  const { word, fromLang, toLang } = payload;

  // Try MyMemory first (most reliable free option)
  try {
    const params = new URLSearchParams({
      q: word,
      langpair: `${fromLang}|${toLang}`,
      de: MYMEMORY_EMAIL,
    });

    const response = await fetch(`https://api.mymemory.translated.net/get?${params}`);
    const data = await response.json();

    if (data.responseStatus === 200) {
      return {
        translation: data.responseData.translatedText,
        source: 'mymemory',
      };
    }
  } catch (error) {
    console.warn('[Kalaama] MyMemory translation failed');
  }

  // Fallback to Google Translate (unofficial)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(word)}`;
    const response = await fetch(url);
    const data = await response.json();

    return {
      translation: data[0][0][0],
      source: 'google-free',
    };
  } catch (error) {
    console.warn('[Kalaama] All translation APIs failed');
    throw new Error('Translation failed');
  }
}

/**
 * Get user settings (from chrome.storage.local)
 */
async function getSettings(): Promise<unknown> {
  const { settings = getDefaultSettings() } = await chrome.storage.local.get('settings');
  return settings;
}

/**
 * Update user settings (in chrome.storage.local)
 */
async function updateSettings(newSettings: unknown): Promise<unknown> {
  const { settings = getDefaultSettings() } = await chrome.storage.local.get('settings');

  const updatedSettings = {
    ...settings,
    ...(newSettings as Record<string, unknown>),
    updated_at: new Date().toISOString(),
  };

  await chrome.storage.local.set({ settings: updatedSettings });
  return updatedSettings;
}

/**
 * Get user vocabulary (from chrome.storage.local)
 */
async function getVocabulary(options: { language?: string; limit?: number }): Promise<unknown[]> {
  const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');

  let result = [...vocabulary];

  if (options.language) {
    result = result.filter((v: any) => v.language === options.language);
  }

  if (options.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Delete a word from vocabulary (from chrome.storage.local)
 */
async function deleteWord(payload: { wordId: string }): Promise<void> {
  const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');

  const updatedVocabulary = vocabulary.filter((v: any) => v.id !== payload.wordId);

  await chrome.storage.local.set({ vocabulary: updatedVocabulary });
  console.log('[Kalaama] Word deleted:', payload.wordId);
}

/**
 * Fetch captions from YouTube (service worker - fallback method)
 *
 * NOTE: The primary caption fetching now happens through the injected script
 * which has access to YouTube's page cookies and session. This service worker
 * method is kept as a fallback but may not work for all videos due to
 * YouTube's signature-based URL protection.
 */
async function fetchCaptions(payload: FetchCaptionsPayload): Promise<{ content: string; format: string }> {
  const { baseUrl } = payload;

  console.log('[Kalaama SW] Fetching captions (fallback method):', baseUrl.substring(0, 80));

  const urlObj = new URL(baseUrl);
  const videoId = urlObj.searchParams.get('v');
  const lang = urlObj.searchParams.get('lang');

  // Method 1: Try the ORIGINAL URL as-is first (preserves signature)
  try {
    console.log('[Kalaama SW] Method 1: Trying original URL as-is');
    const response = await fetch(baseUrl, {
      headers: { 'Accept': '*/*' }
    });

    if (response.ok) {
      const text = await response.text();
      console.log('[Kalaama SW] Original URL response length:', text.length);
      if (text && text.trim().length > 0) {
        const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
        return { content: text, format: isJson ? 'json3' : 'xml' };
      }
    }
  } catch (error) {
    console.warn('[Kalaama SW] Original URL fetch failed:', error);
  }

  // Method 2: Try with fmt=json3 (may work if signature allows extra params)
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('fmt', 'json3');

    console.log('[Kalaama SW] Method 2: Trying with fmt=json3');
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json, */*' }
    });

    if (response.ok) {
      const text = await response.text();
      console.log('[Kalaama SW] JSON3 response length:', text.length);
      if (text && text.trim().length > 0) {
        return { content: text, format: 'json3' };
      }
    }
  } catch (error) {
    console.warn('[Kalaama SW] JSON3 fetch failed:', error);
  }

  // Method 3: Fetch fresh caption data from video page (new signature)
  if (videoId) {
    try {
      console.log('[Kalaama SW] Method 3: Fetching fresh captions for video:', videoId);
      const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const html = await pageResponse.text();

      const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (match) {
        const playerData = JSON.parse(match[1]);
        const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (tracks && tracks.length > 0) {
          let track = tracks.find((t: any) => t.languageCode === lang);
          if (!track) track = tracks.find((t: any) => !t.kind || t.kind !== 'asr');
          if (!track) track = tracks[0];

          // Try fresh URL as-is first
          console.log('[Kalaama SW] Trying fresh URL as-is');
          const rawResponse = await fetch(track.baseUrl);
          if (rawResponse.ok) {
            const text = await rawResponse.text();
            console.log('[Kalaama SW] Fresh URL response length:', text.length);
            if (text && text.trim().length > 0) {
              const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
              return { content: text, format: isJson ? 'json3' : 'xml' };
            }
          }

          // Try with fmt=json3
          const freshUrl = new URL(track.baseUrl);
          freshUrl.searchParams.set('fmt', 'json3');
          console.log('[Kalaama SW] Trying fresh URL with fmt=json3');
          const captionResponse = await fetch(freshUrl.toString());

          if (captionResponse.ok) {
            const text = await captionResponse.text();
            if (text && text.trim().length > 0) {
              return { content: text, format: 'json3' };
            }
          }
        }
      }
    } catch (error) {
      console.warn('[Kalaama SW] Fresh caption fetch failed:', error);
    }
  }

  // Method 4: Direct timedtext API (may work for public captions)
  if (videoId && lang) {
    try {
      console.log('[Kalaama SW] Method 4: Trying direct timedtext API');
      const directUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const response = await fetch(directUrl);

      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 0) {
          return { content: text, format: 'json3' };
        }
      }
    } catch (error) {
      console.warn('[Kalaama SW] Direct timedtext API failed:', error);
    }
  }

  throw new Error('Failed to fetch captions from all sources');
}

/**
 * Default settings
 */
function getDefaultSettings() {
  return {
    target_language: 'es',
    native_language: 'en',
    subtitle_font_size: 18,
    subtitle_position: 'bottom',
    auto_pause_on_click: false,
    auto_pause_after_caption: false,
    highlight_unknown_words: true,
    show_pronunciation: true,
    theme: 'auto',
  };
}

// =============================================================================
// SIDE PANEL SUPPORT
// =============================================================================

/**
 * Enable side panel on extension icon click
 */
chrome.action.onClicked.addListener(async (tab) => {
  // Open side panel when extension icon is clicked
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.warn('[Kalaama] Failed to open side panel:', error);
  }
});

/**
 * Set up side panel behavior
 */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
  console.warn('[Kalaama] Failed to set panel behavior:', error);
});

/**
 * Forward caption updates from content script to side panel
 */
async function sendToSidePanel(message: unknown): Promise<void> {
  try {
    console.log('[Kalaama SW] Forwarding to side panel:', (message as any).type);
    // Send to all extension pages (including side panel)
    await chrome.runtime.sendMessage(message);
    console.log('[Kalaama SW] Message forwarded successfully');
  } catch (error) {
    // Side panel might not be open
    console.debug('[Kalaama SW] Could not send to side panel:', error);
  }
}

/**
 * Forward message to content script in active tab
 */
async function forwardToContentScript(message: Message): Promise<unknown> {
  try {
    // First try to find a YouTube tab
    const youtubeTabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
    let targetTab = youtubeTabs.find(t => t.active) || youtubeTabs[0];

    // If no YouTube tab, fall back to active tab
    if (!targetTab) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTab = activeTab;
    }

    if (!targetTab?.id) {
      throw new Error('No target tab found');
    }

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(targetTab!.id!, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  } catch (error) {
    console.error('[Kalaama] Failed to forward to content script:', error);
    throw error;
  }
}

/**
 * Get AI word context using Google Gemini API with aggressive caching
 * Flow: Cache lookup → Vocabulary check → Rate-limited API call → Store results
 */
async function getWordContext(payload: WordContextPayload): Promise<WordContextResponse> {
  const { word, sentence, targetLanguage, nativeLanguage } = payload;

  // Generate cache key
  const cacheKey = generateCacheKey(word, targetLanguage, nativeLanguage);

  // Tier 1: Check 3-tier cache system (memory → storage)
  const cachedResult = await getCachedWordContext(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Tier 2: Check vocabulary table for previously saved word
  const vocabularyResult = await getWordFromVocabulary(word, targetLanguage);
  if (vocabularyResult) {
    // Store in cache for future access
    await setCachedWordContext(cacheKey, vocabularyResult);
    return vocabularyResult;
  }

  // Deduplication: If same request is in-flight, return existing promise
  const result = await executeWithDeduplication(cacheKey, async () => {
    // Priority queue: enqueue with priority 1 (user-facing request)
    return requestQueue.enqueue(
      () => fetchWordContextFromGemini(word, sentence, targetLanguage, nativeLanguage, cacheKey),
      1 // User-facing priority
    );
  });

  return result;
}

/**
 * Internal function: Fetch word context with fallback chain
 * Priority: Claude (primary) → Gemini (fallback) → MyMemory (last resort)
 */
async function fetchWordContextFromGemini(
  word: string,
  sentence: string | undefined,
  targetLanguage: string,
  nativeLanguage: string,
  cacheKey: string
): Promise<WordContextResponse> {
  // Get API keys from storage or environment
  const claude_api_key = await getApiKey('claude_api_key');
  const gemini_api_key = await getApiKey('gemini_api_key');

  // Try Claude first if available
  if (claude_api_key) {
    try {
      const result = await fetchWordContextFromClaude(word, sentence, targetLanguage, nativeLanguage);
      await setCachedWordContext(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('[Kalaama] Claude API failed, trying free APIs');
    }
  }

  // Try free APIs (Wiktionary + Tatoeba + Linguee) - no rate limits
  try {
    const result = await fetchFromFreeAPIs(word, targetLanguage, nativeLanguage);
    await setCachedWordContext(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[Kalaama] Free APIs failed, trying Gemini as last resort');
  }

  // Final fallback to Gemini if available
  if (gemini_api_key) {
    try {
      const result = await fetchWordContextFromGeminiAPI(word, sentence, targetLanguage, nativeLanguage);
      await setCachedWordContext(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('[Kalaama] Gemini API failed, no more fallbacks');
    }
  }

  // All APIs exhausted
  throw new Error('Unable to fetch word info. Please check your connection and try again.');
}

/**
 * Fetch word context from Claude API with retry logic
 */
async function fetchWordContextFromClaude(
  word: string,
  sentence: string | undefined,
  targetLanguage: string,
  nativeLanguage: string
): Promise<WordContextResponse> {
  const claude_api_key = await getApiKey('claude_api_key');
  if (!claude_api_key) throw new Error('Claude API key not available');

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof'
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;
  const nativeLangName = languageNames[nativeLanguage] || nativeLanguage;

  // Check if we have meaningful sentence context
  const hasContext = sentence && sentence.trim().toLowerCase() !== word.toLowerCase() && sentence.length > word.length + 5;

  const prompt = hasContext
    ? `For the ${targetLangName} word "${word}" appearing in the sentence "${sentence}", provide:
1. Definition in ${nativeLangName}
2. Part of speech (noun, verb, adjective, adverb, etc.)
3. 2-3 example sentences using this word with ${nativeLangName} translations
4. Pronunciation guide (phonetic) if applicable
5. Translation to ${nativeLangName}

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "definition": "the definition here",
  "partOfSpeech": "noun/verb/etc",
  "examples": ["example 1 - translation 1", "example 2 - translation 2"],
  "pronunciation": "/pronunciation/",
  "translation": "word translation"
}`
    : `Translate and explain the ${targetLangName} word "${word}":
1. Provide the ${nativeLangName} translation
2. Definition in ${nativeLangName}
3. Part of speech (noun, verb, adjective, adverb, etc.)
4. 2-3 example sentences using this word with ${nativeLangName} translations

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "definition": "the definition here",
  "partOfSpeech": "noun/verb/etc",
  "examples": ["example 1 - translation 1", "example 2 - translation 2"],
  "pronunciation": "/pronunciation/",
  "translation": "word translation"
}`;

  // Execute fetch with retry logic
  const response = await executeWithRetry(
    () => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claude_api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    }),
    { maxRetries: 3, initialDelayMs: 1000 }
  );

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.content?.[0]?.text;

  if (!textContent) {
    throw new Error('No response from Claude');
  }

  // Extract JSON from response
  let jsonStr = textContent.trim();
  const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) ||
                    jsonStr.match(/```\s*([\s\S]*?)\s*```/) ||
                    jsonStr.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const result = JSON.parse(jsonStr);

  const wordContextResult: WordContextResponse = {
    definition: result.definition || '',
    partOfSpeech: result.partOfSpeech || result.part_of_speech || '',
    examples: Array.isArray(result.examples) ? result.examples : [],
    pronunciation: result.pronunciation || '',
    translation: result.translation || word
  };

  return wordContextResult;
}

/**
 * Fetch word context from Gemini API with retry logic
 */
async function fetchWordContextFromGeminiAPI(
  word: string,
  sentence: string | undefined,
  targetLanguage: string,
  nativeLanguage: string
): Promise<WordContextResponse> {
  const gemini_api_key = await getApiKey('gemini_api_key');
  if (!gemini_api_key) throw new Error('Gemini API key not available');

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof'
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;
  const nativeLangName = languageNames[nativeLanguage] || nativeLanguage;

  // Check if we have meaningful sentence context
  const hasContext = sentence && sentence.trim().toLowerCase() !== word.toLowerCase() && sentence.length > word.length + 5;

  const prompt = hasContext
    ? `For the ${targetLangName} word "${word}" appearing in the sentence "${sentence}", provide:
1. Definition in ${nativeLangName}
2. Part of speech (noun, verb, adjective, adverb, etc.)
3. 2-3 example sentences using this word with ${nativeLangName} translations
4. Pronunciation guide (phonetic) if applicable
5. Translation to ${nativeLangName}

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "definition": "the definition here",
  "partOfSpeech": "noun/verb/etc",
  "examples": ["example 1 - translation 1", "example 2 - translation 2"],
  "pronunciation": "/pronunciation/",
  "translation": "word translation"
}`
    : `Translate and explain the ${targetLangName} word "${word}":
1. Provide the ${nativeLangName} translation
2. Definition in ${nativeLangName}
3. Part of speech (noun, verb, adjective, adverb, etc.)
4. 2-3 example sentences using this word with ${nativeLangName} translations

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "definition": "the definition here",
  "partOfSpeech": "noun/verb/etc",
  "examples": ["example 1 - translation 1", "example 2 - translation 2"],
  "pronunciation": "/pronunciation/",
  "translation": "word translation"
}`;

  // Execute fetch with retry logic
  const response = await executeWithRetry(
    () => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemini_api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      }
    ),
    { maxRetries: 3, initialDelayMs: 1000 }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('No response from Gemini');
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = textContent.trim();

  // Try different patterns to extract JSON
  const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) ||
                    jsonStr.match(/```\s*([\s\S]*?)\s*```/) ||
                    jsonStr.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const result = JSON.parse(jsonStr);

  const wordContextResult: WordContextResponse = {
    definition: result.definition || '',
    partOfSpeech: result.partOfSpeech || result.part_of_speech || '',
    examples: Array.isArray(result.examples) ? result.examples : [],
    pronunciation: result.pronunciation || '',
    translation: result.translation || word
  };

  return wordContextResult;
}

/**
 * Get word examples from Gemini AI with caching
 * Priority 0 (background task) - lower priority than word context
 */
async function getWordExamples(payload: GetWordExamplesPayload): Promise<WordExamplesResponse> {
  const { word, targetLanguage, nativeLanguage, count } = payload;

  // Generate cache key
  const cacheKey = generateExamplesCacheKey(word, targetLanguage, nativeLanguage, count);

  // Tier 1: Check cache
  const cachedResult = await getCachedWordExamples(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Deduplication: If same request is in-flight, return existing promise
  const result = await executeWithDeduplication(cacheKey, async () => {
    // Priority queue: enqueue with priority 0 (background task)
    return requestQueue.enqueue(
      () => fetchWordExamplesFromGemini(word, targetLanguage, nativeLanguage, count, cacheKey),
      0 // Background priority
    );
  });

  return result;
}

/**
 * Internal function: Fetch word examples with fallback chain
 * Priority: Claude (primary) → Gemini (fallback)
 */
async function fetchWordExamplesFromGemini(
  word: string,
  targetLanguage: string,
  nativeLanguage: string,
  count: number,
  cacheKey: string
): Promise<WordExamplesResponse> {
  const claude_api_key = await getApiKey('claude_api_key');
  const gemini_api_key = await getApiKey('gemini_api_key');

  // Try Claude first if available
  if (claude_api_key) {
    try {
      const result = await fetchWordExamplesFromClaudeAPI(word, targetLanguage, nativeLanguage, count);
      await setCachedWordExamples(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('[Kalaama] Claude examples API failed, trying Gemini');
    }
  }

  // Fall back to Gemini if available
  if (!gemini_api_key) {
    throw new Error('No AI API keys configured');
  }

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof'
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;
  const nativeLangName = languageNames[nativeLanguage] || nativeLanguage;

  const prompt = `Generate ${count} diverse example sentences using the ${targetLangName} word "${word}".

Requirements:
- Each example should show different contexts and uses of the word
- Include the ${nativeLangName} translation for each sentence
- Examples should range from simple to complex
- Vary the sentence structures and topics
- Make examples practical and useful for language learners

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "examples": [
    "${targetLangName} sentence 1 - ${nativeLangName} translation 1",
    "${targetLangName} sentence 2 - ${nativeLangName} translation 2",
    ...
  ]
}`;

  try {
    const result = await fetchWordExamplesFromGeminiAPI(word, targetLanguage, nativeLanguage, count);
    await setCachedWordExamples(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[Kalaama] Failed to fetch examples from all APIs');
    throw error;
  }
}

/**
 * Fetch word examples from Claude API with retry logic
 */
async function fetchWordExamplesFromClaudeAPI(
  word: string,
  targetLanguage: string,
  nativeLanguage: string,
  count: number
): Promise<WordExamplesResponse> {
  const claude_api_key = await getApiKey('claude_api_key');
  if (!claude_api_key) throw new Error('Claude API key not available');

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof'
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;
  const nativeLangName = languageNames[nativeLanguage] || nativeLanguage;

  const prompt = `Generate ${count} diverse example sentences using the ${targetLangName} word "${word}".

Requirements:
- Each example should show different contexts and uses of the word
- Include the ${nativeLangName} translation for each sentence
- Examples should range from simple to complex
- Vary the sentence structures and topics
- Make examples practical and useful for language learners

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "examples": [
    "${targetLangName} sentence 1 - ${nativeLangName} translation 1",
    "${targetLangName} sentence 2 - ${nativeLangName} translation 2",
    ...
  ]
}`;

  try {
    const response = await executeWithRetry(
      () => fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claude_api_key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      }),
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.content?.[0]?.text;

    if (!textContent) {
      throw new Error('No response from Claude');
    }

    // Extract JSON from response
    let jsonStr = textContent.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/```\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);
    return {
      examples: Array.isArray(result.examples) ? result.examples : []
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch word examples from Gemini API with retry logic
 */
async function fetchWordExamplesFromGeminiAPI(
  word: string,
  targetLanguage: string,
  nativeLanguage: string,
  count: number
): Promise<WordExamplesResponse> {
  const gemini_api_key = await getApiKey('gemini_api_key');
  if (!gemini_api_key) throw new Error('Gemini API key not available');

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof'
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;
  const nativeLangName = languageNames[nativeLanguage] || nativeLanguage;

  const prompt = `Generate ${count} diverse example sentences using the ${targetLangName} word "${word}".

Requirements:
- Each example should show different contexts and uses of the word
- Include the ${nativeLangName} translation for each sentence
- Examples should range from simple to complex
- Vary the sentence structures and topics
- Make examples practical and useful for language learners

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "examples": [
    "${targetLangName} sentence 1 - ${nativeLangName} translation 1",
    "${targetLangName} sentence 2 - ${nativeLangName} translation 2",
    ...
  ]
}`;

  try {
    const response = await executeWithRetry(
      () => fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemini_api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          })
        }
      ),
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No response from Gemini');
    }

    // Extract JSON from response
    let jsonStr = textContent.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/```\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);
    return {
      examples: Array.isArray(result.examples) ? result.examples : []
    };
  } catch (error) {
    throw error;
  }
}

// ============================================
// AI TUTOR FUNCTIONS
// ============================================

/**
 * Get AI tutor response for language learning
 */
async function getAITutorResponse(payload: AITutorPayload): Promise<AITutorResponse> {
  const { userResponse, lessonContext, currentPrompt, language, nativeLanguage, conversationHistory } = payload;

  // Get AI provider from storage
  const storage = await chrome.storage.local.get(['ai_provider']);
  const provider: AIProvider = storage.ai_provider || 'gemini';

  // Get API keys with environment fallback
  const gemini_api_key = await getApiKey('gemini_api_key');
  const openai_api_key = await getApiKey('openai_api_key');
  const claude_api_key = await getApiKey('claude_api_key');

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof'
  };

  const targetLangName = languageNames[language] || language;
  const nativeLangName = languageNames[nativeLanguage] || nativeLanguage;

  // Check if user response matches expected
  const isCorrect = checkResponse(userResponse, currentPrompt.expectedResponses || [], currentPrompt.targetPhrase);

  // Build conversation context
  const historyText = conversationHistory?.slice(-4)
    .map(turn => `${turn.role === 'user' ? 'Student' : 'Tutor'}: ${turn.text}`)
    .join('\n') || '';

  const systemPrompt = `You are a friendly, encouraging ${targetLangName} language tutor helping a student learn.

CONTEXT:
- Lesson: ${lessonContext}
- Current task: ${currentPrompt.instruction}
- Expected phrase: "${currentPrompt.targetPhrase || 'any valid response'}"
- Student's native language: ${nativeLangName}

${historyText ? `Recent conversation:\n${historyText}\n` : ''}

The student just said: "${userResponse}"
${isCorrect ? 'Their response was CORRECT!' : 'Their response needs improvement.'}

Respond naturally in 1-2 SHORT sentences (max 30 words):
1. ${isCorrect ? 'Praise them briefly' : 'Gently correct them'}
2. If wrong, show the correct phrase
3. Encourage them to continue

IMPORTANT: Respond ONLY with valid JSON:
{
  "text": "Your response here",
  "isCorrect": ${isCorrect},
  "correction": ${isCorrect ? 'null' : '"correct phrase here"'},
  "encouragement": "${isCorrect ? 'Great job!' : 'Keep practicing!'}"
}`;

  try {
    let aiResponse: string;

    switch (provider) {
      case 'openai':
        aiResponse = await callOpenAI(systemPrompt, openai_api_key);
        break;
      case 'claude':
        aiResponse = await callClaude(systemPrompt, claude_api_key);
        break;
      case 'gemini':
      default:
        aiResponse = await callGemini(systemPrompt, gemini_api_key);
        break;
    }

    // Parse response
    const parsed = parseAIResponse(aiResponse, isCorrect, currentPrompt.targetPhrase);
    return {
      ...parsed,
      shouldAdvance: true,
      xpEarned: isCorrect ? 5 : 1,
    };
  } catch (error) {
    console.error('[Kalaama] AI tutor error:', error);
    // Fallback response
    return {
      text: isCorrect
        ? 'Great job! That\'s correct. Let\'s continue.'
        : `Good try! The correct phrase is "${currentPrompt.targetPhrase}". Keep practicing!`,
      isCorrect,
      correction: isCorrect ? undefined : currentPrompt.targetPhrase,
      encouragement: isCorrect ? 'Excellent!' : 'You\'re making progress!',
      shouldAdvance: true,
      xpEarned: isCorrect ? 5 : 1,
    };
  }
}

/**
 * Check if user response matches expected responses
 */
function checkResponse(userResponse: string, expectedResponses: string[], targetPhrase?: string): boolean {
  const normalizedUser = userResponse.toLowerCase().trim()
    .replace(/[.,!?¿¡]/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Check against expected responses
  for (const expected of expectedResponses) {
    const normalizedExpected = expected.toLowerCase().trim()
      .replace(/[.,!?¿¡]/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (normalizedUser.includes(normalizedExpected) || normalizedExpected.includes(normalizedUser)) {
      return true;
    }
  }

  // Check against target phrase
  if (targetPhrase) {
    const normalizedTarget = targetPhrase.toLowerCase().trim()
      .replace(/[.,!?¿¡]/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const similarity = calculateSimilarity(normalizedUser, normalizedTarget);
    return similarity > 0.7; // 70% similarity threshold
  }

  return false;
}

/**
 * Calculate string similarity (Levenshtein-based)
 */
function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Parse AI response JSON
 */
function parseAIResponse(response: string, isCorrect: boolean, targetPhrase?: string): Omit<AITutorResponse, 'shouldAdvance' | 'xpEarned'> {
  try {
    // Extract JSON from response
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/```\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    return {
      text: parsed.text || 'Let\'s continue practicing!',
      isCorrect: parsed.isCorrect ?? isCorrect,
      correction: parsed.correction || undefined,
      encouragement: parsed.encouragement || (isCorrect ? 'Great!' : 'Keep trying!'),
    };
  } catch (error) {
    console.warn('[Kalaama] Failed to parse AI response:', error);
    return {
      text: isCorrect ? 'Well done!' : `Try saying "${targetPhrase}"`,
      isCorrect,
      correction: isCorrect ? undefined : targetPhrase,
      encouragement: isCorrect ? 'Excellent!' : 'You can do it!',
    };
  }
}

/**
 * Call Gemini API
 */
async function callGemini(prompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('Gemini API key not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
      })
    }
  );

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200
    })
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Call Claude API
 */
async function callClaude(prompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('Claude API key not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

// ============================================
// CONVERSATION-BASED AI TUTOR
// ============================================

/**
 * Get conversation-based AI tutor response for themed learning
 * Handles vocabulary, phrases, and roleplay phases
 */
async function getConversationTutorResponse(payload: ConversationTutorPayload): Promise<ConversationTutorResponse> {
  const { phase, unit, userResponse, currentVocab, currentPhrase, vocabMastered, conversationHistory, targetLanguage, nativeLanguage } = payload;

  // Get AI provider from storage
  const storage = await chrome.storage.local.get(['ai_provider']);
  const provider: AIProvider = storage.ai_provider || 'gemini';

  // Get API keys with environment fallback
  const gemini_api_key = await getApiKey('gemini_api_key');
  const openai_api_key = await getApiKey('openai_api_key');
  const claude_api_key = await getApiKey('claude_api_key');

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof'
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;
  const nativeLangName = languageNames[nativeLanguage] || nativeLanguage;

  let systemPrompt: string;
  let isCorrect = false;

  // Build prompt based on phase
  switch (phase) {
    case 'vocabulary':
      isCorrect = currentVocab ? checkPronunciation(userResponse, currentVocab.word) : false;
      systemPrompt = buildVocabularyPrompt(unit, currentVocab!, userResponse, isCorrect, nativeLangName, targetLangName);
      break;

    case 'phrases':
      isCorrect = currentPhrase ? checkPhraseConstruction(userResponse, currentPhrase) : false;
      systemPrompt = buildPhrasesPrompt(unit, currentPhrase!, userResponse, isCorrect, vocabMastered, nativeLangName, targetLangName);
      break;

    case 'roleplay':
      systemPrompt = buildRoleplayPrompt(unit, userResponse, conversationHistory, vocabMastered, nativeLangName, targetLangName);
      isCorrect = true; // In roleplay, we don't strictly check correctness
      break;

    default:
      throw new Error(`Invalid conversation phase: ${phase}`);
  }

  try {
    let aiResponse: string;

    switch (provider) {
      case 'openai':
        aiResponse = await callOpenAI(systemPrompt, openai_api_key);
        break;
      case 'claude':
        aiResponse = await callClaude(systemPrompt, claude_api_key);
        break;
      case 'gemini':
      default:
        aiResponse = await callGemini(systemPrompt, gemini_api_key);
        break;
    }

    // Parse response
    return parseConversationResponse(aiResponse, phase, isCorrect, currentVocab?.word, vocabMastered, unit);
  } catch (error) {
    console.error('[Kalaama] Conversation tutor error:', error);
    // Fallback response
    return buildFallbackResponse(phase, isCorrect, currentVocab?.word, nativeLangName);
  }
}

/**
 * Check if user's pronunciation matches the target word
 */
function checkPronunciation(userResponse: string, targetWord: string): boolean {
  const normalizedUser = userResponse.toLowerCase().trim()
    .replace(/[.,!?¿¡"']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const normalizedTarget = targetWord.toLowerCase().trim()
    .replace(/[.,!?¿¡"']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Check exact match
  if (normalizedUser === normalizedTarget) return true;

  // Check similarity (more lenient for pronunciation)
  const similarity = calculateSimilarity(normalizedUser, normalizedTarget);
  return similarity > 0.65; // 65% similarity for pronunciation
}

/**
 * Check if user constructed a valid phrase
 */
function checkPhraseConstruction(userResponse: string, phrasePattern: { pattern: string; vocabSlots: string[] }): boolean {
  // For phrases, we're more lenient - just check if it contains key words
  const normalizedUser = userResponse.toLowerCase().trim()
    .replace(/[.,!?¿¡"']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Extract the base pattern without placeholders
  const patternBase = phrasePattern.pattern.toLowerCase()
    .replace(/_+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,!?¿¡"']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Check if user's response contains key parts of the pattern
  const patternWords = patternBase.split(' ').filter(w => w.length > 2);
  const matchedWords = patternWords.filter(word => normalizedUser.includes(word));

  return matchedWords.length >= patternWords.length * 0.5;
}

/**
 * Build prompt for vocabulary phase
 */
function buildVocabularyPrompt(
  unit: ConversationTutorPayload['unit'],
  currentVocab: ConversationTutorPayload['currentVocab'],
  userResponse: string,
  isCorrect: boolean,
  nativeLangName: string,
  targetLangName: string
): string {
  return `Tu es un tuteur amical et encourageant qui aide un francophone à apprendre l'allemand.

CONTEXTE:
- Thème de la leçon: "${unit.titleNative}" (${unit.title})
- Phase actuelle: Apprentissage du vocabulaire
- Mot actuel: "${currentVocab?.word}" (${currentVocab?.translation})
- Phrase d'exemple: "${currentVocab?.exampleSentence}"

L'élève vient de dire: "${userResponse}"
${isCorrect ? 'Sa prononciation était CORRECTE!' : 'Sa prononciation nécessite une amélioration.'}

Réponds en 1-2 phrases COURTES (max 25 mots) EN FRANÇAIS:
1. ${isCorrect ? 'Félicite-le brièvement' : 'Corrige-le gentiment, dis-lui le bon mot'}
2. Encourage-le à continuer

IMPORTANT: Réponds UNIQUEMENT avec du JSON valide:
{
  "text": "Ta réponse ici en français",
  "textInTargetLanguage": "${isCorrect ? '' : currentVocab?.word}",
  "isCorrect": ${isCorrect},
  "correction": ${isCorrect ? 'null' : `"${currentVocab?.word}"`},
  "encouragement": "${isCorrect ? 'Excellent!' : 'Réessayez!'}",
  "shouldAdvance": ${isCorrect}
}`;
}

/**
 * Build prompt for phrases phase
 */
function buildPhrasesPrompt(
  unit: ConversationTutorPayload['unit'],
  currentPhrase: ConversationTutorPayload['currentPhrase'],
  userResponse: string,
  isCorrect: boolean,
  vocabMastered: string[],
  nativeLangName: string,
  targetLangName: string
): string {
  return `Tu es un tuteur amical et encourageant qui aide un francophone à apprendre l'allemand.

CONTEXTE:
- Thème: "${unit.titleNative}" (${unit.title})
- Phase actuelle: Construction de phrases
- Structure attendue: "${currentPhrase?.pattern}" (${currentPhrase?.translation})
- Indice: ${currentPhrase?.hint || 'Aucun'}

L'élève vient de dire: "${userResponse}"
${isCorrect ? 'Sa phrase était CORRECTE ou acceptable!' : 'Sa phrase nécessite une amélioration.'}

Réponds en 1-2 phrases COURTES (max 30 mots) EN FRANÇAIS:
1. ${isCorrect ? 'Félicite-le et montre une variation possible' : 'Corrige-le gentiment avec la bonne structure'}
2. ${isCorrect ? 'Propose de passer à la suite' : 'Encourage-le à réessayer ou propose un exemple'}

IMPORTANT: Réponds UNIQUEMENT avec du JSON valide:
{
  "text": "Ta réponse ici en français",
  "textInTargetLanguage": "${isCorrect ? '' : currentPhrase?.pattern}",
  "isCorrect": ${isCorrect},
  "correction": ${isCorrect ? 'null' : `"${currentPhrase?.pattern}"`},
  "encouragement": "${isCorrect ? 'Bravo!' : 'Essayez encore!'}",
  "shouldAdvance": ${isCorrect}
}`;
}

/**
 * Build prompt for roleplay phase
 */
function buildRoleplayPrompt(
  unit: ConversationTutorPayload['unit'],
  userResponse: string,
  conversationHistory: ConversationTutorPayload['conversationHistory'],
  vocabMastered: string[],
  nativeLangName: string,
  targetLangName: string
): string {
  const scenario = unit.roleplayScenario;
  const vocabNotYetUsed = unit.vocabulary
    .filter(v => !vocabMastered.includes(v.id))
    .map(v => `${v.word} (${v.translation})`)
    .slice(0, 3);

  const historyText = conversationHistory.slice(-6)
    .map(turn => `${turn.role === 'user' ? 'Client' : scenario.aiCharacter}: ${turn.text}`)
    .join('\n');

  const coveragePercent = (vocabMastered.length / unit.vocabulary.length) * 100;
  const shouldEnd = coveragePercent >= scenario.targetVocabUsage || conversationHistory.length >= (scenario.maxTurns || 10) * 2;

  return `Tu es ${scenario.aiCharacter} dans un jeu de rôle pour enseigner l'allemand à un francophone.

SCÉNARIO: ${scenario.scenario}
THÈME: ${unit.title} - ${unit.titleNative}

HISTORIQUE DE LA CONVERSATION:
${historyText || '(Début de la conversation)'}

Le client vient de dire: "${userResponse}"

VOCABULAIRE PAS ENCORE UTILISÉ: ${vocabNotYetUsed.join(', ') || 'Tous les mots ont été couverts!'}
COUVERTURE: ${Math.round(coveragePercent)}% (objectif: ${scenario.targetVocabUsage}%)

INSTRUCTIONS:
1. Réponds EN ALLEMAND comme ${scenario.aiCharacter}
2. Si l'élève fait une erreur grammaticale, corrige-le gentiment EN FRANÇAIS avant de continuer
3. Guide subtilement la conversation pour utiliser le vocabulaire non encore pratiqué
4. Garde tes réponses courtes et naturelles (max 20 mots en allemand)
${shouldEnd ? '5. TERMINE la conversation naturellement - dis au revoir!' : ''}

IMPORTANT: Réponds UNIQUEMENT avec du JSON valide:
{
  "text": "Ta réponse principale ici (correction en français si nécessaire)",
  "textInTargetLanguage": "Ta réponse EN ALLEMAND",
  "isCorrect": true,
  "correction": null,
  "encouragement": "",
  "shouldAdvance": true,
  "shouldEndPhase": ${shouldEnd},
  "vocabUsed": []
}`;
}

/**
 * Parse conversation AI response
 */
function parseConversationResponse(
  response: string,
  phase: ConversationPhase,
  isCorrect: boolean,
  targetWord: string | undefined,
  vocabMastered: string[],
  unit: ConversationTutorPayload['unit']
): ConversationTutorResponse {
  try {
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/```\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Calculate if phase should end
    let shouldEndPhase = parsed.shouldEndPhase || false;
    if (phase === 'roleplay') {
      const coveragePercent = (vocabMastered.length / unit.vocabulary.length) * 100;
      shouldEndPhase = shouldEndPhase || coveragePercent >= unit.roleplayScenario.targetVocabUsage;
    }

    return {
      text: parsed.text || 'Continuons!',
      textInTargetLanguage: parsed.textInTargetLanguage || undefined,
      isCorrect: parsed.isCorrect ?? isCorrect,
      correction: parsed.correction || undefined,
      encouragement: parsed.encouragement || (isCorrect ? 'Bien!' : 'Réessayez!'),
      shouldAdvance: parsed.shouldAdvance ?? isCorrect,
      shouldEndPhase,
      vocabUsed: parsed.vocabUsed || [],
    };
  } catch (error) {
    console.warn('[Kalaama] Failed to parse conversation response:', error);
    return {
      text: isCorrect ? 'Très bien!' : `Essayez de dire "${targetWord}"`,
      isCorrect,
      correction: isCorrect ? undefined : targetWord,
      encouragement: isCorrect ? 'Excellent!' : 'Courage!',
      shouldAdvance: isCorrect,
      shouldEndPhase: false,
    };
  }
}

/**
 * Build fallback response when AI fails
 */
function buildFallbackResponse(
  phase: ConversationPhase,
  isCorrect: boolean,
  targetWord: string | undefined,
  nativeLangName: string
): ConversationTutorResponse {
  const messages: Record<ConversationPhase, { correct: string; incorrect: string }> = {
    loading: { correct: '', incorrect: '' },
    vocabulary: {
      correct: 'Parfait! Votre prononciation est excellente.',
      incorrect: `Bonne tentative! Le mot correct est "${targetWord}". Réessayez!`
    },
    phrases: {
      correct: 'Très bien! Votre phrase est correcte.',
      incorrect: 'Presque! Essayez encore avec la structure proposée.'
    },
    roleplay: {
      correct: 'Gut! Sehr gut!',
      incorrect: 'Versuchen Sie es noch einmal!'
    },
    complete: {
      correct: 'Félicitations! Vous avez terminé cette leçon!',
      incorrect: ''
    },
    error: { correct: '', incorrect: '' }
  };

  const msg = messages[phase] || messages.vocabulary;

  return {
    text: isCorrect ? msg.correct : msg.incorrect,
    isCorrect,
    correction: isCorrect ? undefined : targetWord,
    encouragement: isCorrect ? 'Excellent!' : 'Vous y êtes presque!',
    shouldAdvance: isCorrect,
    shouldEndPhase: false,
  };
}

// ============================================
// GRAMMAR ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze text for parts of speech using Gemini API
 */
async function getGrammarAnalysis(payload: GrammarAnalysisPayload): Promise<GrammarAnalysisResponse> {
  const { text, language } = payload;

  // Get API key from storage or environment
  const gemini_api_key = await getApiKey('gemini_api_key');

  // If no API key, return empty analysis
  if (!gemini_api_key) {
    console.log('[Kalaama] No Gemini API key for grammar analysis');
    return { words: [], language };
  }

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof'
  };

  const langName = languageNames[language] || language;

  const prompt = `Analyze the following ${langName} text and identify the part of speech for each word.

TEXT: "${text}"

For EACH word, provide:
- word: the exact word as it appears
- pos: the part of speech (use ONLY these values: noun, verb, adjective, adverb, preposition, pronoun, conjunction, article, other)
- start: character position where the word starts (0-indexed)
- end: character position where the word ends

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "words": [
    {"word": "example", "pos": "noun", "start": 0, "end": 7},
    {"word": "word", "pos": "noun", "start": 8, "end": 12}
  ]
}

Analyze every word in the text, including articles, prepositions, and conjunctions.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemini_api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 } // Low temperature for consistent output
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error('[Kalaama] No text content from Gemini for grammar analysis');
      return { words: [], language };
    }

    // Extract JSON from response
    let jsonStr = textContent.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/```\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);

    // Normalize POS values
    const normalizedWords = (result.words || []).map((w: any) => ({
      word: w.word,
      pos: normalizePOS(w.pos),
      start: w.start || 0,
      end: w.end || w.word.length
    }));

    return { words: normalizedWords, language };
  } catch (error) {
    console.error('[Kalaama] Grammar analysis failed:', error);
    return { words: [], language };
  }
}

/**
 * Normalize part of speech to standard values
 */
function normalizePOS(pos: string): string {
  const normalized = pos.toLowerCase().trim();
  const validPOS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'article'];

  // Direct match
  if (validPOS.includes(normalized)) {
    return normalized;
  }

  // Common variations
  const mappings: Record<string, string> = {
    'det': 'article',
    'determiner': 'article',
    'art': 'article',
    'adj': 'adjective',
    'adv': 'adverb',
    'prep': 'preposition',
    'pron': 'pronoun',
    'conj': 'conjunction',
    'vb': 'verb',
    'nn': 'noun',
    'substantiv': 'noun',
    'verbe': 'verb',
    'adjectif': 'adjective',
    'adverbe': 'adverb',
  };

  return mappings[normalized] || 'other';
}

// ============================================
// TEXT-TO-SPEECH FUNCTIONS
// ============================================

// Language-specific ElevenLabs voice IDs
const ELEVENLABS_VOICES: Record<string, string> = {
  de: 'pNInz6obpgDQGcFmaJgB', // Adam - German male
  fr: 'EXAVITQu4vr4xnSDxMaL', // Sarah - French female
  es: 'EXAVITQu4vr4xnSDxMaL', // Sarah - Spanish
  en: 'EXAVITQu4vr4xnSDxMaL', // Sarah - English
  it: 'EXAVITQu4vr4xnSDxMaL', // Sarah - Italian
  pt: 'EXAVITQu4vr4xnSDxMaL', // Sarah - Portuguese
};

/**
 * Convert text to speech using ElevenLabs API
 */
async function textToSpeech(payload: TTSPayload): Promise<TTSResponse> {
  const { text, language, voiceId, speed } = payload;

  // Get ElevenLabs API key and voice settings from storage
  const storage = await chrome.storage.local.get(['voice_settings']);
  const apiKey = await getApiKey('elevenlabs_api_key');

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  // Use provided voiceId, language-specific voice, or default from settings
  const voice = voiceId || ELEVENLABS_VOICES[language] || storage.voice_settings?.voiceId || 'EXAVITQu4vr4xnSDxMaL';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();

    // Convert to base64
    const base64Audio = arrayBufferToBase64(audioBuffer);

    return {
      audioData: base64Audio,
      duration: estimateAudioDuration(text)
    };
  } catch (error) {
    console.error('[Kalaama] ElevenLabs TTS error:', error);
    throw error;
  }
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Estimate audio duration based on text length (rough approximation)
 */
function estimateAudioDuration(text: string): number {
  // Average speaking rate is about 150 words per minute
  const words = text.split(/\s+/).length;
  return (words / 150) * 60; // Duration in seconds
}

// =============================================================================
// BADGE UPDATE - Show due words count on extension icon
// =============================================================================

/**
 * Update extension badge with due words count
 * In LOCAL MODE, calculates from local storage
 * Will use Supabase query when integrated
 */
async function updateBadgeCount(): Promise<void> {
  try {
    // Get learning progress from local storage
    const result = await chrome.storage.local.get('learning_progress');
    const allProgress = result['learning_progress'] || {};

    // Get current settings to determine target language
    const settings = await getSettings();
    const language = (settings as Record<string, unknown>)?.target_language as string || 'es';

    // Calculate due count
    const languageProgress = allProgress[language];
    if (!languageProgress) {
      // No progress yet
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    const now = new Date();
    let dueCount = 0;

    // Count words where next_review_date <= NOW
    // Note: In LOCAL MODE, this iterates through completed lessons
    // In SUPABASE MODE, this would be a direct database query
    const completedLessons = languageProgress.completedLessons || {};
    for (const lessonId in completedLessons) {
      const lesson = completedLessons[lessonId];
      if (lesson.next_review_date && new Date(lesson.next_review_date) <= now) {
        dueCount++;
      }
    }

    // Update badge
    if (dueCount > 0) {
      chrome.action.setBadgeText({ text: String(dueCount) });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green
    } else {
      chrome.action.setBadgeText({ text: '' }); // Clear badge
    }
  } catch (error) {
    console.warn('[Kalaama] Failed to update badge count:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Set up periodic badge updates
 */
function setupBadgeUpdates(): void {
  // Update badge immediately
  updateBadgeCount().catch(() => {});

  // Set up alarm to update badge every hour
  chrome.alarms.create('updateBadge', { periodInMinutes: 60 });

  // Listen for alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateBadge') {
      updateBadgeCount().catch(() => {});
    }
  });

  // Also update badge when settings or vocabulary changes
  chrome.storage.local.onChanged.addListener((changes) => {
    if (changes.learning_progress || changes.settings) {
      updateBadgeCount().catch(() => {});
    }
  });
}

// Initialize badge updates when service worker starts
setupBadgeUpdates();

// Log when service worker starts
console.log('[Kalaama] Service worker initialized (LOCAL MODE - Supabase disabled)');
