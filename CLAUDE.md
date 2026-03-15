# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Full extension build
npm run build

# Individual builds
npm run build:angular    # Angular app (side panel)
npm run build:chrome     # Content scripts + service worker
npm run build:content    # Content scripts only
npm run build:background # Service worker only

# Copy assets to dist/
npm run copy:assets

# Development server
npm run start            # Angular dev server at localhost:4200

# Watch modes
npm run watch:content    # Watch content scripts
npm run watch:background # Watch service worker
```

## Architecture Overview

Kalaama is a Chrome extension (Manifest V3) for learning languages on YouTube. It uses an Angular app for the Side Panel UI:

```
┌─────────────────────────────────────────────────────────────┐
│                    YouTube Page                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Content Script                                       │   │
│  │  - Detects videos, extracts captions (POT token)      │   │
│  │  - Syncs captions with video playback                 │   │
│  │  - Sends caption cues to service worker               │   │
│  └────────────────────────┬─────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────┘
                            │ chrome.runtime.sendMessage
                            ▼
┌───────────────────────────────────────────────────────────┐
│    Service Worker                                          │
│    - Relays messages between content script & side panel   │
│    - Handles auth, translations, storage                   │
│    - Opens side panel on extension icon click              │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│     Angular Side Panel App                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Captions   │  │ Vocabulary  │  │  Settings   │          │
│  │  (default)  │  │    List     │  │    Page     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
kalaama/
├── src/
│   ├── app/                      # Angular app
│   │   ├── core/services/        # Auth, messaging, settings, vocabulary
│   │   ├── features/
│   │   │   ├── captions/         # Real-time caption display (default route)
│   │   │   ├── vocabulary/       # Saved words list
│   │   │   ├── settings/         # User preferences
│   │   │   └── auth/             # Login
│   │   └── shared/               # Header, loading components
│   │
│   ├── chrome/                   # Chrome extension code
│   │   ├── content/              # Content scripts
│   │   │   ├── content-script.ts # Main content script
│   │   │   ├── subtitle-extractor.ts
│   │   │   ├── subtitle-parser.ts
│   │   │   ├── video-sync.ts
│   │   │   └── page-injector.js  # POT token capture
│   │   │
│   │   ├── background/           # Service worker
│   │   │   └── service-worker.ts
│   │   │
│   │   └── shared/               # Shared TypeScript (types, utils, constants)
│   │       ├── types/
│   │       ├── constants/
│   │       └── utils/
│   │
│   ├── environments/
│   ├── index.html
│   ├── main.ts
│   └── styles.css
│
├── dist/                         # Built extension (load this in Chrome)
│   ├── app/                      # Angular app build
│   ├── content/                  # Content scripts
│   ├── background/               # Service worker
│   ├── icons/
│   └── manifest.json
│
├── icons/                        # Extension icons (source)
├── scripts/
│   └── copy-assets.js            # Assembles builds into dist/
│
├── manifest.json                 # Extension manifest (source)
├── angular.json
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

### Caption Extraction Flow

1. **Content Script** intercepts YouTube's subtitle API requests via `page-injector.js`
2. Captures POT (Proof of Origin Token) for authentication
3. Fetches captions using `subtitle-extractor.ts`
4. Parses caption segments with `subtitle-parser.ts`
5. `video-sync.ts` tracks video playback and emits current cue
6. Cues sent to Side Panel via Service Worker

### Message Flow

Content Script → Service Worker → Side Panel:
- `CAPTION_CUE_CHANGE` - Current subtitle cue (text, words, timestamp)
- `VIDEO_INFO` - Video ID, title, language
- `CAPTION_STATUS` - Connection state, caption availability

Side Panel → Service Worker:
- `TRANSLATE_WORD` - Request word translation
- `SAVE_WORD` - Save word to vocabulary
- `GET_SETTINGS` - Load user settings

## Key Technical Details

- **Angular**: Version 18, standalone components (no NgModule)
- **Chrome Side Panel API**: Persistent panel alongside YouTube videos
- **POT Token Capture**: Intercepts YouTube's authentication for caption requests
- **Translation APIs**: MyMemory (primary), Google Translate (fallback)
- **Storage**: `chrome.storage.local` for vocabulary and settings
- **Auth**: Google OAuth via `chrome.identity` API (optional)

## Configuration Files

1. `src/environments/environment.ts` - Environment config
2. `src/chrome/shared/constants/config.ts` - API configuration
3. `manifest.json` - Extension manifest, Google OAuth client ID

## Loading the Extension

1. Build: `npm run build`
2. Go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder
