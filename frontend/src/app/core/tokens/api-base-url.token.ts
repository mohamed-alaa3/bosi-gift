import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Injection token for the API base URL.
 * Defaults to `environment.apiBaseUrl`.
 * Can be overridden in tests or in specific module contexts.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});