import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import {
  BUDGET_RANGES,
  BudgetRange,
  OCCASIONS,
  RECIPIENTS,
} from '../../../../core/constants/gift-taxonomy';
import { GiftIconComponent } from '../../../../shared/components/gift-icon/gift-icon.component';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

/**
 * Lightweight gift finder: who → occasion → (optional) budget, then it
 * navigates to the real Shop with those filters in the URL. No separate
 * search system — it reuses the Shop's query-param filtering.
 */
@Component({
  selector: 'app-gift-finder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, GiftIconComponent, RevealOnScrollDirective],
  template: `
    <section class="finder gd" aria-labelledby="finder-title">
      <div class="finder__card" appRevealOnScroll>
        <app-gift-icon name="sparkle" class="finder__deco finder__deco--1 gift-twinkle" />
        <app-gift-icon name="gift" class="finder__deco finder__deco--2 gift-float" />
        <app-gift-icon name="heart" class="finder__deco finder__deco--3 gift-float" />

        <header class="gd-head finder__head">
          <p class="gd-eyebrow">{{ 'home.finder.eyebrow' | translate }}</p>
          <h2 id="finder-title" class="gd-title">{{ 'home.finder.title' | translate }}</h2>
          <p class="gd-sub">{{ 'home.finder.subtitle' | translate }}</p>
        </header>

        <div class="finder__steps">
          <div class="finder__step" role="group" aria-labelledby="finder-q1">
            <h3 id="finder-q1" class="finder__q"><span>1</span>{{ 'home.finder.q1' | translate }}</h3>
            <div class="finder__opts">
              @for (r of recipients; track r.slug) {
                <button type="button" class="gd-chip" [class.is-active]="recipient() === r.slug" [attr.aria-pressed]="recipient() === r.slug" (click)="pickRecipient(r.slug)">
                  <span aria-hidden="true">{{ r.emoji }}</span> {{ r.labelKey | translate }}
                </button>
              }
            </div>
          </div>

          <div class="finder__step" role="group" aria-labelledby="finder-q2">
            <h3 id="finder-q2" class="finder__q"><span>2</span>{{ 'home.finder.q2' | translate }}</h3>
            <div class="finder__opts">
              @for (o of occasions; track o.slug) {
                <button type="button" class="gd-chip" [class.is-active]="occasion() === o.slug" [attr.aria-pressed]="occasion() === o.slug" (click)="pickOccasion(o.slug)">
                  <span aria-hidden="true">{{ o.emoji }}</span> {{ o.labelKey | translate }}
                </button>
              }
            </div>
          </div>

          <div class="finder__step" role="group" aria-labelledby="finder-q3">
            <h3 id="finder-q3" class="finder__q"><span>3</span>{{ 'home.finder.q3' | translate }}</h3>
            <div class="finder__opts">
              @for (b of budgets; track b.id) {
                <button type="button" class="gd-chip" [class.is-active]="budget()?.id === b.id" [attr.aria-pressed]="budget()?.id === b.id" (click)="pickBudget(b)">
                  {{ b.labelKey | translate }}
                </button>
              }
            </div>
          </div>
        </div>

        <div class="finder__actions">
          <button type="button" class="gd-btn" (click)="go()">
            {{ 'home.finder.cta' | translate }}
            <span aria-hidden="true">🎁</span>
          </button>
          @if (hasChoice()) {
            <button type="button" class="finder__reset" (click)="reset()">{{ 'home.finder.reset' | translate }}</button>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }

    .finder__card {
      position: relative;
      overflow: hidden;
      padding: 2rem 1.25rem 2.25rem;
      border-radius: 36px;
      border-end-start-radius: 12px;
      background:
        radial-gradient(circle at 90% 10%, rgba(247, 161, 176, 0.35), transparent 45%),
        radial-gradient(circle at 5% 95%, rgba(31, 106, 106, 0.12), transparent 45%),
        linear-gradient(145deg, var(--brand-primary-soft), var(--surface));
      border: 2px dashed var(--border-strong);
      box-shadow: var(--shadow-md);
    }

    @media (min-width: 768px) { .finder__card { padding: 3rem 3rem 3rem; } }

    .finder__head { position: relative; z-index: 1; }

    .finder__steps { position: relative; z-index: 1; display: grid; gap: 1.5rem; max-width: 920px; margin-inline: auto; }

    .finder__q {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin: 0 0 0.75rem;
      font-family: var(--font-display);
      font-weight: 400;
      font-size: 1.3rem;
    }

    .finder__q span {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      font-family: inherit;
      font-size: 1rem;
      color: #fff;
      background: var(--brand-primary);
    }

    .finder__opts { display: flex; flex-wrap: wrap; gap: 0.6rem; }

    .finder__actions {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      margin-top: 2rem;
    }

    .finder__reset {
      border: 0;
      background: none;
      color: var(--text-muted);
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
    }
    .finder__reset:focus-visible { outline: 3px solid var(--brand-secondary); outline-offset: 2px; border-radius: 4px; }

    .finder__deco { position: absolute; width: 38px; height: 38px; opacity: 0.55; pointer-events: none; }
    .finder__deco--1 { top: 1.2rem; inset-inline-start: 1.2rem; }
    .finder__deco--2 { bottom: 1.2rem; inset-inline-end: 1.5rem; width: 54px; height: 54px; }
    .finder__deco--3 { top: 1.5rem; inset-inline-end: 3.5rem; width: 26px; height: 26px; }
  `,
})
export class GiftFinderComponent {
  private router = inject(Router);

  protected readonly recipients = RECIPIENTS;
  protected readonly occasions = OCCASIONS;
  protected readonly budgets = BUDGET_RANGES;

  protected readonly recipient = signal<string | null>(null);
  protected readonly occasion = signal<string | null>(null);
  protected readonly budget = signal<BudgetRange | null>(null);

  protected readonly hasChoice = computed(
    () => !!(this.recipient() || this.occasion() || this.budget()),
  );

  // Selecting the active chip again clears it.
  protected pickRecipient(slug: string): void {
    this.recipient.update((c) => (c === slug ? null : slug));
  }
  protected pickOccasion(slug: string): void {
    this.occasion.update((c) => (c === slug ? null : slug));
  }
  protected pickBudget(b: BudgetRange): void {
    this.budget.update((c) => (c?.id === b.id ? null : b));
  }
  protected reset(): void {
    this.recipient.set(null);
    this.occasion.set(null);
    this.budget.set(null);
  }

  protected go(): void {
    const b = this.budget();
    this.router.navigate(['/shop'], {
      queryParams: {
        recipient: this.recipient() ?? undefined,
        occasion: this.occasion() ?? undefined,
        minPrice: b?.min,
        maxPrice: b?.max,
      },
    });
  }
}
