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

import type { Message, SaveWordPayload, TranslateWordPayload, FetchCaptionsPayload } from '../shared/types/messages';

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
      // Forward to side panel
      await sendToSidePanel(message);
      return { forwarded: true };

    default:
      console.warn('[Kalaama] Unknown message type:', message.type);
      return { error: 'Unknown message type' };
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
    console.warn('[Kalaama] MyMemory failed, trying fallback:', error);
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
    console.error('[Kalaama] All translation APIs failed:', error);
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

// Log when service worker starts
console.log('[Kalaama] Service worker initialized (LOCAL MODE - Supabase disabled)');
