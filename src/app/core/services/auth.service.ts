import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// =============================================================================
// SUPABASE DISABLED - Using local mode
// =============================================================================
// import { User } from '@supabase/supabase-js';
// import { SupabaseService } from './supabase.service';
// =============================================================================

// Local user type (replaces Supabase User)
export interface LocalUser {
  id: string;
  email: string;
  name?: string;
}

// Local user for offline mode
const LOCAL_USER: LocalUser = {
  id: 'local-user',
  email: 'local@kalaama.app',
  name: 'Local User',
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // SUPABASE DISABLED
  // private supabase = inject(SupabaseService);

  private userSubject = new BehaviorSubject<LocalUser | null>(null);

  user$ = this.userSubject.asObservable();

  get currentUser(): LocalUser | null {
    return this.userSubject.value;
  }

  /**
   * Check if there's an existing session (local mode - auto login)
   */
  async checkSession(): Promise<void> {
    // LOCAL MODE: Auto-login with local user
    console.log('[Kalaama] Local mode - auto login');
    this.userSubject.next(LOCAL_USER);

    // =============================================================================
    // SUPABASE CODE - Uncomment when ready
    // =============================================================================
    // try {
    //   const stored = await this.getStoredSession();
    //   if (stored) {
    //     await this.supabase.auth.setSession({
    //       access_token: stored.access_token,
    //       refresh_token: stored.refresh_token,
    //     });
    //   }
    //   const { data: { user } } = await this.supabase.auth.getUser();
    //   this.userSubject.next(user);
    // } catch (error) {
    //   console.error('[Kalaama] Session check failed:', error);
    //   this.userSubject.next(null);
    // }
    // =============================================================================
  }

  /**
   * Sign in with Google OAuth (disabled in local mode)
   */
  async signInWithGoogle(): Promise<void> {
    // LOCAL MODE: Just set local user
    console.log('[Kalaama] Local mode - Google auth disabled');
    this.userSubject.next(LOCAL_USER);

    // =============================================================================
    // SUPABASE CODE - Uncomment when ready
    // =============================================================================
    // try {
    //   const redirectUrl = chrome.identity.getRedirectURL();
    //   const { data, error } = await this.supabase.auth.signInWithOAuth({
    //     provider: 'google',
    //     options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    //   });
    //   if (error) throw error;
    //   // ... OAuth flow
    // } catch (error) {
    //   console.error('[Kalaama] Google sign-in failed:', error);
    //   throw error;
    // }
    // =============================================================================
  }

  /**
   * Sign in with email and password (disabled in local mode)
   */
  async signInWithEmail(email: string, password: string): Promise<void> {
    // LOCAL MODE: Just set local user
    console.log('[Kalaama] Local mode - email auth disabled');
    this.userSubject.next({
      ...LOCAL_USER,
      email: email,
      name: email.split('@')[0],
    });
  }

  /**
   * Sign up with email and password (disabled in local mode)
   */
  async signUp(email: string, password: string): Promise<void> {
    // LOCAL MODE: Same as sign in
    await this.signInWithEmail(email, password);
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    // LOCAL MODE: Clear local user
    console.log('[Kalaama] Local mode - sign out');
    this.userSubject.next(null);

    // Clear any stored data if needed
    await this.clearSession();
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.userSubject.value !== null;
  }

  /**
   * Store session in chrome.storage (for future Supabase use)
   */
  private async storeSession(
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          supabase_session: {
            access_token: accessToken,
            refresh_token: refreshToken,
          },
        },
        resolve
      );
    });
  }

  /**
   * Clear session from chrome.storage
   */
  private async clearSession(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['supabase_session'], resolve);
    });
  }
}
