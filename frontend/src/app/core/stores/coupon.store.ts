import { Injectable, computed, signal } from '@angular/core';
import { AppliedCoupon } from '../models';

const STORAGE_KEY = 'habiba.coupon';

/** Read the persisted coupon defensively (storage may be blocked or corrupted). */
function readStored(): AppliedCoupon | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as AppliedCoupon).code === 'string' &&
      typeof (parsed as AppliedCoupon).discount === 'number'
    ) {
      return parsed as AppliedCoupon;
    }
  } catch {
    // ignore — treat as "no coupon"
  }
  return null;
}

function persist(value: AppliedCoupon | null): void {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable — the coupon simply won't survive a reload
  }
}

/**
 * Coupon currently applied to the cart.
 * Holds the code + the last discount returned by the backend. The discount is
 * display-only: the backend re-validates and recalculates when the order is
 * created, and CouponService.refresh() keeps this in sync with the cart.
 */
@Injectable({ providedIn: 'root' })
export class CouponStore {
  private readonly _applied = signal<AppliedCoupon | null>(readStored());

  readonly applied = this._applied.asReadonly();
  readonly code = computed(() => this._applied()?.code ?? null);
  readonly discount = computed(() => this._applied()?.discount ?? 0);

  set(coupon: AppliedCoupon): void {
    this._applied.set(coupon);
    persist(coupon);
  }

  clear(): void {
    this._applied.set(null);
    persist(null);
  }
}
