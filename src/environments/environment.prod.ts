/**
 * Production Environment Configuration
 */

export const environment = {
  production: true,

  // Supabase configuration
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',

  // AI API Keys (production - should be empty, use chrome.storage instead)
  geminiApiKey: '',
  openaiApiKey: '',
  claudeApiKey: '',
  elevenlabsApiKey: '',
};
