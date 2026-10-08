import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, of, shareReplay, tap } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, PublicGovernorate, PublicSettings } from '../models';

/** How long the cached copy is considered fresh. */
const CACHE_TTL_MS = 60_000;

/**
 * Public store settings (shipping fees, deposit, full-payment discount,
 * receiving numbers). Read-only, no auth.
 *
 * Cached in memory so several components can ask without extra requests.
 * The cache is a display convenience only — the backend recalculates every
 * amount when an order is quoted or created.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);

  private readonly endpoint = `${this.baseUrl}/settings/public`;

  private readonly _settings = signal<PublicSettings | null>(null);
  /** Last loaded settings (null until the first successful load). */
  readonly settings = this._settings.asReadonly();

  private fetchedAt = 0;
  private inFlight$: Observable<PublicSettings> | null = null;

  /**
   * @param force skip the cache (e.g. when entering checkout) so a fee the
   *              admin just changed is picked up right away.
   */
  load(force = false): Observable<PublicSettings> {
    const cached = this._settings();
    if (!force && cached && Date.now() - this.fetchedAt < CACHE_TTL_MS) {
      return of(cached);
    }

    // Share one request between concurrent callers
    if (this.inFlight$) return this.inFlight$;

    this.inFlight$ = this.http.get<ApiSuccessResponse<PublicSettings>>(this.endpoint).pipe(
      map((res) => res.data),
      tap((data) => {
        this._settings.set(data);
        this.fetchedAt = Date.now();
      }),
      finalize(() => {
        this.inFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.inFlight$;
  }

  /** Forget the cached copy (the next load() hits the API). */
  invalidate(): void {
    this.fetchedAt = 0;
  }

  /** Convenience lookup in the cached list. */
  governorate(key: string): PublicGovernorate | null {
    return this._settings()?.governorates.find((g) => g.key === key) ?? null;
  }
}
