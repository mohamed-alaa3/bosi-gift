import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Product } from '../../../../core/models';
import { GiftBox, Ribbon, WrapStyle } from '../../gift-builder.types';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';

@Component({
  selector: 'app-gift-review-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LocalizedPipe, PricePipe, SafeImagePipe],
  template: `
    <div class="review-panel">
      <h2 class="review-panel__title">{{ 'giftBuilder.reviewTitle' | translate }}</h2>

      @if (box(); as b) {
        <div class="review-panel__section">
          <h3 class="review-panel__label">{{ 'giftBuilder.box' | translate }}</h3>
          <div class="review-panel__row">
            <div class="review-panel__thumb">
              @if (b.imageUrl || b.image) {
                <img
                  [src]="b.imageUrl || b.image | safeImage"
                  [alt]="b.name | localized"
                  class="img-fallback"
                />
              }
            </div>
            <div class="review-panel__info">
              <p class="review-panel__name">{{ b.name | localized }}</p>
              <p class="review-panel__price">{{ b.basePrice | price }}</p>
            </div>
          </div>
        </div>
      }

      @if (items().length > 0) {
        <div class="review-panel__section">
          <h3 class="review-panel__label">
            {{ 'giftBuilder.items' | translate }} ({{ items().length }})
          </h3>
          @for (item of items(); track item._id) {
            <div class="review-panel__row">
              <div class="review-panel__thumb">
                @if (item.imageUrls?.[0] || item.images?.[0]) {
                  <img
                    [src]="item.imageUrls?.[0] || item.images?.[0] | safeImage"
                    [alt]="item.name | localized"
                    class="img-fallback"
                  />
                }
              </div>
              <div class="review-panel__info">
                <p class="review-panel__name">{{ item.name | localized }}</p>
              </div>
              <span class="review-panel__price">{{ item.price | price }}</span>
            </div>
          }
        </div>
      }

      @if (wrapStyle(); as w) {
        <div class="review-panel__section">
          <h3 class="review-panel__label">{{ 'giftBuilder.wrap' | translate }}</h3>
          <div class="review-panel__row">
            <div class="review-panel__info">
              <p class="review-panel__name">{{ w.name | localized }}</p>
            </div>
            <span class="review-panel__price">{{ w.price | price }}</span>
          </div>
        </div>
      }

      @if (ribbon(); as r) {
        <div class="review-panel__section">
          <h3 class="review-panel__label">{{ 'giftBuilder.ribbon' | translate }}</h3>
          <div class="review-panel__row">
            <span class="review-panel__dot" [style.background-color]="r.color"></span>
            <div class="review-panel__info">
              <p class="review-panel__name">{{ r.name | localized }}</p>
            </div>
            <span class="review-panel__price">{{ r.price | price }}</span>
          </div>
        </div>
      }

      @if (note()) {
        <div class="review-panel__section">
          <h3 class="review-panel__label">{{ 'giftBuilder.note' | translate }}</h3>
          <p class="review-panel__note">{{ note() }}</p>
        </div>
      }

      <div class="review-panel__total">
        <span>{{ 'cart.total' | translate }}</span>
        <span>{{ subtotal() | price }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .review-panel__title {
        font-family: 'Poppins', sans-serif;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
        margin: 0 0 1.5rem;
      }
      .review-panel__section {
        padding: 1rem 0;
        border-bottom: 1px solid var(--border);

        &:last-of-type {
          border-bottom: none;
        }
      }
      .review-panel__label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-subtle);
        margin: 0 0 0.75rem;
      }
      .review-panel__row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0;
      }
      .review-panel__thumb {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
        overflow: hidden;
        flex-shrink: 0;
        background-color: var(--bg-muted);

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      .review-panel__info {
        flex: 1;
        min-width: 0;
      }
      .review-panel__name {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text);
        margin: 0;
      }
      .review-panel__price {
        font-family: 'Poppins', sans-serif;
        font-size: 0.9375rem;
        font-weight: 700;
        color: var(--text);
      }
      .review-panel__dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.08);
      }
      .review-panel__note {
        font-size: 0.9375rem;
        color: var(--text);
        line-height: 1.6;
        margin: 0;
        padding: 0.75rem 1rem;
        background-color: var(--bg-muted);
        border-radius: var(--radius-md);
        white-space: pre-wrap;
      }
      .review-panel__total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
        margin-top: 1rem;
        border-top: 2px solid var(--border);
        font-family: 'Poppins', sans-serif;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text);

        span:last-child {
          color: var(--brand-primary);
          font-size: 1.5rem;
        }
      }
    `,
  ],
})
export class ReviewPanelComponent {
  readonly box = input<GiftBox | null>(null);
  readonly items = input<Product[]>([]);
  readonly wrapStyle = input<WrapStyle | null>(null);
  readonly ribbon = input<Ribbon | null>(null);
  readonly note = input<string>('');
  readonly subtotal = input<number>(0);
}
