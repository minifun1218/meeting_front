import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'meeting/:roomName',
    loadComponent: () => import('./features/meeting/meeting-room/meeting-room.component').then(m => m.MeetingRoomComponent),
    canActivate: [authGuard]
  },
  {
    path: 'recordings',
    loadComponent: () => import('./features/recordings/recordings-list/recordings-list.component').then(m => m.RecordingsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'join',
    loadComponent: () => import('./features/meeting/join/join.component').then(m => m.JoinComponent)
  },
  {
    path: 'responsive-test',
    loadComponent: () => import('./features/meeting/responsive-test/responsive-test.component').then(m => m.ResponsiveTestComponent)
  },
  {
    path: '**',
    redirectTo: '/home'
  }
];
