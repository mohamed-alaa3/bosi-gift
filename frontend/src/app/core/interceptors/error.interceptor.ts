import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../stores/auth.store';
import { ToastService } from '../services/toast.service';
import { ApiErrorResponse } from '../models';

/**
 * Global HTTP error handler.
 * - On 401: clears the session (user must sign in again) and shows a message.
 * - On 403: shows "forbidden".
 * - On 5xx: shows a generic server error.
 * - Otherwise: uses the backend's message if available.
 *
 * Re-throws the error so feature services can react if needed.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Something went wrong. Please try again.';

      const apiError = error.error as ApiErrorResponse | undefined;
      if (apiError?.message) message = apiError.message;

      if (error.status === 401) {
        // Session expired or invalid — clear local session
        authStore.clear();
        message = apiError?.message || 'Your session has expired. Please sign in again.';
      } else if (error.status === 403) {
        message = apiError?.message || "You don't have permission to do that.";
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later.';
      }

      // Avoid noisy toasts on silent endpoints (optional)
      // For now, always show. Can refine later with a header flag.
      toast.error(message);

      return throwError(() => error);
    })
  );
};