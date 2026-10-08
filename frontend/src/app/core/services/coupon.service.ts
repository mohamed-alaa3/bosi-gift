import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { CouponStore } from '../stores/coupon.store';
import {
  ApiSuccessResponse,
  AppliedCoupon,
  CouponValidationResult,
} from '../models';

function toApplied(result: CouponValidationResult): AppliedCoupon {
  return {
    code: result.code,
    discount: result.discount,
    type: result.type,
    value: result.value,
  };
}

/**
 * Storefront coupon API.
 * The backend is authoritative: it validates against the user's server-side
 * cart and returns the discount. The client never computes discounts.
 */
@Injectable({ providedIn: 'root' })
export class CouponService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private store = inject(CouponStore);

  private readonly endpoint = `${this.baseUrl}/coupons`;

  validate(code: string): Observable<ApiSuccessResponse<CouponValidationResult>> {
    return this.http.post<ApiSuccessResponse<CouponValidationResult>>(
      `${this.endpoint}/validate`,
      { code },
    );
  }

  /** Validate a code and, when valid, keep it as the applied coupon. */
  apply(code: string): Observable<CouponValidationResult> {
    return this.validate(code).pipe(
      map((res) => res.data),
      tap((result) => {
        if (result.valid) this.store.set(toApplied(result));
      }),
    );
  }

  /**
   * Re-validate the applied coupon against the current server-side cart.
   * - Still valid: the stored discount is refreshed.
   * - No longer valid: the coupon is removed (the result explains why).
   * - Nothing applied / network failure: emits null and leaves state untouched.
   */
  refresh(): Observable<CouponValidationResult | null> {
    const code = this.store.code();
    if (!code) return of(null);

    return this.validate(code).pipe(
      map((res) => res.data),
      tap((result) => {
        if (result.valid) this.store.set(toApplied(result));
        else this.store.clear();
      }),
      catchError(() => of(null)),
    );
  }

  remove(): void {
    this.store.clear();
  }
}
