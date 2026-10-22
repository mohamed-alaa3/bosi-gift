import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { CartService } from '../../../../core/services/cart.service';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { QuickAddService } from '../../../../core/services/quick-add.service';
import { ProductService } from '../../../../core/services/product.service';
import { Product } from '../../../../core/models';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { SkeletonCardComponent } from '../../../../shared/components/skeleton-card/skeleton-card.component';
import { TranslateService } from '@ngx-translate/core';
type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 5000;
const MAX_ITEMS = 4;

@Component({
  selector: 'app-best-sellers',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ProductCardComponent, SkeletonCardComponent],
  templateUrl: './best-sellers.component.html',
  styleUrl: './best-sellers.component.scss',
})
export class BestSellersComponent implements OnInit {
  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private authStore = inject(AuthStore);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private quickAdd = inject(QuickAddService);
  private translate = inject(TranslateService);
  protected readonly state = signal<LoadState>('loading');
  protected readonly products = signal<Product[]>([]);

  // Skeleton placeholders — a fixed-length array
  protected readonly skeletons = Array.from({ length: MAX_ITEMS }, (_, i) => i);
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
          // CartService.add auto-opens the drawer
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
  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.productService
      .list({ featured: true, limit: MAX_ITEMS })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => {
          // Silent — we surface an error state, not a thrown error
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res || !res.success) {
          this.state.set('error');
          return;
        }
        const items = res.data ?? [];
        this.products.set(items);
        this.state.set(items.length > 0 ? 'success' : 'empty');
      });
  }
}
