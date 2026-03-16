import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, BottomNavComponent],
  template: `
    <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <app-header
        [isLoggedIn]="isLoggedIn"
        [userName]="userName"
        (onLogout)="logout()"
      />

      <main class="flex-1 overflow-y-auto pb-16">
        <router-outlet />
      </main>

      <app-bottom-nav />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `],
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoggedIn = false;
  userName = '';

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.isLoggedIn = !!user;
      this.userName = user?.email?.split('@')[0] || '';
    });

    // Check initial auth state (but don't redirect)
    this.authService.checkSession();
  }

  logout() {
    this.authService.signOut();
    this.router.navigate(['/']);
  }
}
