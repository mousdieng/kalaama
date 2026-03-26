# Environment Setup for Kalaama

This guide explains how to configure API keys for the Kalaama extension.

## API Keys Configuration

Kalaama uses several AI services for enhanced features:

- **Google Gemini** - For AI-powered word context and examples
- **OpenAI GPT** - Alternative AI provider
- **Anthropic Claude** - Alternative AI provider
- **ElevenLabs** - Text-to-speech for pronunciation

## Setup Methods

You can configure API keys in two ways:

### Method 1: Environment File (Recommended for Development)

1. Copy the template file:
   ```bash
   cp src/environments/environment.template.ts src/environments/environment.ts
   ```

2. Edit `src/environments/environment.ts` and add your API keys:
   ```typescript
   export const environment = {
     production: false,

     // Supabase configuration
     supabaseUrl: 'YOUR_SUPABASE_URL',
     supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',

     // AI API Keys
     geminiApiKey: 'your-gemini-api-key-here',
     openaiApiKey: 'your-openai-api-key-here',
     claudeApiKey: 'your-claude-api-key-here',
     elevenlabsApiKey: 'your-elevenlabs-api-key-here',
   };
   ```

3. **IMPORTANT**: Never commit `environment.ts` with real API keys! This file is git-ignored.

### Method 2: Extension Settings UI (Recommended for Users)

Users can configure API keys directly in the extension:

1. Open the Kalaama extension
2. Go to Settings
3. Scroll to "API Keys" section
4. Enter your API keys
5. Click "Save"

## Priority

The extension uses this priority order when looking for API keys:

1. **User Settings** (via Extension UI) - Highest priority
2. **Environment Variables** - Fallback for development
3. **None** - Features requiring API keys will be disabled

## Getting API Keys

### Google Gemini
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and save it

### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy and save it

### Anthropic Claude
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Copy and save it

### ElevenLabs
1. Visit [ElevenLabs](https://elevenlabs.io/)
2. Go to Profile → API Keys
3. Generate a new key
4. Copy and save it

## Security Notes

- **Never** commit API keys to version control
- `src/environments/environment.ts` is git-ignored
- Use `environment.template.ts` as a reference
- For production, API keys should be configured via the Extension UI, not environment files

## Building

After setting up your environment:

```bash
npm run build
```

The extension will be built to the `dist/` folder with your API keys embedded (for development only).
