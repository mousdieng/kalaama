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
    path: 'reading',
    loadComponent: () =>
      import('./features/reading/reading.component').then(
        (m) => m.ReadingComponent
      ),
  },
  {
    path: 'learn',
    loadComponent: () =>
      import('./features/learn/learn.component').then(
        (m) => m.LearnComponent
      ),
  },
  {
    path: 'learn/lesson/:id',
    loadComponent: () =>
      import('./features/learn/lesson/lesson.component').then(
        (m) => m.LessonComponent
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
    path: 'review',
    loadComponent: () =>
      import('./features/review/review.component').then(
        (m) => m.ReviewComponent
      ),
  },
  {
    path: 'video-player',
    loadComponent: () =>
      import('./features/video-player/video-player.component').then(
        (m) => m.VideoPlayerComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
