import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '../stores/auth.store';

/**
 * Blocks access to protected routes for unauthenticated users.
 * Redirects to /auth/login with a `redirect` query param.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) return true;

  return router.createUrlTree(['/auth/login'], {
    queryParams: { redirect: state.url },
  });
};