import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../../../core/services/cart.service';
import { CartStore } from '../../../../core/stores/cart.store';
import { AuthStore } from '../../../../core/stores/auth.store';
import { UiStore } from '../../../../core/stores/ui.store';
import { ToastService } from '../../../../core/services/toast.service';
import { LanguageService } from '../../../../core/services/language.service';
import { TranslateService } from '@ngx-translate/core';
import { CartItem } from '../../../../core/models';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';
import { QuantityStepperComponent } from '../../../../shared/components/quantity-stepper/quantity-stepper.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';

type LoadState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    LocalizedPipe,
    PricePipe,
    SafeImagePipe,
    QuantityStepperComponent,
    LoaderComponent,
  ],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
})
export class CartDrawerComponent {
  private cartService = inject(CartService);
  private cartStore = inject(CartStore);
  private authStore = inject(AuthStore);
  private uiStore = inject(UiStore);
  private toast = inject(ToastService);
  private router = inject(Router);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly isOpen = this.uiStore.cartDrawerOpen;
  protected readonly isRtl = this.languageService.isRtl;
  protected readonly cart = this.cartStore.cart;
  protected readonly itemCount = this.cartStore.itemCount;
  protected readonly subtotal = this.cartStore.subtotal;
  protected readonly hasUnavailable = this.cartStore.hasUnavailable;
  protected readonly isAuthenticated = this.authStore.isAuthenticated;

  protected readonly state = signal<LoadState>('idle');
  protected readonly updatingItemId = signal<string | null>(null);

  protected readonly items = computed<CartItem[]>(() => this.cartStore.items());

  protected readonly canCheckout = computed(
    () => this.isAuthenticated() && this.items().length > 0 && !this.hasUnavailable(),
  );

  constructor() {
    // Reactively reload the cart every time the drawer transitions
    // from closed → open. This ensures the drawer always shows fresh data.
    effect(() => {
      const open = this.uiStore.cartDrawerOpen();
      const authed = this.authStore.isAuthenticated();

      // Only fetch when drawer opens and user is logged in
      if (open && authed) {
        // Defer to avoid effect writing to signals during render
        queueMicrotask(() => this.loadCart());
      } else if (!authed) {
        // User not signed in → reset state
        this.state.set('idle');
      }
    });
  }

  protected loadCart(): void {
    if (!this.isAuthenticated()) {
      this.state.set('idle');
      return;
    }

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
        this.state.set(res.data.items.length > 0 ? 'success' : 'empty');
      });
  }

  protected close(): void {
    this.uiStore.closeCartDrawer();
  }

  protected onBackdropClick(): void {
    this.close();
  }

  protected updateQuantity(item: CartItem, quantity: number): void {
    if (this.updatingItemId() || !item.product) return;
    if (quantity === item.quantity) return;

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
        this.state.set(res.data.items.length > 0 ? 'success' : 'empty');
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
        this.state.set(res.data.items.length > 0 ? 'success' : 'empty');
      });
  }

  protected goToCart(): void {
    this.close();
    this.router.navigate(['/cart']);
  }

  protected goToCheckout(): void {
    this.close();
    this.router.navigate(['/checkout']);
  }

  protected goToShop(): void {
    this.close();
    this.router.navigate(['/shop']);
  }

  protected signIn(): void {
    this.close();
    this.router.navigate(['/auth/login'], {
      queryParams: { redirect: '/cart' },
    });
  }
}
