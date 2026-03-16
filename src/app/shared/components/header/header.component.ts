import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">K</span>
          </div>
          <span class="font-semibold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Kalaama</span>
        </div>

        <!-- User info / Login -->
        @if (isLoggedIn) {
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-600 dark:text-slate-300">{{ userName }}</span>
            <button
              (click)="onLogout.emit()"
              class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        }
      </div>
    </header>
  `,
})
export class HeaderComponent {
  @Input() isLoggedIn = false;
  @Input() userName = '';
  @Output() onLogout = new EventEmitter<void>();
}
