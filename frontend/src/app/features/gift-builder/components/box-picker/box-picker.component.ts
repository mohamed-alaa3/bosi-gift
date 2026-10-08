import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { GiftBox } from '../../gift-builder.types';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';

@Component({
  selector: 'app-gift-box-picker',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LocalizedPipe, PricePipe, SafeImagePipe],
  template: `
    <div class="box-picker">
      <h2 class="box-picker__title">{{ 'giftBuilder.pickBox' | translate }}</h2>
      <div class="box-picker__grid">
        @for (box of boxes(); track box._id) {
          <button
            type="button"
            class="box-picker__card"
            [class.is-selected]="selectedId() === box._id"
            (click)="select.emit(box)"
          >
            <div class="box-picker__media">
              @if (box.imageUrl || box.image) {
                <img
                  [src]="box.imageUrl || box.image | safeImage"
                  [alt]="box.name | localized"
                  class="box-picker__image img-fallback"
                />
              } @else {
                <div class="box-picker__image img-fallback"></div>
              }
            </div>
            <div class="box-picker__body">
              <h3 class="box-picker__name">{{ box.name | localized }}</h3>
              <p class="box-picker__meta">
                {{ box.capacity }} {{ 'giftBuilder.items' | translate }}
              </p>
              <p class="box-picker__price">{{ box.basePrice | price }}</p>
            </div>
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .box-picker__title {
        font-family: 'Poppins', sans-serif;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
        margin: 0 0 1.5rem;
      }
      .box-picker__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
      }
      .box-picker__card {
        display: flex;
        flex-direction: column;
        padding: 0;
        background-color: var(--surface);
        border: 2px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
        cursor: pointer;
        transition: all var(--transition-base);
        text-align: start;

        &:hover {
          border-color: var(--brand-primary);
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        &.is-selected {
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 4px var(--brand-primary-soft);
        }
      }
      .box-picker__media {
        aspect-ratio: 1;
        background-color: var(--bg-muted);
        overflow: hidden;
      }
      .box-picker__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .box-picker__body {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .box-picker__name {
        font-family: 'Poppins', sans-serif;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text);
        margin: 0;
      }
      .box-picker__meta {
        font-size: 0.8125rem;
        color: var(--text-muted);
        margin: 0;
      }
      .box-picker__price {
        font-family: 'Poppins', sans-serif;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--brand-primary);
        margin: 0.25rem 0 0;
      }
    `,
  ],
})
export class BoxPickerComponent {
  readonly boxes = input<GiftBox[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly select = output<GiftBox>();
}
