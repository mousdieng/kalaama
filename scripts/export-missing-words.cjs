#!/usr/bin/env node

/**
 * Export Missing Words from Supabase
 *
 * Exports aggregated missing words data to help prioritize dictionary additions.
 * Shows which words users click most often but aren't in the dictionary.
 *
 * Usage:
 *   node scripts/export-missing-words.cjs [options]
 *
 * Options:
 *   --format <csv|json>    Output format (default: csv)
 *   --status <pending|added|rejected>  Filter by status (default: pending)
 *   --limit <number>       Maximum number of words to export (default: 100)
 *   --output <file>        Output file path (default: missing-words-<timestamp>.csv)
 *   --with-context         Include context sentences in export
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pvpwseazqgtmekdkopbp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable not set');
  console.error('Please create a .env file with your Supabase service role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    format: 'csv',
    status: 'pending',
    limit: 100,
    output: null,
    withContext: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i];
    } else if (arg === '--status' && i + 1 < args.length) {
      options.status = args[++i];
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[++i];
    } else if (arg === '--with-context') {
      options.withContext = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  // Default output filename
  if (!options.output) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    options.output = `missing-words-${timestamp}.${options.format}`;
  }

  return options;
}

function showHelp() {
  console.log(`
Export Missing Words from Supabase

Usage:
  node scripts/export-missing-words.cjs [options]

Options:
  --format <csv|json>              Output format (default: csv)
  --status <pending|added|rejected> Filter by status (default: pending)
  --limit <number>                 Maximum number of words to export (default: 100)
  --output <file>                  Output file path
  --with-context                   Include context sentences
  --help, -h                       Show this help message

Examples:
  # Export top 100 pending words as CSV
  node scripts/export-missing-words.cjs

  # Export top 200 words as JSON with context
  node scripts/export-missing-words.cjs --format json --limit 200 --with-context

  # Export to specific file
  node scripts/export-missing-words.cjs --output data/missing-words.csv
`);
}

/**
 * Get aggregated missing words from database
 */
async function getAggregatedMissingWords(status, limit) {
  try {
    const { data, error } = await supabase.rpc('get_aggregated_missing_words', {
      p_status: status,
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching missing words:', error.message);
    throw error;
  }
}

/**
 * Get context sentences for missing words
 */
async function getContextForWords(words) {
  const wordList = words.map(w => w.word);

  try {
    const { data, error } = await supabase
      .from('missing_words')
      .select('word, context_sentence, video_title, video_id')
      .in('word', wordList)
      .not('context_sentence', 'is', null)
      .limit(1000);

    if (error) throw error;

    // Group context by word
    const contextMap = new Map();
    for (const row of data || []) {
      const word = row.word.toLowerCase();
      if (!contextMap.has(word)) {
        contextMap.set(word, []);
      }
      contextMap.get(word).push({
        sentence: row.context_sentence,
        video_title: row.video_title,
        video_id: row.video_id
      });
    }

    return contextMap;
  } catch (error) {
    console.warn('Failed to fetch context sentences:', error.message);
    return new Map();
  }
}

/**
 * Export data as CSV
 */
function exportCSV(words, contextMap, outputPath) {
  let csv = 'Word,Total Clicks,Unique Users,First Seen,Last Clicked';

  if (contextMap.size > 0) {
    csv += ',Sample Context,Video Title,Video ID';
  }

  csv += '\n';

  for (const word of words) {
    const contexts = contextMap.get(word.word.toLowerCase()) || [];
    const context = contexts[0] || {};

    const row = [
      escapeCSV(word.word),
      word.total_clicks,
      word.unique_users,
      word.first_clicked_at || '',
      word.last_clicked_at || ''
    ];

    if (contextMap.size > 0) {
      row.push(
        escapeCSV(context.sentence || ''),
        escapeCSV(context.video_title || ''),
        context.video_id || ''
      );
    }

    csv += row.join(',') + '\n';
  }

  fs.writeFileSync(outputPath, csv, 'utf-8');
}

/**
 * Export data as JSON
 */
function exportJSON(words, contextMap, outputPath) {
  const output = words.map(word => {
    const result = {
      word: word.word,
      total_clicks: word.total_clicks,
      unique_users: word.unique_users,
      first_clicked_at: word.first_clicked_at,
      last_clicked_at: word.last_clicked_at
    };

    if (contextMap.size > 0) {
      result.contexts = contextMap.get(word.word.toLowerCase()) || [];
    }

    return result;
  });

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
}

/**
 * Escape CSV field
 */
function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Main export function
 */
async function main() {
  console.log('========================================');
  console.log('Export Missing Words');
  console.log('========================================');
  console.log('');

  const options = parseArgs();

  console.log(`Format: ${options.format}`);
  console.log(`Status filter: ${options.status}`);
  console.log(`Limit: ${options.limit}`);
  console.log(`Output: ${options.output}`);
  console.log(`Include context: ${options.withContext ? 'Yes' : 'No'}`);
  console.log('');

  // Fetch missing words
  console.log('Fetching missing words from Supabase...');
  const words = await getAggregatedMissingWords(options.status, options.limit);

  if (words.length === 0) {
    console.log('No missing words found with the specified criteria.');
    process.exit(0);
  }

  console.log(`Found ${words.length} missing words`);

  // Fetch context if requested
  let contextMap = new Map();
  if (options.withContext) {
    console.log('Fetching context sentences...');
    contextMap = await getContextForWords(words);
    console.log(`Found context for ${contextMap.size} words`);
  }

  // Export data
  console.log('');
  console.log(`Exporting to ${options.output}...`);

  if (options.format === 'json') {
    exportJSON(words, contextMap, options.output);
  } else {
    exportCSV(words, contextMap, options.output);
  }

  console.log('✓ Export completed successfully!');
  console.log('');
  console.log('========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Total words exported: ${words.length}`);

  if (words.length > 0) {
    const totalClicks = words.reduce((sum, w) => sum + w.total_clicks, 0);
    const totalUsers = words.reduce((sum, w) => sum + w.unique_users, 0);

    console.log(`Total clicks: ${totalClicks}`);
    console.log(`Total unique users: ${totalUsers}`);
    console.log('');
    console.log('Top 10 most requested words:');

    words.slice(0, 10).forEach((word, index) => {
      console.log(`  ${index + 1}. ${word.word} - ${word.total_clicks} clicks (${word.unique_users} users)`);
    });
  }

  console.log('');
  console.log(`Output saved to: ${options.output}`);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
