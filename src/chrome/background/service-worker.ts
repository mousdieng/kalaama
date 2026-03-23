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

// Message handler
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true; // Keep channel open for async response
});

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
      if (message.type === 'READING_WORD_CLICK') {
        console.log('='.repeat(50));
        console.log('[TRACE 2/5] Service Worker - Received READING_WORD_CLICK');
        console.log('  Payload:', JSON.stringify(message.payload, null, 2));
        console.log('  Forwarding to side panel...');
      }
      await sendToSidePanel(message);
      if (message.type === 'READING_WORD_CLICK') {
        console.log('[TRACE 2/5] Forwarded to side panel');
      }
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
  console.log('[TRACE translateWord] Called with:', { word, fromLang, toLang });

  // Try MyMemory first (most reliable free option)
  try {
    const params = new URLSearchParams({
      q: word,
      langpair: `${fromLang}|${toLang}`,
      de: MYMEMORY_EMAIL,
    });

    console.log('[TRACE translateWord] Trying MyMemory API...');
    const response = await fetch(`https://api.mymemory.translated.net/get?${params}`);
    const data = await response.json();
    console.log('[TRACE translateWord] MyMemory response:', data);

    if (data.responseStatus === 200) {
      const result = {
        translation: data.responseData.translatedText,
        source: 'mymemory',
      };
      console.log('[TRACE translateWord] MyMemory success:', result);
      return result;
    }
  } catch (error) {
    console.warn('[TRACE translateWord] MyMemory failed:', error);
  }

  // Fallback to Google Translate (unofficial)
  try {
    console.log('[TRACE translateWord] Trying Google Translate fallback...');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(word)}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log('[TRACE translateWord] Google response:', data);

    const result = {
      translation: data[0][0][0],
      source: 'google-free',
    };
    console.log('[TRACE translateWord] Google success:', result);
    return result;
  } catch (error) {
    console.error('[TRACE translateWord] All translation APIs failed:', error);
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
    // Send to all extension pages (including side panel)
    const views = chrome.runtime.sendMessage(message);
  } catch (error) {
    // Side panel might not be open
    console.debug('[Kalaama] Could not send to side panel:', error);
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
 * Get AI word context using Google Gemini API
 */
async function getWordContext(payload: WordContextPayload): Promise<WordContextResponse> {
  console.log('='.repeat(50));
  console.log('[TRACE 4/5] Service Worker - getWordContext()');
  console.log('  Payload:', JSON.stringify(payload, null, 2));

  const { word, sentence, targetLanguage, nativeLanguage } = payload;

  // Get API key from storage
  const { gemini_api_key } = await chrome.storage.local.get('gemini_api_key');
  console.log('[TRACE 4/5] Gemini API key present:', !!gemini_api_key);

  // If no API key, fall back to basic translation
  if (!gemini_api_key) {
    console.log('[TRACE 4/5] No Gemini API key, falling back to basic translation');
    const translation = await translateWord({
      word,
      fromLang: targetLanguage,
      toLang: nativeLanguage
    });
    console.log('[TRACE 4/5] Basic translation result:', translation);
    return {
      definition: '',
      partOfSpeech: '',
      examples: [],
      translation: translation.translation
    };
  }

  try {
    const languageNames: Record<string, string> = {
      en: 'English', es: 'Spanish', fr: 'French', de: 'German',
      it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
      ja: 'Japanese', ko: 'Korean', ar: 'Arabic', wo: 'Wolof'
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const nativeLangName = languageNames[nativeLanguage] || nativeLanguage;

    // Check if we have meaningful sentence context
    const hasContext = sentence && sentence.trim().toLowerCase() !== word.toLowerCase() && sentence.length > word.length + 5;
    console.log('[TRACE 4/5] Has meaningful context:', hasContext);
    console.log('[TRACE 4/5] Target language:', targetLangName, '| Native language:', nativeLangName);

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

    console.log('[TRACE 4/5] Sending request to Gemini API...');
    console.log('[TRACE 4/5] ========== FULL PROMPT ==========');
    console.log(prompt);
    console.log('[TRACE 4/5] ========== END PROMPT ==========');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemini_api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      }
    );

    console.log('[TRACE 4/5] Gemini response status:', response.status);

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error('[TRACE 4/5] No text content from Gemini');
      throw new Error('No response from Gemini');
    }

    console.log('[TRACE 4/5] ========== FULL API RESPONSE ==========');
    console.log(textContent);
    console.log('[TRACE 4/5] ========== END RESPONSE ==========');

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = textContent.trim();

    // Try different patterns to extract JSON
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/```\s*([\s\S]*?)\s*```/) ||
                      jsonStr.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    console.log('[TRACE 4/5] Extracted JSON string:', jsonStr);

    let result;
    try {
      result = JSON.parse(jsonStr);
      console.log('[TRACE 4/5] Parsed JSON result:', result);
    } catch (parseError) {
      console.error('[TRACE 4/5] Failed to parse JSON:', parseError);
      // Try to extract info manually if JSON parsing fails
      const basicTranslation = await translateWord({
        word,
        fromLang: targetLanguage,
        toLang: nativeLanguage
      });
      return {
        definition: textContent.substring(0, 200), // Use raw text as definition
        partOfSpeech: '',
        examples: [],
        pronunciation: '',
        translation: basicTranslation.translation
      };
    }

    // Ensure all required fields exist with defaults
    const wordContextResult: WordContextResponse = {
      definition: result.definition || '',
      partOfSpeech: result.partOfSpeech || result.part_of_speech || '',
      examples: Array.isArray(result.examples) ? result.examples : [],
      pronunciation: result.pronunciation || '',
      translation: result.translation || word
    };

    console.log('[TRACE 5/5] ========== FINAL RESULT ==========');
    console.log(JSON.stringify(wordContextResult, null, 2));
    console.log('[TRACE 5/5] ========== END RESULT ==========');
    return wordContextResult;
  } catch (error) {
    console.error('[TRACE 4/5] Gemini API failed:', error);
    console.log('[TRACE 4/5] Falling back to basic translation...');
    // Fall back to basic translation
    const translation = await translateWord({
      word,
      fromLang: targetLanguage,
      toLang: nativeLanguage
    });
    console.log('[TRACE 5/5] Fallback translation result:', translation);
    console.log('='.repeat(50));
    return {
      definition: '',
      partOfSpeech: '',
      examples: [],
      translation: translation.translation
    };
  }
}

/**
 * Get word examples from Gemini AI
 */
async function getWordExamples(payload: GetWordExamplesPayload): Promise<WordExamplesResponse> {
  const { word, targetLanguage, nativeLanguage, count } = payload;

  const storage = await chrome.storage.local.get(['gemini_api_key']);
  const gemini_api_key = storage.gemini_api_key;

  if (!gemini_api_key) {
    throw new Error('Gemini API key not configured');
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

  console.log('[Word Examples] Sending request to Gemini...');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemini_api_key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    }
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
}

// ============================================
// AI TUTOR FUNCTIONS
// ============================================

/**
 * Get AI tutor response for language learning
 */
async function getAITutorResponse(payload: AITutorPayload): Promise<AITutorResponse> {
  const { userResponse, lessonContext, currentPrompt, language, nativeLanguage, conversationHistory } = payload;

  // Get AI provider and API key from storage
  const storage = await chrome.storage.local.get(['ai_provider', 'gemini_api_key', 'openai_api_key', 'claude_api_key']);
  const provider: AIProvider = storage.ai_provider || 'gemini';

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
        aiResponse = await callOpenAI(systemPrompt, storage.openai_api_key);
        break;
      case 'claude':
        aiResponse = await callClaude(systemPrompt, storage.claude_api_key);
        break;
      case 'gemini':
      default:
        aiResponse = await callGemini(systemPrompt, storage.gemini_api_key);
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

  // Get AI provider and API key from storage
  const storage = await chrome.storage.local.get(['ai_provider', 'gemini_api_key', 'openai_api_key', 'claude_api_key']);
  const provider: AIProvider = storage.ai_provider || 'gemini';

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
        aiResponse = await callOpenAI(systemPrompt, storage.openai_api_key);
        break;
      case 'claude':
        aiResponse = await callClaude(systemPrompt, storage.claude_api_key);
        break;
      case 'gemini':
      default:
        aiResponse = await callGemini(systemPrompt, storage.gemini_api_key);
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

  // Get API key from storage
  const { gemini_api_key } = await chrome.storage.local.get('gemini_api_key');

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
  const storage = await chrome.storage.local.get(['elevenlabs_api_key', 'voice_settings']);
  const apiKey = storage.elevenlabs_api_key;

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

// Log when service worker starts
console.log('[Kalaama] Service worker initialized (LOCAL MODE - Supabase disabled)');
