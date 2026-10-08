import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Ribbon, WrapStyle } from '../../gift-builder.types';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';

@Component({
  selector: 'app-gift-wrap-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LocalizedPipe, PricePipe, SafeImagePipe],
  template: `
    <div class="wrap-picker">
      <section class="wrap-picker__section">
        <h2 class="wrap-picker__title">{{ 'giftBuilder.pickWrap' | translate }}</h2>
        <div class="wrap-picker__grid">
          @for (style of wrapStyles(); track style._id) {
            <button
              type="button"
              class="wrap-picker__card"
              [class.is-selected]="selectedWrapId() === style._id"
              (click)="selectWrap.emit(style)"
            >
              <div class="wrap-picker__media">
                @if (style.imageUrl || style.image) {
                  <img
                    [src]="style.imageUrl || style.image | safeImage"
                    [alt]="style.name | localized"
                    class="wrap-picker__image img-fallback"
                  />
                } @else {
                  <div class="wrap-picker__image img-fallback"></div>
                }
              </div>
              <div class="wrap-picker__body">
                <h3 class="wrap-picker__name">{{ style.name | localized }}</h3>
                <p class="wrap-picker__price">+{{ style.price | price }}</p>
              </div>
            </button>
          }
        </div>
      </section>

      @if (ribbons().length > 0) {
        <section class="wrap-picker__section">
          <h2 class="wrap-picker__title">{{ 'giftBuilder.pickRibbon' | translate }}</h2>
          <div class="wrap-picker__ribbons">
            @for (ribbon of ribbons(); track ribbon._id) {
              <button
                type="button"
                class="wrap-picker__ribbon"
                [class.is-selected]="selectedRibbonId() === ribbon._id"
                (click)="selectRibbon.emit(ribbon)"
                [attr.aria-label]="ribbon.name | localized"
              >
                <span
                  class="wrap-picker__ribbon-color"
                  [style.background-color]="ribbon.color"
                ></span>
                <span class="wrap-picker__ribbon-name">{{ ribbon.name | localized }}</span>
                <span class="wrap-picker__ribbon-price">+{{ ribbon.price | price }}</span>
              </button>
            }
          </div>
        </section>
      }

      <section class="wrap-picker__section">
        <h2 class="wrap-picker__title">{{ 'giftBuilder.addNote' | translate }}</h2>
        <textarea
          class="wrap-picker__note"
          rows="4"
          [placeholder]="'giftBuilder.notePlaceholder' | translate"
          [ngModel]="note()"
          (ngModelChange)="noteChange.emit($event)"
        ></textarea>
      </section>
    </div>
  `,
  styles: [
    `
      .wrap-picker {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      .wrap-picker__title {
        font-family: 'Poppins', sans-serif;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text);
        margin: 0 0 1rem;
      }
      .wrap-picker__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 1rem;
      }
      .wrap-picker__card {
        display: flex;
        flex-direction: column;
        padding: 0;
        background-color: var(--surface);
        border: 2px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
        cursor: pointer;
        text-align: start;
        transition: all var(--transition-base);

        &:hover {
          border-color: var(--brand-primary);
          transform: translateY(-4px);
        }
        &.is-selected {
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 4px var(--brand-primary-soft);
        }
      }
      .wrap-picker__media {
        aspect-ratio: 1;
        background-color: var(--bg-muted);
      }
      .wrap-picker__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .wrap-picker__body {
        padding: 0.75rem;
      }
      .wrap-picker__name {
        font-family: 'Poppins', sans-serif;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text);
        margin: 0;
      }
      .wrap-picker__price {
        font-family: 'Poppins', sans-serif;
        font-size: 0.875rem;
        color: var(--brand-primary);
        font-weight: 700;
        margin: 0.25rem 0 0;
      }
      .wrap-picker__ribbons {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.5rem;
      }
      .wrap-picker__ribbon {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.75rem;
        background-color: var(--surface);
        border: 2px solid var(--border);
        border-radius: var(--radius-md);
        cursor: pointer;
        text-align: start;
        transition: all var(--transition-fast);

        &:hover {
          border-color: var(--brand-primary);
        }
        &.is-selected {
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 3px var(--brand-primary-soft);
        }
      }
      .wrap-picker__ribbon-color {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.08);
      }
      .wrap-picker__ribbon-name {
        flex: 1;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--text);
      }
      .wrap-picker__ribbon-price {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--brand-primary);
      }
      .wrap-picker__note {
        width: 100%;
        padding: 0.875rem 1rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.9375rem;
        color: var(--text);
        background-color: var(--surface);
        border: 1.5px solid var(--border-strong);
        border-radius: var(--radius-md);
        resize: vertical;
        outline: none;

        &:focus {
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 3px rgba(var(--brand-primary-rgb), 0.15);
        }
      }
    `,
  ],
})
export class WrapPickerComponent {
  readonly wrapStyles = input<WrapStyle[]>([]);
  readonly ribbons = input<Ribbon[]>([]);
  readonly selectedWrapId = input<string | null>(null);
  readonly selectedRibbonId = input<string | null>(null);
  readonly note = input<string>('');

  readonly selectWrap = output<WrapStyle>();
  readonly selectRibbon = output<Ribbon>();
  readonly noteChange = output<string>();
}
