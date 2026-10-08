import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./login.page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        loadComponent: () => import('./register.page').then((m) => m.RegisterPage),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
    ],
  },
];
