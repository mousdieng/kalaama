# Supabase Migration - Setup & Configuration

## What's Changed

You now have Supabase integration for persistent data storage without authentication required (single-user mode). This replaces local Chrome storage with cloud-backed storage.

### Files Modified

#### 1. **SupabaseService** - `src/app/core/services/supabase.service.ts`
- Enabled Supabase client initialization
- Anonymous access configured (no auth required)
- Ready to communicate with your Supabase database

#### 2. **VocabularyService** - `src/app/core/services/vocabulary.service.ts`
- Migrated from `chrome.storage.local` to Supabase
- All vocabulary operations now use `vocabulary` table:
  - `loadVocabulary()` - fetch saved words
  - `addWord()` - save/update words
  - `deleteWord()` - remove words
  - `updateMastery()` - update learning progress
  - `updateAIExamples()` - save AI-generated examples

#### 3. **VideoTrackingService** (NEW) - `src/app/core/services/video-tracking.service.ts`
- New service to track watched videos
- Saves video metadata and watch duration to `video_watches` table
- Methods:
  - `recordVideoWatch()` - save video watch record
  - `getWatchedVideos()` - retrieve watched videos
  - `deleteVideoWatch()` - remove video record

#### 4. **Logging Cleanup**
- Removed verbose console logs from:
  - `content-script.ts` (voice, control, repeat logs)
  - `subtitle-extractor.ts` (caption fetching logs)
  - `video-sync.ts` (sync initialization logs)
- Kept error/warning logs for debugging

## Setup Instructions

### Step 1: Create Supabase Tables

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project (you should have: pvpwseazqgtmekdkopbp)
3. Go to **SQL Editor** (left sidebar)
4. Copy and paste the SQL from `SUPABASE_SETUP.md`
5. Click **Run** to create tables and enable Row Level Security

### Step 2: Enable Anonymous Access (Already enabled)

Your Supabase project is already configured with:
- Anonymous signups enabled
- Your anon key in `src/environments/environment.ts`

### Step 3: Load Updated Extension

1. Build the extension: `npm run build`
2. Open Chrome: `chrome://extensions`
3. Find "Kalaama" and click the refresh icon
4. Test by saving a word - it should appear in Supabase dashboard

## Data Structure

### `vocabulary` table
```typescript
{
  id: string;                    // Unique identifier
  word: string;                  // The word itself
  translation: string;           // Translation
  language: string;              // Language code (es, de, fr, etc.)
  context_sentence?: string;     // Sentence where word appeared
  video_id?: string;             // YouTube video ID
  video_title?: string;          // Video title for reference
  mastery_level: number;         // 0-10 learning level
  review_count: number;          // How many times reviewed
  definition?: string;           // AI-generated definition
  part_of_speech?: string;       // Word type (noun, verb, etc.)
  examples?: string[];           // Example sentences
  pronunciation?: string;        // Phonetic pronunciation
  aiExamples?: string[];         // AI-generated examples (10-20)
  created_at: timestamp;         // When word was first saved
  updated_at: timestamp;         // Last modification
}
```

### `video_watches` table
```typescript
{
  id: string;                    // Unique identifier
  video_id: string;              // YouTube video ID (unique per entry)
  video_title: string;           // Video title
  video_url: string;             // Full YouTube URL
  language: string;              // Language of captions
  watched_duration: number;      // Seconds watched
  total_duration: number;        // Video length in seconds
  watched_at: timestamp;         // First view date
  updated_at: timestamp;         // Last updated date
}
```

## Advantages Over Local Storage

✓ **Cloud backup** - Data syncs across devices (if you add login later)
✓ **Persistent** - Data survives Chrome reinstalls
✓ **Query-able** - Can run analytics queries in Supabase
✓ **Shareable** - Can export data easily
✓ **Scalable** - No local storage size limits

## Troubleshooting

### "Table does not exist" error
- Make sure you ran the SQL from `SUPABASE_SETUP.md`
- Check you're in the correct Supabase project
- Verify Row Level Security policies are created

### Words not saving to Supabase
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Check for any error messages
4. Verify Supabase credentials in `environment.ts`

### Data lost from local storage
- Old data in `chrome.storage.local` is still there
- New saves go to Supabase
- To migrate old data manually: export from local storage → import to Supabase

## Next Steps (Optional)

1. **Add real authentication** - If you want to sync across devices:
   - Enable Google/Email auth in Supabase
   - Update auth policies to be user-specific

2. **Export data** - Supabase dashboard → Table Editor → Export as CSV

3. **Monitor usage** - Supabase free tier includes:
   - 500MB storage
   - 2M rows
   - More than enough for single user

## Configuration Files

- `src/environments/environment.ts` - Supabase credentials (keep secret!)
- `SUPABASE_SETUP.md` - SQL table creation script
- `src/app/core/services/supabase.service.ts` - Service configuration

---

**Status**: Ready to use! ✓
**Build**: Successful ✓
**Extension**: Ready to reload in Chrome ✓
