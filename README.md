# Kalaama - Learn Languages on YouTube

Kalaama is a Chrome extension that helps you learn any language while watching YouTube videos. Click on subtitles to see translations and save words to your vocabulary.

## Features (V1)

- **Interactive Subtitles**: Click on any word in the subtitles to see its translation
- **Vocabulary Saving**: Save words with context (sentence, video source)
- **Progress Tracking**: Track your learning progress with mastery levels
- **Multi-language Support**: Learn Spanish, French, German, Italian, and 25+ languages
- **Free Translation**: Uses free APIs (MyMemory, Google Translate)

## Tech Stack

- **Frontend**: Angular 18 (standalone components) + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Realtime)
- **Extension**: Chrome Manifest V3

## Project Structure

```
kalaama/
├── extension/
│   ├── manifest.json          # Chrome extension config
│   ├── background/            # Service worker
│   ├── content/               # Content scripts (YouTube integration)
│   ├── popup/                 # Angular popup app
│   ├── overlay/               # Angular overlay (injected into YouTube)
│   └── shared/                # Shared types and utilities
├── supabase/
│   └── migrations/            # Database schema
└── docs/                      # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account (free tier works)
- Google Cloud Console project (for OAuth)

### 1. Clone and Install

```bash
cd kalaama

# Install root dependencies
npm install

# Install popup dependencies
cd extension/popup && npm install

# Install overlay dependencies
cd ../overlay && npm install

# Install extension dependencies
cd .. && npm install
```

### 2. Configure Supabase

1. Create a new Supabase project at https://supabase.com
2. Run the migrations in `supabase/migrations/` in order
3. Copy your Supabase URL and anon key

### 3. Configure Environment

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

3. Update the following files with your credentials:
   - `extension/popup/src/environments/environment.ts`
   - `extension/popup/src/environments/environment.prod.ts`
   - `extension/shared/constants/config.ts`
   - `extension/background/service-worker.ts`

### 4. Configure Google OAuth

1. Go to Google Cloud Console
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Chrome Extension type)
5. Add your extension ID to authorized origins
6. Update `extension/manifest.json` with your client ID

### 5. Build the Extension

```bash
# Build popup
cd extension/popup && npm run build

# Build overlay
cd ../overlay && npm run build

# Build content scripts and service worker
cd .. && npm run build
```

### 6. Load in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

## Development

### Run Popup in Development

```bash
cd extension/popup
npm run start
```

### Run Overlay in Development

```bash
cd extension/overlay
npm run start
```

### Watch Content Scripts

```bash
cd extension
npm run watch:content
npm run watch:background
```

## Usage

1. Install the extension in Chrome
2. Click the Kalaama icon and sign in
3. Go to any YouTube video
4. Click on words in the subtitles to see translations
5. Click "Save" to add words to your vocabulary
6. Review your vocabulary in the popup

## API Rate Limits

- **MyMemory Translation**: 1,000 words/day (free), 10,000 with email
- **YouTube Captions**: Extracted directly from videos (no limit)

## Future Features (V2+)

- AI Chat with Gemini for conversation practice
- Writing exercises
- Grammar lessons
- Pronunciation with Eleven Labs
- Spaced repetition system
- Support for Netflix, Disney+, etc.

## License

MIT
