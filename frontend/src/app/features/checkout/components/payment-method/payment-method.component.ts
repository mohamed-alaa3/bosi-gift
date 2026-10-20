import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { PaymentMethod } from '../../../../core/models';

export interface PaymentOption {
  value: PaymentMethod;
  /** i18n key under `checkout.*` */
  titleKey: string;
  /** i18n key under `checkout.*` */
  descKey: string;
  /** Badge i18n key, optional */
  badgeKey?: string;
  /** Whether the option is currently offered (depends on Settings) */
  available: boolean;
  /** Optional explanation shown while the option is unavailable (i18n key) */
  unavailableNoteKey?: string;
  unavailableNoteParams?: Record<string, unknown>;
}

@Component({
  selector: 'app-checkout-payment-method',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <section class="payment-method">
      <h2 class="payment-method__title">
        {{ 'checkout.paymentMethod' | translate }}
      </h2>

      <div class="payment-method__options" role="radiogroup">
        @for (option of options(); track option.value) {
          <label
            class="payment-method__option"
            [class.is-selected]="value() === option.value"
            [class.is-disabled]="!option.available"
          >
            <input
              type="radio"
              name="paymentMethod"
              [value]="option.value"
              [checked]="value() === option.value"
              [disabled]="!option.available"
              (change)="choose(option)"
            />

            <div class="payment-method__info">
              <div class="payment-method__head">
                <span class="payment-method__option-title">
                  {{ option.titleKey | translate }}
                </span>
                @if (option.badgeKey) {
                  <span class="payment-method__badge">
                    {{ option.badgeKey | translate }}
                  </span>
                }
              </div>
              <span class="payment-method__desc">
                {{ option.descKey | translate }}
              </span>
              @if (!option.available && option.unavailableNoteKey) {
                <span class="payment-method__desc payment-method__desc--note" role="note">
                  {{ option.unavailableNoteKey | translate: option.unavailableNoteParams }}
                </span>
              }
            </div>

            <span class="payment-method__radio" aria-hidden="true"></span>
          </label>
        }
      </div>

      @if (!hasAnyOnlineMethod()) {
        <p class="payment-method__note" role="alert">
          {{ 'checkout.paymentNoMethods' | translate }}
        </p>
      }
    </section>
  `,
  styles: [
    `
      .payment-method {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .payment-method__title {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: 1rem;
        font-weight: 700;
        color: var(--text);
        margin: 0;
      }

      .payment-method__options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .payment-method__option {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 1rem 1.25rem;
        background-color: var(--surface);
        border: 1.5px solid var(--border-strong);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition:
          border-color var(--transition-fast),
          background-color var(--transition-fast),
          box-shadow var(--transition-fast);

        &:hover:not(.is-disabled) {
          border-color: var(--brand-primary);
        }

        &.is-selected {
          border-color: var(--brand-primary);
          background-color: var(--brand-primary-soft);
          box-shadow: 0 0 0 3px rgba(var(--brand-primary-rgb), 0.12);
        }

        &.is-disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background-color: var(--bg-muted);
        }

        input[type='radio'] {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }
      }

      .payment-method__radio {
        display: inline-flex;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid var(--border-strong);
        background-color: var(--surface);
        flex-shrink: 0;
        position: relative;
        transition: border-color var(--transition-fast);
      }

      .payment-method__option.is-selected .payment-method__radio {
        border-color: var(--brand-primary);

        &::after {
          content: '';
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background-color: var(--brand-primary);
        }
      }

      .payment-method__info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .payment-method__head {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .payment-method__option-title {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text);
      }

      .payment-method__badge {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 0.125rem 0.5rem;
        color: #ffffff;
        background-color: var(--success, #10b981);
        border-radius: var(--radius-full);
      }

      .payment-method__desc {
        font-size: 0.8125rem;
        line-height: 1.5;
        color: var(--text-muted);
      }

      .payment-method__desc--note {
        color: var(--danger);
        font-weight: 600;
      }

      .payment-method__note {
        margin: 0;
        padding: 0.75rem 0.875rem;
        font-size: 0.8125rem;
        line-height: 1.5;
        color: var(--danger);
        background-color: var(--danger-soft);
        border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
        border-radius: var(--radius-sm);
      }
    `,
  ],
})
export class CheckoutPaymentMethodComponent {
  readonly value = input<PaymentMethod | ''>('');
  readonly options = input<PaymentOption[]>([]);

  readonly valueChange = output<PaymentMethod>();

  protected readonly hasAnyOnlineMethod = computed(() =>
    this.options().some((o) => (o.value === 'deposit' || o.value === 'full') && o.available),
  );

  protected choose(option: PaymentOption): void {
    if (!option.available) return;
    if (this.value() === option.value) return;
    this.valueChange.emit(option.value);
  }
}
