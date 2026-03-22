import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex justify-around items-center z-50">
      <!-- Captions Tab -->
      <a
        routerLink="/"
        class="flex flex-col items-center p-2 rounded-xl transition-all"
        [class.bg-indigo-100]="isActive('/')"
        [class.dark:bg-indigo-900]="isActive('/')"
        title="Captions"
      >
        <svg
          class="w-6 h-6 transition-colors"
          [class.text-indigo-600]="isActive('/')"
          [class.dark:text-indigo-400]="isActive('/')"
          [class.text-slate-500]="!isActive('/')"
          [class.dark:text-slate-400]="!isActive('/')"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
        </svg>
      </a>

      <!-- Reading Tab -->
      <a
        routerLink="/reading"
        class="flex flex-col items-center p-2 rounded-xl transition-all"
        [class.bg-indigo-100]="isActive('/reading')"
        [class.dark:bg-indigo-900]="isActive('/reading')"
        title="Reading"
      >
        <svg
          class="w-6 h-6 transition-colors"
          [class.text-indigo-600]="isActive('/reading')"
          [class.dark:text-indigo-400]="isActive('/reading')"
          [class.text-slate-500]="!isActive('/reading')"
          [class.dark:text-slate-400]="!isActive('/reading')"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </a>

      <!-- Vocabulary Tab -->
      <a
        routerLink="/vocabulary"
        class="flex flex-col items-center p-2 rounded-xl transition-all"
        [class.bg-indigo-100]="isActive('/vocabulary')"
        [class.dark:bg-indigo-900]="isActive('/vocabulary')"
        title="Vocabulary"
      >
        <svg
          class="w-6 h-6 transition-colors"
          [class.text-indigo-600]="isActive('/vocabulary')"
          [class.dark:text-indigo-400]="isActive('/vocabulary')"
          [class.text-slate-500]="!isActive('/vocabulary')"
          [class.dark:text-slate-400]="!isActive('/vocabulary')"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
      </a>

      <!-- Learn Tab -->
      <a
        routerLink="/learn"
        class="flex flex-col items-center p-2 rounded-xl transition-all"
        [class.bg-indigo-100]="isActive('/learn')"
        [class.dark:bg-indigo-900]="isActive('/learn')"
        title="Learn"
      >
        <svg
          class="w-6 h-6 transition-colors"
          [class.text-indigo-600]="isActive('/learn')"
          [class.dark:text-indigo-400]="isActive('/learn')"
          [class.text-slate-500]="!isActive('/learn')"
          [class.dark:text-slate-400]="!isActive('/learn')"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/>
        </svg>
      </a>

      <!-- Settings Tab -->
      <a
        routerLink="/settings"
        class="flex flex-col items-center p-2 rounded-xl transition-all"
        [class.bg-indigo-100]="isActive('/settings')"
        [class.dark:bg-indigo-900]="isActive('/settings')"
        title="Settings"
      >
        <svg
          class="w-6 h-6 transition-colors"
          [class.text-indigo-600]="isActive('/settings')"
          [class.dark:text-indigo-400]="isActive('/settings')"
          [class.text-slate-500]="!isActive('/settings')"
          [class.dark:text-slate-400]="!isActive('/settings')"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </a>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class BottomNavComponent {
  private router = inject(Router);

  isActive(path: string): boolean {
    const url = this.router.url;
    if (path === '/') {
      return url === '/' || url === '/captions';
    }
    if (path === '/learn') {
      return url.startsWith('/learn');
    }
    return url === path;
  }
}
