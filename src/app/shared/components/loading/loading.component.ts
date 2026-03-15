import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 py-8">
      <div
        class="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"
      ></div>
      @if (message) {
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ message }}</p>
      }
    </div>
  `,
})
export class LoadingComponent {
  @Input() message = '';
}
