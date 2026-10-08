import { CommonModule, DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { Order } from '../../../../core/models';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-checkout-order-confirmation',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, TranslatePipe, PricePipe],
  template: `
    <div class="confirmation">
      <div class="confirmation__icon" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <h1 class="confirmation__title">{{ 'checkout.successTitle' | translate }}</h1>
      <p class="confirmation__subtitle">{{ 'checkout.successText' | translate }}</p>

      <div class="confirmation__card">
        <div class="confirmation__row">
          <span>{{ 'checkout.orderNumber' | translate }}</span>
          <strong>{{ order().orderNumber }}</strong>
        </div>
        <div class="confirmation__row">
          <span>{{ 'checkout.orderDate' | translate }}</span>
          <strong>{{ order().createdAt | date: 'medium' }}</strong>
        </div>
        <div class="confirmation__row">
          <span>{{ 'cart.total' | translate }}</span>
          <strong class="confirmation__total">{{ order().total | price }}</strong>
        </div>
        @if (order().amountDueNow > 0) {
          <div class="confirmation__row">
            <span>{{ 'checkout.amountDueNow' | translate }}</span>
            <strong class="confirmation__due">{{ order().amountDueNow | price }}</strong>
          </div>
          <div class="confirmation__row">
            <span>{{ 'checkout.remainingOnDelivery' | translate }}</span>
            <strong>{{ order().remainingAmount | price }}</strong>
          </div>
        }
        <div class="confirmation__row">
          <span>{{ 'checkout.status' | translate }}</span>
          <strong class="confirmation__status">
            {{ 'orderStatus.' + order().status | translate }}
          </strong>
        </div>
      </div>

      @if (whatsappMessage()) {
        <div class="confirmation__whatsapp">
          <p class="confirmation__whatsapp-text">
            {{ 'checkout.whatsappFallback' | translate }}
          </p>
          <a
            class="confirmation__btn confirmation__btn--whatsapp"
            [href]="whatsappLink()"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              />
            </svg>
            {{ 'checkout.sendOnWhatsapp' | translate }}
          </a>
        </div>
      }

      <div class="confirmation__actions">
        <a routerLink="/shop" class="confirmation__btn confirmation__btn--primary">
          {{ 'cart.continueShopping' | translate }}
        </a>
        <a routerLink="/account/orders" class="confirmation__btn confirmation__btn--ghost">
          {{ 'checkout.viewOrders' | translate }}
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .confirmation {
        max-width: 560px;
        margin-inline: auto;
        padding: 3rem 1rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .confirmation__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 88px;
        height: 88px;
        border-radius: 9999px;
        background-color: var(--success-soft);
        color: var(--success);
        margin-bottom: 0.5rem;
      }

      .confirmation__title {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: clamp(1.5rem, 2.5vw + 0.5rem, 2rem);
        font-weight: 700;
        color: var(--text);
        margin: 0;
      }

      .confirmation__subtitle {
        font-size: 1rem;
        color: var(--text-muted);
        margin: 0;
        max-width: 42ch;
        line-height: 1.6;
      }

      .confirmation__card {
        width: 100%;
        padding: 1.25rem;
        background-color: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 1rem;
        text-align: start;
      }

      .confirmation__row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        font-size: 0.9375rem;
        color: var(--text-muted);

        strong {
          color: var(--text);
          font-family: 'Inter', system-ui, sans-serif;
          font-variant-numeric: tabular-nums;
        }
      }

      .confirmation__total {
        color: var(--brand-primary) !important;
        font-family: 'Poppins', system-ui, sans-serif !important;
        font-size: 1.125rem;
      }

      .confirmation__due {
        color: var(--brand-primary) !important;
      }

      .confirmation__status {
        text-transform: capitalize;
      }

      .confirmation__whatsapp {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        background-color: var(--brand-primary-soft);
        border: 1.5px dashed var(--brand-primary);
        border-radius: var(--radius-lg);
        margin-top: 0.5rem;
      }

      .confirmation__whatsapp-text {
        margin: 0;
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--text);
      }

      .confirmation__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: center;
        margin-top: 1.5rem;
      }

      .confirmation__btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        height: 48px;
        padding-inline: 1.75rem;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.9375rem;
        font-weight: 600;
        border-radius: 9999px;
        text-decoration: none;
        transition: all var(--transition-base);
        cursor: pointer;
        border: 1.5px solid transparent;
      }

      .confirmation__btn--primary {
        background-color: var(--brand-primary);
        color: #ffffff;
        border-color: var(--brand-primary);
      }

      .confirmation__btn--primary:hover {
        background-color: var(--brand-primary-hover);
      }

      .confirmation__btn--ghost {
        background: transparent;
        color: var(--text);
        border-color: var(--border-strong);
      }

      .confirmation__btn--ghost:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
      }

      .confirmation__btn--whatsapp {
        background-color: #25d366;
        color: #ffffff;
        border-color: #25d366;
      }

      .confirmation__btn--whatsapp:hover {
        background-color: #1eb556;
        border-color: #1eb556;
      }
    `,
  ],
})
export class CheckoutOrderConfirmationComponent {
  readonly order = input.required<Order>();
  readonly whatsappMessage = input<string>('');
  readonly whatsappNumber = input<string>('201008150149');

  protected whatsappLink(): string {
    const msg = this.whatsappMessage();
    if (!msg) return '';
    return `https://wa.me/${this.whatsappNumber()}?text=${encodeURIComponent(msg)}`;
  }
}
