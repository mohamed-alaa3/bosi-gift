import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { CartStore } from '../../core/stores/cart.store';
import { UiStore } from '../../core/stores/ui.store';
import { WishlistService } from '../../core/services/wishlist.service';
import { decodeEntities } from '../../core/utils/html-entities';
import { WishlistStore } from '../../core/stores/wishlist.store';
import { AuthStore } from '../../core/stores/auth.store';

import {
  Product,
  Review,
  SelectedOption,
  LocalizedText,
  ProductCategoryRef,
} from '../../core/models';

import { LocalizedPipe } from '../../shared/pipes/localized.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../shared/pipes/safe-image.pipe';
import {
  BreadcrumbsComponent,
  Breadcrumb,
} from '../../shared/components/breadcrumbs/breadcrumbs.component';
import { RatingStarsComponent } from '../../shared/components/rating-stars/rating-stars.component';
import { QuantityStepperComponent } from '../../shared/components/quantity-stepper/quantity-stepper.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

type LoadState = 'loading' | 'success' | 'error';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-product-details-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    LocalizedPipe,
    PricePipe,
    SafeImagePipe,
    BreadcrumbsComponent,
    RatingStarsComponent,
    QuantityStepperComponent,
    ProductCardComponent,
    SkeletonCardComponent,
    EmptyStateComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './product-details.page.html',
  styleUrl: './product-details.page.scss',
})
export class ProductDetailsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private cartStore = inject(CartStore);
  private wishlistService = inject(WishlistService);
  private wishlistStore = inject(WishlistStore);
  private authStore = inject(AuthStore);
  private uiStore = inject(UiStore);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly product = signal<Product | null>(null);
  protected readonly related = signal<Product[]>([]);
  protected readonly reviews = signal<Review[]>([]);

  // Gallery
  protected readonly activeImage = signal<string>('');

  // Options
  protected readonly selectedOptions = signal<SelectedOption[]>([]);

  // Quantity
  protected readonly quantity = signal(1);

  // UI
  protected readonly activeTab = signal<'description' | 'specs' | 'shipping'>('description');
  protected readonly addingToCart = signal(false);

  // --- Derived: breadcrumbs ---
  protected readonly breadcrumbs = computed<Breadcrumb[]>(() => {
    const p = this.product();
    if (!p) return [];
    return [
      { label: 'Home', url: '/' },
      { label: 'Shop', url: '/shop' },
      { label: p.name.en || p.name.ar },
    ];
  });
  protected addRelatedToCart(product: Product): void {
    if (!this.authStore.isAuthenticated()) {
this.toast.info(this.translate.instant('toast.signInToAddToCart'));
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

  protected toggleRelatedWishlist(product: Product): void {
    if (!this.authStore.isAuthenticated()) {
this.toast.info(this.translate.instant('toast.signInToSaveToWishlist'));
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
  // --- Derived: images ---
  protected readonly images = computed(() => {
    const p = this.product();
    if (!p) return [];
    return p.imageUrls?.length ? p.imageUrls : p.images;
  });

  // --- Derived: category (safe type) ---
  protected readonly categoryRef = computed<ProductCategoryRef | null>(() => {
    const p = this.product();
    if (!p) return null;
    const c = p.category;
    if (c && typeof c === 'object' && 'name' in c) {
      return c as ProductCategoryRef;
    }
    return null;
  });

  // --- Derived: review author name ---
  protected readonly clean = decodeEntities;

  protected authorName(review: Review): string {
    const u = review.user;
    if (u && typeof u === 'object' && 'name' in u) {
      return (u as { name: string }).name;
    }
    return 'Anonymous';
  }

  // --- Derived: pricing ---
  protected readonly hasDiscount = computed(() => {
    const p = this.product();
    if (!p) return false;
    return p.discountPrice != null && p.discountPrice > 0 && p.discountPrice < p.price;
  });

  protected readonly effectivePrice = computed(() => {
    const p = this.product();
    if (!p) return 0;
    return this.hasDiscount() ? p.discountPrice! : p.price;
  });

  protected readonly discountPercent = computed(() => {
    const p = this.product();
    if (!p || !this.hasDiscount()) return 0;
    return Math.round(((p.price - (p.discountPrice ?? 0)) / p.price) * 100);
  });

  protected readonly isOutOfStock = computed(() => (this.product()?.stock ?? 0) <= 0);

  protected readonly inWishlist = computed(() => {
    const p = this.product();
    return p ? this.wishlistStore.has(p._id) : false;
  });

  protected readonly canAddToCart = computed(
    () => !this.isOutOfStock() && !!this.product() && !this.addingToCart(),
  );

  protected readonly showRelated = computed(() => this.related().length > 0);

  protected readonly stockMax = computed(() => {
    const p = this.product();
    return p ? Math.max(1, p.stock) : 1;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const slug = params.get('slug') ?? '';
          this.state.set('loading');
          this.product.set(null);
          this.related.set([]);
          this.reviews.set([]);
          this.selectedOptions.set([]);
          this.quantity.set(1);
          this.activeTab.set('description');

          return this.productService.getByIdOrSlug(slug).pipe(
            timeout(FETCH_TIMEOUT_MS),
            catchError(() => of(null)),
          );
        }),
      )
      .subscribe((res) => {
        if (!res || !res.success || !res.data) {
          this.state.set('error');
          return;
        }

        const product = res.data;
        this.product.set(product);
        this.activeImage.set(product.imageUrls?.[0] ?? product.images?.[0] ?? '');
        this.state.set('success');

        // Load related
        this.productService
          .getRelated(product._id, 4)
          .pipe(
            timeout(FETCH_TIMEOUT_MS),
            catchError(() => of(null)),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe((r) => {
            if (r?.success) this.related.set(r.data ?? []);
          });

        // Load reviews
        this.productService
          .listReviews(product._id, 1, 10)
          .pipe(
            timeout(FETCH_TIMEOUT_MS),
            catchError(() => of(null)),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe((r) => {
            if (r?.success) this.reviews.set(r.data ?? []);
          });
      });
  }

  // --- Gallery ---
  protected setActiveImage(url: string): void {
    this.activeImage.set(url);
  }

  // --- Options ---
  protected isOptionSelected(groupName: LocalizedText, valueName: LocalizedText): boolean {
    return this.selectedOptions().some(
      (o) => o.name.en === groupName.en && o.value.en === valueName.en,
    );
  }

  protected selectOption(groupName: LocalizedText, valueName: LocalizedText): void {
    const current = this.selectedOptions();
    const filtered = current.filter((o) => o.name.en !== groupName.en);
    const next = [...filtered, { name: groupName, value: valueName }];
    this.selectedOptions.set(next);
  }

  // --- Tabs ---
  protected setTab(tab: 'description' | 'specs' | 'shipping'): void {
    this.activeTab.set(tab);
  }

  // --- Cart ---
  protected addToCart(): void {
    const product = this.product();
    if (!product || this.addingToCart() || this.isOutOfStock()) return;

    if (!this.authStore.isAuthenticated()) {
this.toast.info(this.translate.instant('toast.signInToAddToCart'));
      return;
    }

    this.addingToCart.set(true);

    this.cartService
      .add({
        productId: product._id,
        quantity: this.quantity(),
        selectedOptions: this.selectedOptions(),
      })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.addingToCart.set(false);
        if (res?.success) {
this.toast.success(this.translate.instant('toast.addedToCart'));
          this.uiStore.openCartDrawer();
        }
      });
  }

  // --- Wishlist ---
  protected toggleWishlist(): void {
    const product = this.product();
    if (!product) return;

    if (!this.authStore.isAuthenticated()) {
this.toast.info(this.translate.instant('toast.signInToSaveToWishlist'));
      return;
    }

    const action = this.inWishlist()
      ? this.wishlistService.remove(product._id)
      : this.wishlistService.add(product._id);

    action
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.success) {
this.toast.success(
  this.translate.instant(this.inWishlist() ? 'toast.removedFromWishlist' : 'toast.addedToWishlist'),
);        }
      });
  }

  // --- Quantity ---
  protected onQuantityChange(qty: number): void {
    this.quantity.set(qty);
  }

  // --- Retry ---
  protected retry(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (!slug) return;
    this.ngOnInit();
  }
}
