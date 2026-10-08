import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { CartStore } from '../../../core/stores/cart.store';
import { CouponStore } from '../../../core/stores/coupon.store';
import { CouponService } from '../../../core/services/coupon.service';
import { CouponInvalidReason } from '../../../core/models';
import { PricePipe } from '../../pipes/price.pipe';

type InputError = CouponInvalidReason | 'NETWORK';

const REQUEST_TIMEOUT_MS = 8000;

/**
 * Coupon code field: input + Apply, or the applied coupon with a Remove button.
 *
 * - The backend validates against the user's server-side cart and returns the
 *   discount; this component never calculates it.
 * - The applied coupon is re-validated on mount and whenever the cart subtotal
 *   changes, so the discount can't go stale.
 * - Reusable: Feature 3 places it in the checkout "Coupon" step.
 */
@Component({
  selector: 'app-coupon-input',
  standalone: true,
  imports: [TranslatePipe, PricePipe],
  templateUrl: './coupon-input.component.html',
  styleUrl: './coupon-input.component.scss',
})
export class CouponInputComponent {
  private couponService = inject(CouponService);
  private couponStore = inject(CouponStore);
  private cartStore = inject(CartStore);
  private destroyRef = inject(DestroyRef);

  protected readonly applied = this.couponStore.applied;

  protected readonly code = signal('');
  protected readonly applying = signal(false);
  protected readonly error = signal<InputError | null>(null);
  /** Set when a previously applied coupon was dropped because it stopped being valid. */
  protected readonly removedReason = signal<CouponInvalidReason | null>(null);
  protected readonly minOrderAmount = signal<number | null>(null);

  constructor() {
    effect(() => {
      // Re-run whenever the cart subtotal changes (also runs once on mount).
      this.cartStore.subtotal();
      untracked(() => this.revalidate());
    });
  }

  protected onInput(event: Event): void {
    this.code.set((event.target as HTMLInputElement).value);
    this.error.set(null);
  }

  protected apply(): void {
    const value = this.code().trim();
    if (!value || this.applying()) return;

    this.applying.set(true);
    this.error.set(null);
    this.removedReason.set(null);

    this.couponService
      .apply(value)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.applying.set(false);

        if (!result) {
          this.error.set('NETWORK');
          return;
        }
        if (result.valid) {
          this.code.set('');
          return;
        }
        this.minOrderAmount.set(result.minOrderAmount);
        this.error.set(result.reason ?? 'NOT_FOUND');
      });
  }

  protected remove(): void {
    this.couponService.remove();
    this.error.set(null);
    this.removedReason.set(null);
  }

  private revalidate(): void {
    if (!this.couponStore.applied()) return;

    this.couponService
      .refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result || result.valid) return;
        // An empty cart is self-explanatory — only explain other reasons.
        if (result.reason && result.reason !== 'EMPTY_CART') {
          this.minOrderAmount.set(result.minOrderAmount);
          this.removedReason.set(result.reason);
        }
      });
  }
}
