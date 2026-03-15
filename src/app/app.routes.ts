import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/captions/captions.component').then(
        (m) => m.CaptionsComponent
      ),
  },
  {
    path: 'captions',
    loadComponent: () =>
      import('./features/captions/captions.component').then(
        (m) => m.CaptionsComponent
      ),
  },
  {
    path: 'vocabulary',
    loadComponent: () =>
      import('./features/vocabulary/vocabulary-list/vocabulary-list.component').then(
        (m) => m.VocabularyListComponent
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
