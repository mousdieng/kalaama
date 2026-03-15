/**
 * Kalaama Page Injector
 * This script runs in YouTube's page context (MAIN world)
 * and has access to YouTube's cookies and internal APIs.
 *
 * Key insight: YouTube caption URLs require a POT (Proof of Origin Token)
 * We intercept YouTube's own requests to capture this token.
 */
(function() {
  'use strict';

  const KALAAMA_DEBUG = true;

  function log(...args) {
    if (KALAAMA_DEBUG) console.log('[Kalaama Page]', ...args);
  }

  // --- State ---
  let currentVideoId = null;
  const potCache = new Map();
  const captionCache = new Map();

  // --- Helpers ---
  const getVideoId = () => {
    const v = new URLSearchParams(window.location.search).get('v');
    if (v) return v;
    const parts = window.location.pathname.split('/').filter(Boolean);
    if ((parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) return parts[1];
    return null;
  };

  const getPlayer = () => {
    const player = document.querySelector('.html5-video-player') || document.getElementById('movie_player');
    if (player && typeof player.getPlayerResponse === 'function') {
      return player;
    }
    return null;
  };

  const getPlayerResponse = () => {
    const player = getPlayer();
    if (player && typeof player.getPlayerResponse === 'function') {
      return player.getPlayerResponse();
    }
    return window.ytInitialPlayerResponse || null;
  };

  const isVideoPlaying = (video) => {
    return video && video.currentTime > 0 && !video.paused && !video.ended && video.readyState >= 2;
  };

  // --- POT Token Logic ---
  const extractPot = (url) => {
    if (url && url.includes('timedtext') && url.includes('pot=')) {
      const m = url.match(/[?&]pot=([^&]+)/);
      const v = url.match(/[?&]v=([^&]+)/);
      if (m && m[1]) {
        const vid = v ? v[1] : getVideoId();
        if (vid) {
          potCache.set(vid, m[1]);
          log('Captured POT token for video:', vid, '- token:', m[1].substring(0, 20) + '...');
        }
      }
    }
  };

  const forceCaptionRequests = async () => {
    const video = document.querySelector('video');
    if (!video || !isVideoPlaying(video)) return;
    let btn = document.querySelector('.ytp-subtitles-button');
    if (!btn) {
      await new Promise(r => setTimeout(r, 500));
      btn = document.querySelector('.ytp-subtitles-button');
    }
    if (btn) {
      log('Clicking subtitle button to force caption request...');
      btn.click();
      await new Promise(r => setTimeout(r, 200));
      btn.click();
    }
  };

  const ensurePot = async (videoId) => {
    if (potCache.has(videoId)) {
      log('Using cached POT token for:', videoId);
      return potCache.get(videoId);
    }

    log('Waiting for POT token...');
    const startTime = Date.now();
    while (Date.now() - startTime < 10000) {
      if (potCache.has(videoId)) {
        log('Got POT token after', Date.now() - startTime, 'ms');
        return potCache.get(videoId);
      }
      await forceCaptionRequests();
      await new Promise(r => setTimeout(r, 1000));
    }

    log('POT token not found after 10s');
    return potCache.get(videoId) || null;
  };

  // --- Segment Processing ---
  const buildSegmentsFromEvents = (events) => {
    const segments = [];
    if (!Array.isArray(events)) return segments;

    const LAST_WORD_FALLBACK_MS = 2000;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!ev || !Array.isArray(ev.segs) || ev.segs.length === 0) continue;

      const cleanedSegs = ev.segs
        .map(seg => {
          const raw = (seg && typeof seg.utf8 === 'string') ? seg.utf8 : '';
          return { ...seg, text: raw.replace(/\[.*?\]/g, '').trim() };
        })
        .filter(seg => seg.text && seg.text.length > 0);

      if (cleanedSegs.length === 0) continue;

      const baseStartMs = typeof ev.tStartMs === 'number' ? ev.tStartMs : 0;
      const nextEvent = events[i + 1];
      const nextEventStartMs = (nextEvent && typeof nextEvent.tStartMs === 'number') ? nextEvent.tStartMs : 0;
      const boundaryMs = nextEventStartMs > 0 ? nextEventStartMs - 1 : baseStartMs + LAST_WORD_FALLBACK_MS;
      const isLastEvent = i === events.length - 1;

      for (let j = 0; j < cleanedSegs.length; j++) {
        const current = cleanedSegs[j];
        const nextSeg = cleanedSegs[j + 1];
        const offsetMs = typeof current.tOffsetMs === 'number' ? current.tOffsetMs : 0;
        const startMs = baseStartMs + offsetMs;
        let endMs;

        if (nextSeg && typeof nextSeg.tOffsetMs === 'number') {
          endMs = baseStartMs + nextSeg.tOffsetMs;
        } else if (isLastEvent) {
          endMs = startMs + LAST_WORD_FALLBACK_MS;
        } else {
          endMs = boundaryMs;
        }

        if (!(endMs > startMs)) continue;

        segments.push({
          startSeconds: startMs / 1000,
          endSeconds: endMs / 1000,
          durationSeconds: (endMs - startMs) / 1000,
          text: current.text
        });
      }
    }
    return segments;
  };

  // --- Caption Track Selection ---
  const pickCaptionTrack = (tracks, preferredLang) => {
    if (!tracks || tracks.length === 0) return null;

    // Try preferred language first
    if (preferredLang) {
      let track = tracks.find(x => x.languageCode === preferredLang);
      if (track) return track;
      track = tracks.find(x => x.languageCode && x.languageCode.startsWith(preferredLang));
      if (track) return track;
    }

    // Fall back to English
    let track = tracks.find(x => x.languageCode === 'en');
    if (!track) track = tracks.find(x => x.languageCode && x.languageCode.startsWith('en'));

    // Fall back to auto-generated
    if (!track) track = tracks.find(x => x.kind === 'asr');

    // Fall back to first available
    if (!track) track = tracks[0];

    return (track && track.baseUrl) ? track : null;
  };

  // --- Main Caption Fetch ---
  const fetchCaptionsForVideo = async (videoId, preferredLang) => {
    log('=== Fetching captions for video:', videoId, '===');

    // Check cache first
    const cacheKey = `${videoId}_${preferredLang || 'default'}`;
    if (captionCache.has(cacheKey)) {
      log('Returning cached captions');
      return captionCache.get(cacheKey);
    }

    // Get player response
    let playerResponse = null;
    const startTime = Date.now();
    while (Date.now() - startTime < 10000) {
      const pr = getPlayerResponse();
      if (pr) {
        playerResponse = pr;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!playerResponse) {
      throw new Error('No player response found');
    }

    // Get caption tracks
    const captionsData = playerResponse.captions?.playerCaptionsTracklistRenderer || playerResponse.captions;
    if (!captionsData || !captionsData.captionTracks) {
      throw new Error('No caption tracks in player response');
    }

    const tracks = captionsData.captionTracks;
    const track = pickCaptionTrack(tracks, preferredLang);
    log('Available tracks:', tracks.length, '- Selected:', track?.languageCode);

    if (!track) {
      throw new Error('No suitable caption track found');
    }

    // Get POT token
    const pot = await ensurePot(videoId);
    log('POT token:', pot ? 'found' : 'not found');

    // Build fetch URL
    const potParam = pot ? `&pot=${pot}` : '';
    const url = `${track.baseUrl}&fmt=json3${potParam}&c=WEB&lang=${track.languageCode}`;

    log('Fetching captions from URL (length:', url.length, ')');

    // Fetch captions
    const resp = await fetch(url, { credentials: 'include' });
    log('Response status:', resp.status);

    if (!resp.ok) {
      throw new Error(`Fetch failed with status: ${resp.status}`);
    }

    const text = await resp.text();
    log('Response length:', text.length, 'bytes');

    if (!text || text.length < 10) {
      throw new Error('Empty response');
    }

    // Parse and process
    const data = JSON.parse(text);

    if (!data || !Array.isArray(data.events)) {
      throw new Error('No events in caption data');
    }

    const segments = buildSegmentsFromEvents(data.events);
    log('SUCCESS: Built', segments.length, 'segments');

    const result = {
      segments,
      language: track.languageCode,
      videoId,
      rawContent: text,
      format: 'json3'
    };

    captionCache.set(cacheKey, result);
    return result;
  };

  // --- Extract caption tracks (for compatibility) ---
  function getCaptionTracks() {
    try {
      const playerResponse = getPlayerResponse();
      if (!playerResponse) {
        log('No player response found');
        return null;
      }

      const captionsData = playerResponse.captions?.playerCaptionsTracklistRenderer || playerResponse.captions;
      const tracks = captionsData?.captionTracks;

      if (!tracks || tracks.length === 0) {
        log('No caption tracks in player response');
        return null;
      }

      log('Found', tracks.length, 'caption tracks');
      return tracks.map(track => ({
        languageCode: track.languageCode,
        languageName: track.name?.simpleText || track.languageCode,
        baseUrl: track.baseUrl,
        isAutoGenerated: track.kind === 'asr',
        isTranslatable: track.isTranslatable || false,
        vssId: track.vssId
      }));
    } catch (error) {
      log('Error getting caption tracks:', error);
      return null;
    }
  }

  // --- Interceptors for POT capture ---
  const setupInterceptors = () => {
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0] ? args[0].toString() : '';
      extractPot(url);
      return originalFetch.apply(this, args);
    };

    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      const u = url ? url.toString() : '';
      extractPot(u);
      return originalOpen.apply(this, arguments);
    };

    log('Interceptors installed for POT capture');
  };

  // Install interceptors immediately
  setupInterceptors();

  // --- Legacy fetch method (fallback) ---
  async function fetchCaptionsWithSession(baseUrl, format) {
    log('=== fetchCaptionsWithSession called ===');

    // Extract video ID and language from URL
    const urlObj = new URL(baseUrl);
    const videoId = urlObj.searchParams.get('v') || getVideoId();
    const lang = urlObj.searchParams.get('lang');

    if (!videoId) {
      throw new Error('Could not determine video ID');
    }

    try {
      // Use the new POT-based fetch
      const result = await fetchCaptionsForVideo(videoId, lang);
      return {
        content: result.rawContent,
        format: 'json3'
      };
    } catch (error) {
      log('POT-based fetch failed:', error.message);

      // Fallback: try direct fetch with original URL
      log('Trying direct fetch as fallback...');

      const pot = potCache.get(videoId);
      const potParam = pot ? `&pot=${pot}` : '';
      const url = `${baseUrl}&fmt=json3${potParam}`;

      const resp = await fetch(url, { credentials: 'include' });
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 0) {
          return { content: text, format: 'json3' };
        }
      }

      throw new Error('All caption fetch methods failed');
    }
  }

  // --- Message Handler ---
  window.addEventListener('kalaama-request', async function(event) {
    const detail = event.detail || {};
    const requestId = detail.requestId;
    const action = detail.action;
    const data = detail.data;

    log('Received request:', action, requestId);

    let response = { requestId, success: false, error: 'Unknown action' };

    try {
      switch (action) {
        case 'GET_CAPTION_TRACKS':
          const tracks = getCaptionTracks();
          response = { requestId, success: !!tracks, tracks };
          break;

        case 'FETCH_CAPTIONS':
          const result = await fetchCaptionsWithSession(data.baseUrl, data.format);
          response = { requestId, success: true, content: result.content, format: result.format };
          break;

        case 'FETCH_CAPTIONS_FOR_VIDEO':
          const videoResult = await fetchCaptionsForVideo(data.videoId, data.lang);
          response = {
            requestId,
            success: true,
            content: videoResult.rawContent,
            format: 'json3',
            segments: videoResult.segments,
            language: videoResult.language
          };
          break;

        case 'GET_POT':
          const videoId = data.videoId || getVideoId();
          const pot = await ensurePot(videoId);
          response = { requestId, success: !!pot, pot };
          break;

        case 'PING':
          response = { requestId, success: true, message: 'pong' };
          break;

        default:
          response = { requestId, success: false, error: 'Unknown action: ' + action };
      }
    } catch (error) {
      log('Request error:', error.message);
      response = { requestId, success: false, error: error.message || String(error) };
    }

    log('Sending response:', response.success ? 'success' : 'error');
    window.dispatchEvent(new CustomEvent('kalaama-response', { detail: response }));
  });

  // Signal ready
  window.dispatchEvent(new CustomEvent('kalaama-injected-ready'));
  log('Page injector ready (with POT capture)');
})();
