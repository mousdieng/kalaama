import { Injectable } from '@angular/core';

// =============================================================================
// SUPABASE DISABLED - This is a stub service
// =============================================================================
// import { createClient, SupabaseClient } from '@supabase/supabase-js';
// import { environment } from '../../../environments/environment';
// =============================================================================

/**
 * Stub SupabaseService - Supabase is disabled for now
 * All data is stored locally using chrome.storage.local
 *
 * To re-enable Supabase:
 * 1. Uncomment the imports above
 * 2. Uncomment the implementation below
 * 3. Update environment files with real credentials
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  // =============================================================================
  // SUPABASE DISABLED - Uncomment when ready
  // =============================================================================
  // private supabase: SupabaseClient;
  //
  // constructor() {
  //   this.supabase = createClient(
  //     environment.supabaseUrl,
  //     environment.supabaseAnonKey
  //   );
  // }
  //
  // get client(): SupabaseClient {
  //   return this.supabase;
  // }
  //
  // get auth() {
  //   return this.supabase.auth;
  // }
  //
  // from(table: string) {
  //   return this.supabase.from(table);
  // }
  // =============================================================================

  constructor() {
    console.log('[Kalaama] SupabaseService stub loaded - using local storage');
  }

  // Stub methods that return null/empty - should not be called in local mode
  get client(): null {
    console.warn('[Kalaama] Supabase client accessed but Supabase is disabled');
    return null;
  }

  get auth(): null {
    console.warn('[Kalaama] Supabase auth accessed but Supabase is disabled');
    return null;
  }

  from(table: string): null {
    console.warn(`[Kalaama] Supabase table "${table}" accessed but Supabase is disabled`);
    return null;
  }
}
