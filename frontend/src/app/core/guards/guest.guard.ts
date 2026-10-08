import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '../stores/auth.store';

/**
 * Prevents authenticated users from visiting login/register pages.
 * Redirects them to home.
 */
export const guestGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) return true;

  return router.createUrlTree(['/']);
};