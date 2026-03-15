import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col items-center justify-center h-full px-6 py-8">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div class="w-20 h-20 mx-auto bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <span class="text-white font-bold text-3xl">K</span>
        </div>
        <h1 class="text-2xl font-bold text-gradient">Kalaama</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-2">Learn languages while watching YouTube</p>
      </div>

      <!-- Error message -->
      @if (error) {
        <div class="w-full mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {{ error }}
        </div>
      }

      <!-- Login form -->
      @if (showEmailForm) {
        <form (ngSubmit)="onEmailSubmit()" class="w-full space-y-4">
          <div>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="Email"
              class="input"
              required
            />
          </div>
          <div>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              placeholder="Password"
              class="input"
              required
            />
          </div>
          <button
            type="submit"
            [disabled]="loading"
            class="w-full btn-primary disabled:opacity-50"
          >
            {{ isSignUp ? 'Sign Up' : 'Sign In' }}
          </button>
          <button
            type="button"
            (click)="showEmailForm = false"
            class="w-full btn-secondary"
          >
            Back
          </button>
          <p class="text-center text-sm text-slate-500">
            {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
            <button
              type="button"
              (click)="isSignUp = !isSignUp"
              class="text-primary-500 hover:text-primary-600 font-medium"
            >
              {{ isSignUp ? 'Sign In' : 'Sign Up' }}
            </button>
          </p>
        </form>
      } @else {
        <div class="w-full space-y-3">
          <!-- Google Sign In -->
          <button
            (click)="signInWithGoogle()"
            [disabled]="loading"
            class="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <!-- Divider -->
          <div class="relative my-4">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-300 dark:border-slate-600"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-slate-50 dark:bg-slate-900 text-slate-500">or</span>
            </div>
          </div>

          <!-- Email Sign In -->
          <button
            (click)="showEmailForm = true"
            class="w-full btn-secondary"
          >
            Continue with Email
          </button>
        </div>
      }

      <!-- Loading overlay -->
      @if (loading) {
        <div class="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center">
          <div class="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        </div>
      }
    </div>
  `,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = '';
  loading = false;
  showEmailForm = false;
  isSignUp = false;

  async signInWithGoogle(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      await this.authService.signInWithGoogle();
      this.router.navigate(['/']);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to sign in with Google';
    } finally {
      this.loading = false;
    }
  }

  async onEmailSubmit(): Promise<void> {
    if (!this.email || !this.password) return;

    this.loading = true;
    this.error = '';

    try {
      if (this.isSignUp) {
        await this.authService.signUp(this.email, this.password);
      } else {
        await this.authService.signInWithEmail(this.email, this.password);
      }
      this.router.navigate(['/']);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to sign in';
    } finally {
      this.loading = false;
    }
  }
}
