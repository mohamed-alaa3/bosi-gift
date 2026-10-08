import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthStore } from '../stores/auth.store';

/**
 * Attaches the JWT as a Bearer token on outgoing requests,
 * unless the request already has an Authorization header.
 *
 * Reads the token from AuthStore (which is backed by localStorage).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.token();

  if (!token) return next(req);

  // Do not override an existing Authorization header
  if (req.headers.has('Authorization')) return next(req);

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(cloned);
};