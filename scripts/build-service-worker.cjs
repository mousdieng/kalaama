#!/usr/bin/env node
/**
 * Build service worker with environment variables injected
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read environment.ts
const envPath = path.join(__dirname, '../src/environments/environment.ts');
let envContent = fs.readFileSync(envPath, 'utf8');

// Extract API keys using regex
const extractValue = (name) => {
  const regex = new RegExp(`${name}:\\s*['"]([^'"]*)['"']`, 'm');
  const match = envContent.match(regex);
  return match ? match[1] : '';
};

const geminiKey = extractValue('geminiApiKey');
const openaiKey = extractValue('openaiApiKey');
const claudeKey = extractValue('claudeApiKey');
const elevenlabsKey = extractValue('elevenlabsApiKey');

console.log('[Build] Injecting environment variables into service-worker...');
console.log(`  - Gemini API Key: ${geminiKey ? '✓' : '✗'}`);
console.log(`  - OpenAI API Key: ${openaiKey ? '✓' : '✗'}`);
console.log(`  - Claude API Key: ${claudeKey ? '✓' : '✗'}`);
console.log(`  - ElevenLabs API Key: ${elevenlabsKey ? '✓' : '✗'}`);

// Build esbuild command with define options
// Pass all keys as proper JavaScript string literals (quoted)
const defineOptions = [
  `--define:ENV_GEMINI_API_KEY='${geminiKey.replace(/'/g, "\\'")}'`,
  `--define:ENV_OPENAI_API_KEY='${openaiKey.replace(/'/g, "\\'")}'`,
  `--define:ENV_CLAUDE_API_KEY='${claudeKey.replace(/'/g, "\\'")}'`,
  `--define:ENV_ELEVENLABS_API_KEY='${elevenlabsKey.replace(/'/g, "\\'")}'`,
].join(' ');

const command = `esbuild src/chrome/background/service-worker.ts --bundle --outfile=dist/background/service-worker.js --format=esm --target=chrome100 ${defineOptions}`;

try {
  execSync(command, { stdio: 'inherit' });
  console.log('[Build] Service worker built successfully');
} catch (error) {
  console.error('[Build] Failed to build service worker:', error.message);
  process.exit(1);
}
