import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../core/services/cart.service';
import { CartStore } from '../../core/stores/cart.store';
import { AuthStore } from '../../core/stores/auth.store';
import { CouponStore } from '../../core/stores/coupon.store';
import { ToastService } from '../../core/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { CartItem } from '../../core/models';
import { LocalizedPipe } from '../../shared/pipes/localized.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../shared/pipes/safe-image.pipe';
import { QuantityStepperComponent } from '../../shared/components/quantity-stepper/quantity-stepper.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { CouponInputComponent } from '../../shared/components/coupon-input/coupon-input.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    LocalizedPipe,
    PricePipe,
    SafeImagePipe,
    QuantityStepperComponent,
    EmptyStateComponent,
    LoaderComponent,
    CouponInputComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './cart.page.html',
  styleUrl: './cart.page.scss',
})
export class CartPage implements OnInit {
  private cartService = inject(CartService);
  private cartStore = inject(CartStore);
  private authStore = inject(AuthStore);
  private couponStore = inject(CouponStore);
  private toast = inject(ToastService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly isAuthenticated = this.authStore.isAuthenticated;
  protected readonly items = computed<CartItem[]>(() => this.cartStore.items());
  protected readonly subtotal = this.cartStore.subtotal;
  protected readonly hasUnavailable = this.cartStore.hasUnavailable;

  /** Discount from the applied coupon (calculated by the backend, display only). */
  protected readonly discount = this.couponStore.discount;
  protected readonly total = computed(() =>
    Math.max(0, Math.round((this.subtotal() - this.discount()) * 100) / 100),
  );

  protected readonly state = signal<LoadState>('loading');
  protected readonly updatingItemId = signal<string | null>(null);

  protected readonly canCheckout = computed(
    () => this.items().length > 0 && !this.hasUnavailable() && this.isAuthenticated(),
  );

  ngOnInit(): void {
    if (!this.isAuthenticated()) {
      this.state.set('empty');
      return;
    }
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.cartService
      .get()
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res || !res.success) {
          this.state.set('error');
          return;
        }
        this.applyCartState(res.data.items.length);
      });
  }

  protected updateQuantity(item: CartItem, quantity: number): void {
    if (this.updatingItemId() || quantity === item.quantity) return;
    this.updatingItemId.set(item._id);

    this.cartService
      .updateItem(item._id, { quantity })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.updatingItemId.set(null);
        if (!res?.success) return;
        this.applyCartState(res.data.items.length);
      });
  }

  protected removeItem(item: CartItem): void {
    if (this.updatingItemId()) return;
    this.updatingItemId.set(item._id);

    this.cartService
      .removeItem(item._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.updatingItemId.set(null);
        if (!res?.success) return;
        this.toast.success(this.translate.instant('toast.itemRemoved'));
        this.applyCartState(res.data.items.length);
      });
  }

  protected clearCart(): void {
    this.cartService
      .clear()
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.success) {
          this.couponStore.clear();
          this.state.set('empty');
        }
      });
  }

  /** Sync page state with the cart; an empty cart can't carry a coupon. */
  private applyCartState(itemCount: number): void {
    if (itemCount === 0) this.couponStore.clear();
    this.state.set(itemCount > 0 ? 'success' : 'empty');
  }

  protected goToShop(): void {
    this.router.navigate(['/shop']);
  }

  protected goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  protected signIn(): void {
    this.router.navigate(['/auth/login'], {
      queryParams: { redirect: '/cart' },
    });
  }
}
