import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Product } from '../../../../core/models';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';

@Component({
  selector: 'app-gift-item-picker',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LocalizedPipe, PricePipe, SafeImagePipe],
  template: `
    <div class="item-picker">
      <header class="item-picker__header">
        <h2 class="item-picker__title">{{ 'giftBuilder.pickItems' | translate }}</h2>
        <div class="item-picker__count" [class.is-full]="isFull()">
          {{ 'giftBuilder.remaining' | translate }}: <strong>{{ remaining() }}</strong>
        </div>
      </header>

      <div class="item-picker__grid">
        @for (product of products(); track product._id) {
          <div class="item-picker__card" [class.is-added]="isAdded(product._id)">
            <div class="item-picker__media">
              @if (product.imageUrls?.[0] || product.images?.[0]) {
                <img
                  [src]="product.imageUrls?.[0] || product.images?.[0] | safeImage"
                  [alt]="product.name | localized"
                  class="item-picker__image img-fallback"
                />
              } @else {
                <div class="item-picker__image img-fallback"></div>
              }
            </div>
            <div class="item-picker__body">
              <h3 class="item-picker__name">{{ product.name | localized }}</h3>
              <p class="item-picker__price">{{ product.price | price }}</p>
            </div>
            @if (!isAdded(product._id)) {
              <button
                type="button"
                class="item-picker__add"
                (click)="addItem.emit(product)"
                [disabled]="isFull()"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            } @else {
              <button
                type="button"
                class="item-picker__add is-added"
                (click)="removeItem.emit(product._id)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .item-picker__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }
      .item-picker__title {
        font-family: 'Poppins', sans-serif;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
        margin: 0;
      }
      .item-picker__count {
        padding: 0.5rem 1rem;
        background-color: var(--success-soft);
        color: var(--success);
        border-radius: var(--radius-full);
        font-size: 0.875rem;
        font-weight: 600;

        &.is-full {
          background-color: var(--warning-soft);
          color: var(--warning);
        }
      }
      .item-picker__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.75rem;
      }
      .item-picker__card {
        position: relative;
        background-color: var(--surface);
        border: 2px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
        transition: all var(--transition-base);

        &:hover {
          border-color: var(--brand-primary);
        }
        &.is-added {
          border-color: var(--success);
          box-shadow: 0 0 0 4px var(--success-soft);
        }
      }
      .item-picker__media {
        aspect-ratio: 1;
        background-color: var(--bg-muted);
      }
      .item-picker__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .item-picker__body {
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .item-picker__name {
        font-family: 'Poppins', sans-serif;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .item-picker__price {
        font-family: 'Poppins', sans-serif;
        font-size: 0.9375rem;
        font-weight: 700;
        color: var(--brand-primary);
        margin: 0;
      }
      .item-picker__add {
        position: absolute;
        top: 0.5rem;
        inset-inline-end: 0.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: var(--brand-primary);
        color: #fff;
        border: none;
        cursor: pointer;
        box-shadow: var(--shadow-md);
        transition: all var(--transition-fast);

        &:hover:not(:disabled) {
          transform: scale(1.1);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        &.is-added {
          background-color: var(--success);
        }
      }
    `,
  ],
})
export class ItemPickerComponent {
  readonly products = input<Product[]>([]);
  readonly selectedItems = input<Product[]>([]);
  readonly remaining = input<number>(0);
  readonly isFull = input<boolean>(false);

  readonly addItem = output<Product>();
  readonly removeItem = output<string>();

  protected isAdded(id: string): boolean {
    return this.selectedItems().some((p) => p._id === id);
  }
}
