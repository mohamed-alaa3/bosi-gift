import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LocalizedPipe } from '../../pipes/localized.pipe';
import { PricePipe } from '../../pipes/price.pipe';
import { SafeImagePipe } from '../../pipes/safe-image.pipe';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';
import { Product, LocalizedText } from '../../../core/models';
import { LanguageService } from '../../../core/services/language.service';
import { WishlistStore } from '../../../core/stores/wishlist.store';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    LocalizedPipe,
    PricePipe,
    SafeImagePipe,
    RatingStarsComponent,
  ],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly showWishlistButton = input<boolean>(true);
  readonly inWishlist = input<boolean>(false);

  readonly addToCart = output<Product>();
  readonly toggleWishlist = output<Product>();
  readonly quickView = output<Product>();

  private languageService = inject(LanguageService);

  protected readonly addingToCart = signal(false);
  protected readonly addedToCart = signal(false);
  protected readonly isPulsing = signal(false);

  protected readonly primaryImage = computed(() => {
    const p = this.product();
    return p.imageUrls?.[0] || p.images?.[0] || '';
  });

  protected readonly hasDiscount = computed(() => {
    const p = this.product();
    return p.discountPrice != null && p.discountPrice > 0 && p.discountPrice < p.price;
  });

  protected readonly discountPercent = computed(() => {
    const p = this.product();
    if (!this.hasDiscount()) return 0;
    return Math.round(((p.price - (p.discountPrice ?? 0)) / p.price) * 100);
  });

  protected readonly isOutOfStock = computed(() => this.product().stock <= 0);

  protected readonly isNew = computed(() => {
    const created = new Date(this.product().createdAt).getTime();
    const days = (Date.now() - created) / (1000 * 60 * 60 * 24);
    return days <= 30;
  });

  protected readonly isFeatured = computed(() => this.product().isFeatured);

  protected readonly productLink = computed(() => ['/products', this.product().slug]);

  private readonly wishlistStore = inject(WishlistStore);

  /** Heart state: explicit input OR the server-synced wishlist store. */
  protected readonly isInWishlist = computed(
    () => this.inWishlist() || this.wishlistStore.has(this.product()._id),
  );

  protected readonly isRtl = this.languageService.isRtl;

  protected readonly productCategory = computed<LocalizedText | null>(() => {
    const cat = this.product().category;
    if (cat && typeof cat === 'object' && 'name' in cat) {
      return (cat as { name: LocalizedText }).name;
    }
    return null;
  });

  protected onAddToCart(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isOutOfStock() || this.addingToCart() || this.addedToCart()) return;

    this.addingToCart.set(true);
    this.addToCart.emit(this.product());

    setTimeout(() => {
      this.addingToCart.set(false);
      this.addedToCart.set(true);
      setTimeout(() => this.addedToCart.set(false), 1800);
    }, 400);
  }

  protected onToggleWishlist(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isPulsing()) return;

    this.isPulsing.set(true);
    this.toggleWishlist.emit(this.product());
    setTimeout(() => this.isPulsing.set(false), 600);
  }

  protected onQuickView(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickView.emit(this.product());
  }
}
