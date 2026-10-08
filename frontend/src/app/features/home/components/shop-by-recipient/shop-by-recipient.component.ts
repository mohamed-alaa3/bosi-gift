import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { RECIPIENTS } from '../../../../core/constants/gift-taxonomy';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

/**
 * "Who are you gifting?" — each card opens the real Shop with
 * ?recipient=<slug> (served by the existing /products filter).
 */
@Component({
  selector: 'app-shop-by-recipient',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, RevealOnScrollDirective],
  template: `
    <section class="rcp gd" aria-labelledby="rcp-title">
      <header class="gd-head" appRevealOnScroll>
        <p class="gd-eyebrow">{{ 'home.recipient.eyebrow' | translate }}</p>
        <h2 id="rcp-title" class="gd-title">{{ 'home.recipient.title' | translate }}</h2>
        <p class="gd-sub">{{ 'home.recipient.subtitle' | translate }}</p>
      </header>

      <div class="rcp__grid" appRevealOnScroll [stagger]="true" [delay]="80">
        @for (r of recipients; track r.slug; let i = $index) {
          <a
            class="rcp__card"
            [attr.data-tone]="i"
            routerLink="/shop"
            [queryParams]="{ recipient: r.slug }"
          >
            <span class="rcp__ribbon" aria-hidden="true"></span>
            <span class="rcp__art" aria-hidden="true">
              <span class="rcp__emoji">{{ r.emoji }}</span>
            </span>
            <span class="rcp__text">
              <span class="rcp__label">{{ r.labelKey | translate }}</span>
              <span class="rcp__hint">{{ 'home.recipient.hint.' + r.slug | translate }}</span>
              <span class="rcp__cta">{{ 'home.recipient.cta' | translate }}
                <svg class="icon-directional" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </span>
          </a>
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }

    .rcp__grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    @media (min-width: 768px) {
      .rcp__grid { grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    }

    .rcp__card {
      --tone-a: var(--brand-primary-soft);
      --tone-b: color-mix(in srgb, var(--brand-pink) 35%, var(--surface));
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.25rem 1.25rem 1.25rem;
      overflow: hidden;
      text-decoration: none;
      color: var(--text);
      background: linear-gradient(145deg, var(--tone-a), var(--tone-b));
      border: 1px solid var(--border);
      border-radius: 28px;
      border-end-start-radius: 10px;
      box-shadow: 0 6px 18px rgba(var(--brand-primary-rgb), 0.08);
      transition: transform var(--transition-base), box-shadow var(--transition-base);
    }

    .rcp__card[data-tone='1'] {
      --tone-a: color-mix(in srgb, var(--brand-pink) 22%, var(--surface));
      --tone-b: color-mix(in srgb, var(--brand-coral) 30%, var(--surface));
    }
    .rcp__card[data-tone='2'] {
      --tone-a: var(--brand-secondary-soft);
      --tone-b: color-mix(in srgb, var(--brand-secondary) 18%, var(--surface));
    }

    .rcp__card:hover {
      transform: translateY(-6px);
      box-shadow: 0 18px 34px rgba(var(--brand-primary-rgb), 0.18);
    }
    .rcp__card:focus-visible { outline: 3px solid var(--brand-secondary); outline-offset: 3px; }

    /* gift ribbon across the top corner */
    .rcp__ribbon {
      position: absolute;
      top: 0;
      inset-inline-end: 1.4rem;
      width: 16px;
      height: 44px;
      background: var(--brand-primary);
      clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
      opacity: 0.9;
    }

    .rcp__art {
      flex: none;
      display: grid;
      place-items: center;
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: var(--surface);
      box-shadow: inset 0 0 0 4px rgba(var(--brand-primary-rgb), 0.08), var(--shadow-sm);
      transition: transform var(--motion-duration-slow) var(--motion-ease-spring);
    }
    .rcp__card:hover .rcp__art { transform: scale(1.08) rotate(-6deg); }
    .rcp__emoji { font-size: 2.6rem; line-height: 1; }

    .rcp__text { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }

    .rcp__label {
      font-family: var(--font-display);
      font-size: 1.55rem;
      line-height: 1.2;
    }

    .rcp__hint { font-size: 0.875rem; color: var(--text-muted); }

    .rcp__cta {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.4rem;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--brand-primary);
    }

    @media (min-width: 768px) {
      .rcp__card { flex-direction: column; text-align: center; padding: 2rem 1.25rem 1.75rem; gap: 1.1rem; }
      .rcp__text { align-items: center; }
      .rcp__art { width: 112px; height: 112px; }
      .rcp__emoji { font-size: 3.6rem; }
      .rcp__label { font-size: 1.9rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .rcp__card, .rcp__art { transition: none; }
      .rcp__card:hover, .rcp__card:hover .rcp__art { transform: none; }
    }
  `,
})
export class ShopByRecipientComponent {
  protected readonly recipients = RECIPIENTS;
}
