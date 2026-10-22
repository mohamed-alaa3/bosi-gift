import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { Product, GiftBoxOrderPayload } from '../../../../core/models';
import { GiftBox, Ribbon, WrapStyle } from '../../gift-builder.types';
import { GiftBuilderStore } from '../../gift-builder.store';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';
import { AuthStore } from '../../../../core/stores/auth.store';
import { ToastService } from '../../../../core/services/toast.service';
import { CartService } from '../../../../core/services/cart.service';

const FETCH_TIMEOUT_MS = 10000;

@Component({
  selector: 'app-gift-box-preview',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LocalizedPipe, PricePipe, SafeImagePipe],
  template: `
    <div class="box-preview">
      <header class="box-preview__header">
        <h3 class="box-preview__title">{{ 'giftBuilder.preview' | translate }}</h3>
        @if (box()) {
          <button type="button" class="box-preview__reset" (click)="reset.emit()">
            {{ 'giftBuilder.reset' | translate }}
          </button>
        }
      </header>

      <!-- Canvas -->
      <div class="box-preview__canvas" [class.is-loaded]="!!box()">
        @if (box(); as b) {
          <div class="box-preview__box">
            <div class="box-preview__box-inner">
              <div class="box-preview__contents">
                @for (item of items(); track item._id; let i = $index) {
                  <div
                    class="box-preview__item"
                    [style.--index]="i"
                    [style.--x]="((i * 12) % 40) - 20 + 'px'"
                    [style.--y]="((i * 8) % 30) - 15 + 'px'"
                    [style.--r]="((i * 5) % 30) - 15 + 'deg'"
                  >
                    @if (item.imageUrls?.[0] || item.images?.[0]) {
                      <img
                        [src]="item.imageUrls?.[0] || item.images?.[0] | safeImage"
                        [alt]="item.name | localized"
                        class="img-fallback"
                      />
                    }
                  </div>
                }
              </div>
            </div>

            @if (ribbon(); as r) {
              <div class="box-preview__ribbon" [style.background-color]="r.color"></div>
              <div class="box-preview__bow" [style.background-color]="r.color"></div>
            }
          </div>
        } @else {
          <div class="box-preview__placeholder">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
              />
              <path d="M3.3 7l8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            <p>{{ 'giftBuilder.startToPreview' | translate }}</p>
          </div>
        }
      </div>

      <!-- Progress -->
      @if (box()) {
        <div class="box-preview__progress">
          <div class="box-preview__progress-head">
            <span>{{ 'giftBuilder.itemsInBox' | translate }}</span>
            <strong>{{ itemCount() }} / {{ capacity() }}</strong>
          </div>
          <div class="box-preview__progress-bar">
            <div
              class="box-preview__progress-fill"
              [style.width.%]="capacity() > 0 ? (itemCount() / capacity()) * 100 : 0"
            ></div>
          </div>
        </div>
      }

      <!-- Summary -->
      @if (box()) {
        <div class="box-preview__summary">
          <div class="box-preview__summary-row">
            <span>{{ 'cart.subtotal' | translate }}</span>
            <span>{{ subtotal() | price }}</span>
          </div>
        </div>
      }

      <!-- Add to Cart -->
      @if (box() && itemCount() > 0) {
        <button
          type="button"
          class="box-preview__checkout"
          [disabled]="adding()"
          (click)="addToCart()"
        >
          @if (adding()) {
            <span class="box-preview__spinner" aria-hidden="true"></span>
            {{ 'giftBuilder.adding' | translate }}
          } @else {
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"
              />
            </svg>
            {{ 'giftBuilder.addToCart' | translate }}
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      .box-preview {
        background-color: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-2xl);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.15);
      }
      .box-preview__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      .box-preview__title {
        font-family: 'Poppins', sans-serif;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text);
        margin: 0;
      }
      .box-preview__reset {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--danger);
        background: transparent;
        border: none;
        cursor: pointer;
        text-decoration: underline;
      }
      .box-preview__canvas {
        aspect-ratio: 1;
        border-radius: var(--radius-xl);
        background: radial-gradient(circle at 50% 30%, #fbf7f0 0%, #f2ece1 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        overflow: hidden;
        position: relative;
        border: 1px solid var(--border);
      }
      .box-preview__placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        color: var(--text-subtle);
        text-align: center;
      }
      .box-preview__placeholder p {
        font-size: 0.875rem;
        margin: 0;
        max-width: 20ch;
      }
      .box-preview__box {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: box-pop-in 600ms var(--motion-ease-spring) both;
      }
      .box-preview__box-inner {
        width: 70%;
        aspect-ratio: 1;
        background: linear-gradient(160deg, #e8dcc8 0%, #d4c4a8 100%);
        border-radius: 12px 12px 8px 8px;
        box-shadow:
          inset 0 -8px 0 rgba(0, 0, 0, 0.06),
          inset 0 8px 0 rgba(255, 255, 255, 0.35),
          0 20px 40px -10px rgba(0, 0, 0, 0.25);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .box-preview__contents {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .box-preview__item {
        position: absolute;
        top: calc(50% + var(--y, 0px));
        left: calc(50% + var(--x, 0px));
        width: 40px;
        height: 40px;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        background-color: #fff;
        transform: translate(-50%, -50%) rotate(var(--r, 0deg));
        animation: item-pop 500ms var(--motion-ease-spring) both;
        animation-delay: calc(var(--index) * 60ms);

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      .box-preview__ribbon {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 40%;
        width: 20%;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
      }
      .box-preview__bow {
        position: absolute;
        top: 8%;
        left: 50%;
        transform: translateX(-50%);
        width: 28%;
        height: 20%;
        border-radius: 50% 50% 30% 30% / 60% 60% 40% 40%;
        box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.1);
      }
      .box-preview__progress {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .box-preview__progress-head {
        display: flex;
        justify-content: space-between;
        font-size: 0.8125rem;
        color: var(--text-muted);

        strong {
          color: var(--text);
        }
      }
      .box-preview__progress-bar {
        height: 6px;
        background-color: var(--bg-muted);
        border-radius: 999px;
        overflow: hidden;
      }
      .box-preview__progress-fill {
        height: 100%;
        background: linear-gradient(to right, var(--brand-primary), var(--brand-primary-hover));
        border-radius: 999px;
        transition: width 500ms var(--motion-ease-out);
      }
      .box-preview__summary {
        padding-top: 1rem;
        border-top: 1px solid var(--border);
      }
      .box-preview__summary-row {
        display: flex;
        justify-content: space-between;
        font-family: 'Poppins', sans-serif;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text);

        span:last-child {
          color: var(--brand-primary);
        }
      }
      .box-preview__checkout {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        height: 52px;
        padding-inline: 1.75rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.9375rem;
        font-weight: 700;
        color: #ffffff;
        background-color: var(--brand-primary);
        border: none;
        border-radius: var(--radius-full);
        cursor: pointer;
        transition: all var(--transition-base);
        margin-top: 0.5rem;

        svg {
          transition: transform var(--transition-base);
        }

        &:hover:not(:disabled) {
          background-color: var(--brand-primary-hover);
          box-shadow: 0 8px 24px rgba(var(--brand-primary-rgb), 0.35);

          svg {
            transform: translateX(4px);
          }
        }

        &:active:not(:disabled) {
          transform: translateY(1px);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
      .box-preview__spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      @keyframes box-pop-in {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      @keyframes item-pop {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) rotate(var(--r, 0deg)) scale(0);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) rotate(var(--r, 0deg)) scale(1);
        }
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      [dir='rtl'] .box-preview__checkout svg {
        transform: scaleX(-1);
      }
      [dir='rtl'] .box-preview__checkout:hover:not(:disabled) svg {
        transform: scaleX(-1) translateX(4px);
      }
    `,
  ],
})
export class BoxPreviewComponent {
  private router = inject(Router);
  private authStore = inject(AuthStore);
  private toast = inject(ToastService);
  private cartService = inject(CartService);
  private giftStore = inject(GiftBuilderStore);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  readonly box = input<GiftBox | null>(null);
  readonly items = input<Product[]>([]);
  readonly wrapStyle = input<WrapStyle | null>(null);
  readonly ribbon = input<Ribbon | null>(null);
  readonly subtotal = input<number>(0);
  readonly itemCount = input<number>(0);
  readonly capacity = input<number>(0);

  readonly reset = output<void>();

  protected readonly adding = signal(false);

  protected addToCart(): void {
    // Guard: authentication
    if (!this.authStore.isAuthenticated()) {
      this.toast.info(this.translate.instant('toast.signInToAddToCart'));
      this.router.navigate(['/auth/register'], {
        queryParams: { redirect: '/gifts' },
      });
      return;
    }

    // Guard: at least one item
    if (this.itemCount() === 0) {
      this.toast.error(this.translate.instant('toast.giftBoxNeedsItems'));

      return;
    }

    // Read from store's public computed signals
    const box = this.giftStore.box();
    const giftItems = this.giftStore.items();
    const wrap = this.giftStore.wrapStyle();
    const ribbon = this.giftStore.ribbon();
    const note = this.giftStore.note();

    if (!box) {
      this.toast.error(this.translate.instant('toast.giftBoxNeedsBox'));
      return;
    }

    this.adding.set(true);

    const payload: GiftBoxOrderPayload = {
      boxId: box._id,
      items: giftItems.map((p) => ({
        productId: p._id,
        quantity: 1,
      })),
      wrapStyleId: wrap?._id || null,
      ribbonId: ribbon?._id || null,
      note: note || '',
    };

    this.cartService
      .addGiftBox(payload)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.adding.set(false);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.giftBoxAddedToCart'));
          this.giftStore.reset();
          // CartService.addGiftBox auto-opens the drawer
        }
      });
  }
}
