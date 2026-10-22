import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Product } from '../../../../core/models';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';
import { CartService } from '../../../../core/services/cart.service';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { QuickAddService } from '../../../../core/services/quick-add.service';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, RevealOnScrollDirective],
  template: `
    <div class="product-grid" role="list" appRevealOnScroll [stagger]="true">
      @for (product of products(); track product._id) {
        <div class="product-grid__item" role="listitem">
          <app-product-card
            [product]="product"
            (addToCart)="onAddToCart($event)"
            (toggleWishlist)="onToggleWishlist($event)"
          />
        </div>
      }
    </div>
  `,
  styles: [
    `
      .product-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }
      @media (min-width: 640px) {
        .product-grid {
          gap: 1.25rem;
        }
      }
      @media (min-width: 1024px) {
        .product-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.5rem;
        }
      }
      @media (min-width: 1280px) {
        .product-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class ProductGridComponent {
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private authStore = inject(AuthStore);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private quickAdd = inject(QuickAddService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly products = input<Product[]>([]);

  protected onAddToCart(product: Product): void {
    if (!this.authStore.isAuthenticated()) {
      this.toast.info(this.translate.instant('toast.signInToAddToCart'));
      this.authService.redirectToRegister();
      return;
    }
    if (product.options?.length) {
      // Needs a choice (color/size/…): pick it in the Quick Add modal.
      this.quickAdd.open(product);
      return;
    }


    this.cartService
      .add({ productId: product._id, quantity: 1, selectedOptions: [] })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.success) {
this.toast.success(this.translate.instant('toast.addedToCart'));
        }
      });
  }

  protected onToggleWishlist(product: Product): void {
    if (!this.authStore.isAuthenticated()) {
this.toast.info(this.translate.instant('toast.signInToSaveToWishlist'));
      this.authService.redirectToRegister();
      return;
    }

    this.wishlistService
      .toggle(product._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
this.toast.success(this.translate.instant(res.added ? 'toast.addedToWishlist' : 'toast.removedFromWishlist'));
        }
      });
  }
}
