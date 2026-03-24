import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * SupabaseService - Initialized with anonymous access
 * No authentication required - single user mode
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: {
          // Disable LockManager - not fully supported in Chrome extensions
          // Use a no-op lock function to prevent LockManager errors
          lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
            // Just execute the function immediately without acquiring a lock
            return await fn();
          },
          // Use localStorage for persistence (works in extensions)
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      }
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get auth() {
    return this.supabase.auth;
  }

  from(table: string) {
    return this.supabase.from(table);
  }
}
