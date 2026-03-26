#!/usr/bin/env node

/**
 * Import German-French Dictionary Data
 *
 * Imports dictionary entries from CSV or JSON file into Supabase.
 *
 * Usage:
 *   node scripts/import-dictionary.cjs <input-file.csv>
 *   node scripts/import-dictionary.cjs <input-file.json>
 *
 * CSV Format:
 * word,article,gender,part_of_speech,difficulty_level,french_translation,french_definition,french_explanation,pronunciation_ipa,context_usage,examples_json,synonyms,antonyms,collocations_json,plural_form,conjugation_hint,frequency_rank
 *
 * JSON Format:
 * [
 *   {
 *     "word": "Haus",
 *     "article": "das",
 *     "gender": "n",
 *     "part_of_speech": "noun",
 *     "difficulty_level": "A1",
 *     "french_translation": "maison",
 *     "french_definition": "bâtiment d'habitation",
 *     "examples": [{"german": "...", "french": "...", "level": "A1"}],
 *     ...
 *   }
 * ]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pvpwseazqgtmekdkopbp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use service role key for admin operations

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable not set');
  console.error('Please create a .env file with your Supabase service role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Validation constants
const VALID_PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'article', 'interjection'];
const VALID_DIFFICULTY_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_ARTICLES = ['der', 'die', 'das', null];
const VALID_GENDERS = ['m', 'f', 'n', null];
const VALID_EXAMPLE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Validate a single dictionary entry
 */
function validateEntry(entry, lineNumber) {
  const errors = [];

  // Required fields
  const requiredFields = ['word', 'part_of_speech', 'difficulty_level', 'french_translation', 'french_definition'];
  for (const field of requiredFields) {
    if (!entry[field] || entry[field].toString().trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate enums
  if (entry.part_of_speech && !VALID_PARTS_OF_SPEECH.includes(entry.part_of_speech)) {
    errors.push(`Invalid part_of_speech: ${entry.part_of_speech}. Must be one of: ${VALID_PARTS_OF_SPEECH.join(', ')}`);
  }

  if (entry.difficulty_level && !VALID_DIFFICULTY_LEVELS.includes(entry.difficulty_level)) {
    errors.push(`Invalid difficulty_level: ${entry.difficulty_level}. Must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}`);
  }

  if (entry.article && !VALID_ARTICLES.includes(entry.article)) {
    errors.push(`Invalid article: ${entry.article}. Must be one of: der, die, das, or null`);
  }

  if (entry.gender && !VALID_GENDERS.includes(entry.gender)) {
    errors.push(`Invalid gender: ${entry.gender}. Must be one of: m, f, n, or null`);
  }

  // Validate examples structure
  if (entry.examples) {
    if (!Array.isArray(entry.examples)) {
      errors.push('Examples must be an array');
    } else {
      entry.examples.forEach((example, idx) => {
        if (!example.german || !example.french || !example.level) {
          errors.push(`Example ${idx}: Missing german, french, or level field`);
        }
        if (example.level && !VALID_EXAMPLE_LEVELS.includes(example.level)) {
          errors.push(`Example ${idx}: Invalid level ${example.level}`);
        }
      });
    }
  }

  // Validate collocations structure
  if (entry.collocations) {
    if (!Array.isArray(entry.collocations)) {
      errors.push('Collocations must be an array');
    } else {
      entry.collocations.forEach((collocation, idx) => {
        if (!collocation.phrase || !collocation.french) {
          errors.push(`Collocation ${idx}: Missing phrase or french field`);
        }
      });
    }
  }

  // Validate synonyms and antonyms are arrays
  if (entry.synonyms && !Array.isArray(entry.synonyms)) {
    errors.push('Synonyms must be an array');
  }
  if (entry.antonyms && !Array.isArray(entry.antonyms)) {
    errors.push('Antonyms must be an array');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors: errors.map(err => `Line ${lineNumber}: ${err}`)
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const entries = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const entry = {};

    headers.forEach((header, idx) => {
      let value = values[idx]?.trim();

      // Parse JSON fields
      if (header === 'examples_json' || header === 'collocations_json') {
        try {
          value = value ? JSON.parse(value) : [];
          const fieldName = header.replace('_json', '');
          entry[fieldName] = value;
        } catch (e) {
          console.warn(`Line ${i + 1}: Failed to parse ${header}, using empty array`);
          entry[header.replace('_json', '')] = [];
        }
      }
      // Parse array fields (comma-separated)
      else if (header === 'synonyms' || header === 'antonyms') {
        entry[header] = value ? value.split(';').map(s => s.trim()).filter(s => s) : [];
      }
      // Parse numeric fields
      else if (header === 'frequency_rank') {
        entry[header] = value ? parseInt(value, 10) : null;
      }
      // Handle null values
      else if (value === '' || value === 'null' || value === 'NULL') {
        entry[header] = null;
      }
      // Regular fields
      else {
        entry[header] = value;
      }
    });

    entries.push(entry);
  }

  return entries;
}

/**
 * Parse JSON file
 */
function parseJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Batch insert entries to Supabase
 */
async function insertEntries(entries, batchSize = 100) {
  const totalEntries = entries.length;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  console.log(`Importing ${totalEntries} entries in batches of ${batchSize}...`);

  for (let i = 0; i < totalEntries; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(totalEntries / batchSize);

    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} entries)...`);

    try {
      const { data, error } = await supabase
        .from('german_french_dictionary')
        .insert(batch)
        .select();

      if (error) {
        console.error(`Batch ${batchNumber} error:`, error.message);
        errorCount += batch.length;
        errors.push({
          batch: batchNumber,
          error: error.message,
          entries: batch.map(e => e.word)
        });
      } else {
        successCount += data.length;
        console.log(`✓ Batch ${batchNumber} imported successfully (${data.length} entries)`);
      }
    } catch (error) {
      console.error(`Batch ${batchNumber} exception:`, error.message);
      errorCount += batch.length;
      errors.push({
        batch: batchNumber,
        error: error.message,
        entries: batch.map(e => e.word)
      });
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < totalEntries) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return { successCount, errorCount, errors };
}

/**
 * Main import function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node import-dictionary.cjs <input-file.csv|input-file.json>');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const fileExt = path.extname(filePath).toLowerCase();
  let entries = [];

  console.log('========================================');
  console.log('German-French Dictionary Import');
  console.log('========================================');
  console.log(`Input file: ${filePath}`);
  console.log(`File type: ${fileExt}`);
  console.log('');

  // Parse input file
  try {
    if (fileExt === '.csv') {
      entries = parseCSV(filePath);
    } else if (fileExt === '.json') {
      entries = parseJSON(filePath);
    } else {
      console.error('Error: Unsupported file type. Use .csv or .json');
      process.exit(1);
    }

    console.log(`Parsed ${entries.length} entries from file`);
  } catch (error) {
    console.error('Error parsing file:', error.message);
    process.exit(1);
  }

  // Validate entries
  console.log('');
  console.log('Validating entries...');
  const validationErrors = [];
  const validEntries = [];

  entries.forEach((entry, idx) => {
    const validation = validateEntry(entry, idx + 1);
    if (!validation.valid) {
      validationErrors.push(...validation.errors);
    } else {
      validEntries.push(entry);
    }
  });

  if (validationErrors.length > 0) {
    console.error(`\n⚠ Found ${validationErrors.length} validation errors:`);
    validationErrors.forEach(err => console.error(`  - ${err}`));
    console.log('');
  }

  console.log(`✓ ${validEntries.length} entries are valid`);
  console.log(`✗ ${entries.length - validEntries.length} entries are invalid`);

  if (validEntries.length === 0) {
    console.error('No valid entries to import. Exiting.');
    process.exit(1);
  }

  // Confirm before import
  console.log('');
  console.log(`Ready to import ${validEntries.length} entries to Supabase`);
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Import to Supabase
  console.log('');
  const result = await insertEntries(validEntries);

  // Print summary
  console.log('');
  console.log('========================================');
  console.log('Import Summary');
  console.log('========================================');
  console.log(`Total entries processed: ${entries.length}`);
  console.log(`Successfully imported: ${result.successCount}`);
  console.log(`Failed: ${result.errorCount}`);
  console.log('');

  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(err => {
      console.log(`  Batch ${err.batch}: ${err.error}`);
      console.log(`    Words: ${err.entries.join(', ')}`);
    });
  }

  if (result.successCount > 0) {
    console.log(`✓ Import completed successfully!`);
  }

  process.exit(result.errorCount > 0 ? 1 : 0);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
