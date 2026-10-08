import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-account-payment-methods',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="payment-methods">
      <header class="payment-methods__header">
        <h1 class="payment-methods__title">{{ 'account.paymentMethods' | translate }}</h1>
        <p class="payment-methods__subtitle">{{ 'account.paymentMethodsDesc' | translate }}</p>
      </header>

      <div class="payment-methods__card">
        <div class="payment-methods__icon" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </div>

        <span class="payment-methods__badge">{{ 'common.comingSoon' | translate }}</span>

        <h2 class="payment-methods__card-title">{{ 'account.paymentComingSoon' | translate }}</h2>
        <p class="payment-methods__card-text">{{ 'account.paymentComingSoonText' | translate }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .payment-methods {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .payment-methods__header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .payment-methods__title {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: clamp(1.25rem, 2vw + 0.5rem, 1.75rem);
        font-weight: 700;
        color: var(--text);
        margin: 0;
      }

      .payment-methods__subtitle {
        font-size: 0.9375rem;
        color: var(--text-muted);
        margin: 0;
      }

      .payment-methods__card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.75rem;
        padding: 3rem 1.5rem;
        background-color: var(--surface);
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-xl);
        max-width: 520px;
        margin-inline: auto;
      }

      .payment-methods__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 72px;
        height: 72px;
        border-radius: 9999px;
        background-color: var(--brand-primary-soft);
        color: var(--brand-primary);
        margin-bottom: 0.25rem;
      }

      .payment-methods__badge {
        display: inline-flex;
        padding: 0.25rem 0.75rem;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--brand-primary);
        background-color: var(--brand-primary-soft);
        border-radius: 9999px;
      }

      .payment-methods__card-title {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text);
        margin: 0;
      }

      .payment-methods__card-text {
        font-size: 0.9375rem;
        color: var(--text-muted);
        margin: 0;
        max-width: 42ch;
        line-height: 1.5;
      }
    `,
  ],
})
export class AccountPaymentMethodsComponent {}
