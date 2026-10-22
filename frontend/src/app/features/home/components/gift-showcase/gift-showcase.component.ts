import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, of, timeout } from 'rxjs';

import { Product, ProductQuery } from '../../../../core/models';
import { CartService } from '../../../../core/services/cart.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

export type ShowcaseKind = 'trending' | 'offers' | 'boxes' | 'featured';

interface ShowcaseConfig {
  /** i18n prefix: <prefix>.eyebrow|title|subtitle|cta|tag */
  prefix: string;
  query: ProductQuery;
  layout: 'rail' | 'grid';
  tagEmoji: string;
  /** Where "view all" goes — the real Shop with the matching filter. */
  shopParams: Record<string, string>;
}

const CONFIG: Record<ShowcaseKind, ShowcaseConfig> = {
  trending: {
    prefix: 'home.trending',
    query: { trending: true, limit: 8 },
    layout: 'rail',
    tagEmoji: '🔥',
    shopParams: { trending: 'true' },
  },
  offers: {
    prefix: 'home.offers',
    query: { dailyOffer: true, limit: 8 },
    layout: 'rail',
    tagEmoji: '🏷️',
    shopParams: { dailyOffer: 'true' },
  },
  boxes: {
    prefix: 'home.boxes',
    query: { readyBox: true, limit: 8 },
    layout: 'rail',
    tagEmoji: '🎀',
    shopParams: { readyBox: 'true' },
  },
  featured: {
    prefix: 'home.featured',
    query: { featured: true, limit: 6 },
    layout: 'grid',
    tagEmoji: '💕',
    shopParams: { sort: 'featured' },
  },
};

const FETCH_TIMEOUT_MS = 8000;

/**
 * One reusable homepage showcase for every "curated products" section.
 * Data is always real (backend filters); with no matching products — or on
 * error — the section simply doesn't render (no fake placeholders).
 * Cart / wishlist behaviour is identical to the Shop grid.
 */
@Component({
  selector: 'app-gift-showcase',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, ProductCardComponent, RevealOnScrollDirective],
  template: `
    @if (products().length > 0) {
      <section
        class="gs gd-band"
        [class]="'gs--' + kind()"
        [attr.aria-labelledby]="titleId()"
      >
        <span class="gs__deco gs__deco--a" aria-hidden="true">{{ cfg().tagEmoji }}</span>
        <span class="gs__deco gs__deco--b" aria-hidden="true">✨</span>

        <div class="gd">
          <div class="gs__top" appRevealOnScroll>
            <header class="gd-head gs__head">
              <p class="gd-eyebrow">{{ cfg().prefix + '.eyebrow' | translate }}</p>
              <h2 class="gd-title" [id]="titleId()">{{ cfg().prefix + '.title' | translate }}</h2>
              <p class="gd-sub">{{ cfg().prefix + '.subtitle' | translate }}</p>
            </header>

            @if (cfg().layout === 'rail') {
              <div class="gd-rail-nav">
                <button type="button" (click)="scrollRail(-1)" [attr.aria-label]="'common.previous' | translate">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button type="button" (click)="scrollRail(1)" [attr.aria-label]="'common.next' | translate">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            }
          </div>

          @if (cfg().layout === 'rail') {
            <div
              #rail
              class="gd-rail"
              tabindex="0"
              role="region"
              [attr.aria-label]="cfg().prefix + '.title' | translate"
            >
              @for (p of products(); track p._id) {
                <div class="gs-item">
                  <span class="gs-tag">{{ cfg().tagEmoji }} {{ cfg().prefix + '.tag' | translate }}</span>
                  <app-product-card
                    [product]="p"
                    (addToCart)="onAddToCart($event)"
                    (toggleWishlist)="onToggleWishlist($event)"
                  />
                </div>
              }
            </div>
          } @else {
            <div class="gs-grid" appRevealOnScroll [stagger]="true" [delay]="70">
              @for (p of products(); track p._id) {
                <div class="gs-item">
                  <span class="gs-tag">{{ cfg().tagEmoji }} {{ cfg().prefix + '.tag' | translate }}</span>
                  <app-product-card
                    [product]="p"
                    (addToCart)="onAddToCart($event)"
                    (toggleWishlist)="onToggleWishlist($event)"
                  />
                </div>
              }
            </div>
          }

          <div class="gs__more">
            <a class="gd-btn gd-btn--ghost" routerLink="/shop" [queryParams]="cfg().shopParams">
              {{ cfg().prefix + '.cta' | translate }}
            </a>
          </div>
        </div>
      </section>
    }
  `,
  styleUrl: './gift-showcase.component.scss',
})
export class GiftShowcaseComponent implements OnInit {
  readonly kind = input.required<ShowcaseKind>();

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private language = inject(LanguageService);
  private destroyRef = inject(DestroyRef);

  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  protected readonly products = signal<Product[]>([]);
  protected readonly cfg = computed(() => CONFIG[this.kind()]);
  protected readonly titleId = computed(() => `gs-title-${this.kind()}`);

  ngOnInit(): void {
    this.productService
      .list(this.cfg().query)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.success) this.products.set(res.data ?? []);
      });
  }

  /** dir: +1 = forward (toward the end of the row), -1 = back. RTL-aware. */
  protected scrollRail(dir: 1 | -1): void {
    const el = this.rail()?.nativeElement;
    if (!el) return;
    const flip = this.language.isRtl() ? -1 : 1;
    el.scrollBy({ left: dir * flip * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  protected onAddToCart(product: Product): void {
    if (product.options?.length) {
      // Needs a choice (color/size/…): send the customer to the product page.
      this.toast.info(this.translate.instant('toast.selectOptionsFirst'));
      void this.router.navigate(['/products', product.slug]);
      return;
    }

    if (!this.authStore.isAuthenticated()) {
      this.toast.info(this.translate.instant('toast.signInToAddToCart'));
      this.authService.redirectToRegister();
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
        if (res?.success) this.toast.success(this.translate.instant('toast.addedToCart'));
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
        if (res) this.toast.success(this.translate.instant(res.added ? 'toast.addedToWishlist' : 'toast.removedFromWishlist'));
      });
  }
}
