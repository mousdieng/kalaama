# Supabase Setup Guide

This guide explains how to set up the Supabase database for Kalaama with anonymous access (no authentication required).

## Overview

Kalaama now uses Supabase to store:
- **Vocabulary**: Words, translations, context, mastery levels
- **Video Watches**: Tracked videos with watch duration and language

## Setup Instructions

### 1. Enable Anonymous Access in Supabase

In your Supabase project dashboard:

1. Go to **Authentication > Policies**
2. Ensure "Anonymous Signups" is enabled (it usually is by default)
3. Go to **Project Settings > API**
4. Copy your `Project URL` and `Anon Public Key` - these are already in your `environment.ts`

### 2. Create Tables

Run the following SQL in your Supabase SQL editor (`SQL Editor` in the dashboard):

```sql
-- Create vocabulary table
CREATE TABLE IF NOT EXISTS vocabulary (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  language TEXT NOT NULL,
  context_sentence TEXT,
  video_id TEXT,
  video_title TEXT,
  mastery_level INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  definition TEXT,
  part_of_speech TEXT,
  examples TEXT[],
  pronunciation TEXT,
  "aiExamples" TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(word, language)
);

-- Create video_watches table
CREATE TABLE IF NOT EXISTS video_watches (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL UNIQUE,
  video_title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  language TEXT NOT NULL,
  watched_duration INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  watched_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vocabulary_language ON vocabulary(language);
CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);
CREATE INDEX IF NOT EXISTS idx_video_watches_language ON video_watches(language);
CREATE INDEX IF NOT EXISTS idx_video_watches_updated ON video_watches(updated_at);
```

### 3. Set Row Level Security (RLS)

To allow anonymous access while protecting data:

```sql
-- Enable RLS on both tables
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_watches ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read and write to vocabulary
CREATE POLICY "Allow anonymous to read vocabulary" ON vocabulary
  FOR SELECT TO anon USING (TRUE);

CREATE POLICY "Allow anonymous to insert vocabulary" ON vocabulary
  FOR INSERT TO anon WITH CHECK (TRUE);

CREATE POLICY "Allow anonymous to update vocabulary" ON vocabulary
  FOR UPDATE TO anon USING (TRUE);

CREATE POLICY "Allow anonymous to delete vocabulary" ON vocabulary
  FOR DELETE TO anon USING (TRUE);

-- Allow anonymous users to read and write to video_watches
CREATE POLICY "Allow anonymous to read video_watches" ON video_watches
  FOR SELECT TO anon USING (TRUE);

CREATE POLICY "Allow anonymous to insert video_watches" ON video_watches
  FOR INSERT TO anon WITH CHECK (TRUE);

CREATE POLICY "Allow anonymous to update video_watches" ON video_watches
  FOR UPDATE TO anon USING (TRUE);

CREATE POLICY "Allow anonymous to delete video_watches" ON video_watches
  FOR DELETE TO anon USING (TRUE);
```

### 4. Verify Setup

1. Go to the **Table Editor** in Supabase
2. You should see both `vocabulary` and `video_watches` tables
3. Test by opening the extension and saving a word - it should appear in the table

## Troubleshooting

### "Permission denied" errors
- Check that RLS policies are correctly created
- Verify anonymous access is enabled in Authentication settings

### "Table does not exist" errors
- Run the SQL creation scripts above
- Make sure you're in the correct Supabase project

### Data not syncing
- Check the browser console for network errors
- Verify the Supabase credentials in `src/environments/environment.ts`
- Open Chrome DevTools → Network tab and look for `supabasecdn` requests

## Backup & Migration

To export your Supabase data:

1. Go to **Project Settings > Database**
2. Click **Download backup** to save your data
3. Keep regular backups in case you need to restore

---

**Note**: Since this is a single-user setup with anonymous access, data is not encrypted or private. Don't store sensitive information in this database.
