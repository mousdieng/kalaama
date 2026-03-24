/**
 * Environment Configuration Template
 *
 * Copy this file to `environment.ts` and fill in your actual API keys.
 * DO NOT commit environment.ts with real API keys!
 */

export const environment = {
  production: false,

  // Supabase configuration
  supabaseUrl: 'https://pvpwseazqgtmekdkopbp.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cHdzZWF6cWd0bWVrZGtvcGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTM3MTAsImV4cCI6MjA4OTAyOTcxMH0.aC02tqZxy8fQgbxfBTL9iSYOaTMwM2f5QW8335nurdk',

  // AI API Keys (used as fallback defaults if not set in chrome.storage)
  // Users can also configure these in the extension settings
  geminiApiKey: 'AIzaSyDMQfIAkk0g1LXeeuZuYNKQkioxHcVDZY4', // Optional: Google Gemini API key
  openaiApiKey: '', // Optional: OpenAI API key
  claudeApiKey: '', // Optional: Anthropic Claude API key
  elevenlabsApiKey: 'sk_d37affd9e03db6615b819a26178469f0aef35c3c8469da02', // Optional: ElevenLabs API key for TTS
};
