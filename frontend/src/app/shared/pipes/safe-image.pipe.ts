import { Pipe, PipeTransform, inject } from '@angular/core';
import { API_BASE_URL } from '../../core/tokens/api-base-url.token';

/**
 * Ensures an image path is safe to use in `<img [src]>`.
 * - If the path is already absolute (http/https), returns it as-is.
 * - If the path is relative (e.g. "/uploads/products/x.webp"), prepends the API root.
 * - If empty/null, returns a placeholder (empty string by default).
 *
 * Usage: <img [src]="product.images[0] | safeImage">
 */
@Pipe({
  name: 'safeImage',
  standalone: true,
})
export class SafeImagePipe implements PipeTransform {
  private apiBaseUrl = inject(API_BASE_URL);

  transform(path: string | null | undefined, fallback = ''): string {
    if (!path) return fallback;

    // Already absolute?
    if (/^https?:\/\//i.test(path)) return path;

    // If it already includes /uploads/, we need the origin (API root without /api).
    // The API_BASE_URL ends with /api; strip it.
    const origin = this.apiBaseUrl.replace(/\/api\/?$/, '');

    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${origin}${clean}`;
  }
}