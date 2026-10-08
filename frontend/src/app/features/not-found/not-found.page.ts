import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { GiftIconComponent } from '../../shared/components/gift-icon/gift-icon.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, RevealOnScrollDirective, GiftIconComponent],
  template: `
    <main class="not-found-page" appRevealOnScroll [stagger]="true">
      <div class="art" aria-hidden="true">
        <app-gift-icon name="sparkle" class="deco deco--1 gift-twinkle" />
        <app-gift-icon name="heart" class="deco deco--2 gift-float" />
        <app-gift-icon name="teddy" class="bear gift-float" />
      </div>
      <p class="code">404</p>
      <h1 class="title">{{ 'notFoundPage.title' | translate }}</h1>
      <p class="subtitle">{{ 'notFoundPage.subtitle' | translate }}</p>
      <a routerLink="/" class="home-link">{{ 'notFoundPage.backHome' | translate }}</a>
    </main>
  `,
  styles: [
    `
      .not-found-page {
        min-height: 70vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 0.75rem;
        padding: 3rem 1.5rem;
        background: radial-gradient(circle at 50% 30%, var(--brand-primary-soft), transparent 60%);
      }

      .art {
        position: relative;
        display: grid;
        place-items: center;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background-color: var(--surface);
        border: 2px dashed var(--brand-pink);
        box-shadow: var(--shadow-md);
      }

      .bear {
        width: 88px;
        height: 88px;
      }

      .deco {
        position: absolute;
      }

      .deco--1 {
        width: 26px;
        height: 26px;
        top: -6px;
        inset-inline-end: 4px;
      }

      .deco--2 {
        width: 24px;
        height: 24px;
        bottom: 6px;
        inset-inline-start: -8px;
      }

      .code {
        margin: 0.5rem 0 0;
        font-size: clamp(4rem, 12vw, 7rem);
        font-family: 'Poppins', sans-serif;
        font-weight: 800;
        color: var(--brand-primary);
        line-height: 1;
      }

      .title {
        margin: 0;
      }

      .subtitle {
        margin: 0;
        max-width: 42ch;
        color: var(--text-muted);
      }

      .home-link {
        display: inline-flex;
        align-items: center;
        margin-top: 0.75rem;
        padding: 0.75rem 1.75rem;
        border-radius: 9999px;
        background-color: var(--brand-primary);
        color: #fff;
        font-weight: 600;
        text-decoration: none;
        box-shadow: 0 6px 16px rgba(var(--brand-primary-rgb), 0.3);
        transition: transform var(--transition-base), background-color var(--transition-base);
      }

      .home-link:hover {
        background-color: var(--brand-primary-hover);
        transform: translateY(-2px);
      }

      .home-link:active {
        transform: translateY(1px) scale(0.98);
      }

      .home-link:focus-visible {
        outline: 2px solid var(--brand-primary);
        outline-offset: 3px;
      }

      @media (prefers-reduced-motion: reduce) {
        .home-link {
          transition: none;
        }
      }
    `,
  ],
})
export class NotFoundPage {}