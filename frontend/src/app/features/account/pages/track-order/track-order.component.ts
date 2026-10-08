import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-account-track-order',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <div class="track-order">
      <header class="track-order__header">
        <h1 class="track-order__title">{{ 'account.trackOrder' | translate }}</h1>
        <p class="track-order__subtitle">{{ 'account.trackOrderDesc' | translate }}</p>
      </header>

      <div class="track-order__card">
        <div class="track-order__icon" aria-hidden="true">
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
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h2 class="track-order__card-title">{{ 'account.trackComingSoon' | translate }}</h2>
        <p class="track-order__card-text">{{ 'account.trackComingSoonText' | translate }}</p>
        <a routerLink="/account/orders" class="track-order__cta">
          {{ 'account.orderHistory' | translate }}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .track-order {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .track-order__header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .track-order__title {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: clamp(1.25rem, 2vw + 0.5rem, 1.75rem);
        font-weight: 700;
        color: var(--text);
        margin: 0;
      }

      .track-order__subtitle {
        font-size: 0.9375rem;
        color: var(--text-muted);
        margin: 0;
      }

      .track-order__card {
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

      .track-order__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 72px;
        height: 72px;
        border-radius: var(--radius-full);
        background-color: var(--brand-primary-soft);
        color: var(--brand-primary);
        margin-bottom: 0.25rem;
      }

      .track-order__card-title {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text);
        margin: 0;
      }

      .track-order__card-text {
        font-size: 0.9375rem;
        color: var(--text-muted);
        margin: 0;
        max-width: 42ch;
        line-height: 1.5;
      }

      .track-order__cta {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding: 0.75rem 1.5rem;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.9375rem;
        font-weight: 600;
        color: #ffffff;
        background-color: var(--brand-primary);
        border-radius: var(--radius-full);
        text-decoration: none;
        transition: background-color var(--transition-base);

        svg {
          transition: transform var(--transition-base);
        }

        &:hover {
          background-color: var(--brand-primary-hover);
          svg {
            transform: translateX(4px);
          }
        }
      }

      [dir='rtl'] .track-order__cta svg {
        transform: scaleX(-1);
      }

      [dir='rtl'] .track-order__cta:hover svg {
        transform: scaleX(-1) translateX(4px);
      }
    `,
  ],
})
export class AccountTrackOrderComponent {}
