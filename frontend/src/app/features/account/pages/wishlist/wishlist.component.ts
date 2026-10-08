import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { CartService } from '../../../../core/services/cart.service';
import { WishlistStore } from '../../../../core/stores/wishlist.store';
import { ToastService } from '../../../../core/services/toast.service';

import { WishlistProductPreview } from '../../../../core/models';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-account-wishlist',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    LocalizedPipe,
    PricePipe,
    SafeImagePipe,
    EmptyStateComponent,
    LoaderComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.scss',
})
export class AccountWishlistComponent implements OnInit {
  private wishlistService = inject(WishlistService);
  private cartService = inject(CartService);
  private wishlistStore = inject(WishlistStore);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly items = computed<WishlistProductPreview[]>(() => this.wishlistStore.items());
  protected readonly processing = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.wishlistService
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

  protected removeItem(productId: string): void {
    if (this.processing()) return;
    this.processing.set(productId);

    this.wishlistService
      .remove(productId)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.processing.set(null);
        if (res?.success) {
this.toast.success(this.translate.instant('toast.removedFromWishlist'));
          this.state.set(res.data.items.length > 0 ? 'success' : 'empty');
        }
      });
  }

  protected addToCart(item: WishlistProductPreview): void {
    if (this.processing() || item.stock <= 0) return;
    this.processing.set(item._id);

    this.cartService
      .add({ productId: item._id, quantity: 1 })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.processing.set(null);
        if (res?.success) {
this.toast.success(this.translate.instant('toast.addedToCart'));
        }
      });
  }
}
