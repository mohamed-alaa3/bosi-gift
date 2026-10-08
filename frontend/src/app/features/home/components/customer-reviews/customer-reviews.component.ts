import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, of, timeout } from 'rxjs';

import { FeaturedReview } from '../../../../core/models';
import { ReviewService } from '../../../../core/services/review.service';
import { RatingStarsComponent } from '../../../../shared/components/rating-stars/rating-stars.component';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

type LoadState = 'loading' | 'ready' | 'hidden';

const FETCH_TIMEOUT_MS = 8000;
const ROTATIONS = ['-2.2deg', '1.6deg', '-1deg', '2.2deg', '-1.8deg', '1.2deg'];
const TAPES = ['', 'gd-tape--teal', 'gd-tape--sun'];

/**
 * Real customer reviews as scrapbook notes. Data comes from the existing
 * review system (GET /api/reviews/featured). No reviews → a friendly empty
 * state (never fake testimonials). Request failure → section is hidden.
 */
@Component({
  selector: 'app-customer-reviews',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, LocalizedPipe, SafeImagePipe, RatingStarsComponent, RevealOnScrollDirective],
  template: `
    @if (state() === 'ready') {
      <section class="rv gd-band" aria-labelledby="rv-title">
        <span class="rv__deco rv__deco--a" aria-hidden="true">💕</span>
        <span class="rv__deco rv__deco--b" aria-hidden="true">✨</span>

        <div class="gd">
          <header class="gd-head" appRevealOnScroll>
            <p class="gd-eyebrow">{{ 'home.reviews.eyebrow' | translate }}</p>
            <h2 id="rv-title" class="gd-title">{{ 'home.reviews.title' | translate }}</h2>
            <p class="gd-sub">{{ 'home.reviews.subtitle' | translate }}</p>
          </header>

          @if (reviews().length > 0) {
            <ul class="rv__grid" appRevealOnScroll [stagger]="true" [delay]="80">
              @for (r of reviews(); track r._id; let i = $index) {
                <li class="rv__note" [style.--rot]="rot(i)">
                  <span class="gd-tape" [class]="tape(i)" aria-hidden="true"></span>

                  <app-rating-stars size="sm" [value]="r.rating" />
                  <blockquote class="rv__text">{{ clean(r.comment) }}</blockquote>

                  <footer class="rv__foot">
                    @if (r.type === 'service' || !r.product) {
                      <span class="rv__service">🎁 {{ 'home.reviews.aboutService' | translate }}</span>
                    } @else {
                      <a class="rv__product" [routerLink]="['/products', r.product.slug]">
                        @if (r.product.imageUrl) {
                          <img [src]="r.product.imageUrl | safeImage" alt="" class="rv__thumb img-fallback" loading="lazy" decoding="async" />
                        }
                        <span class="rv__product-name">{{ 'home.reviews.aboutProduct' | translate }} {{ r.product.name | localized }}</span>
                      </a>
                    }
                    <div class="rv__who">
                      @if (r.userName) {
                        <span class="rv__by">{{ r.userName }} <span aria-hidden="true">💕</span></span>
                      }
                      @if (r.isVerifiedPurchase) {
                        <span class="verified-badge">✓ {{ 'reviews.verified' | translate }}</span>
                      }
                    </div>
                  </footer>
                </li>
              }
            </ul>
          } @else {
            <div class="rv__empty" appRevealOnScroll>
              <span class="gd-tape" aria-hidden="true"></span>
              <span class="rv__empty-emoji" aria-hidden="true">💌</span>
              <h3 class="rv__empty-title">{{ 'home.reviews.emptyTitle' | translate }}</h3>
              <p class="rv__empty-text">{{ 'home.reviews.emptyText' | translate }}</p>
              <a class="gd-btn" routerLink="/shop">{{ 'home.reviews.emptyCta' | translate }}</a>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    :host { display: block; }

    .rv {
      position: relative;
      background:
        radial-gradient(circle at 8% 12%, rgba(247, 161, 176, 0.28), transparent 38%),
        linear-gradient(180deg, var(--bg), var(--bg-muted));
    }

    .rv__deco { position: absolute; font-size: 2.4rem; opacity: 0.2; pointer-events: none; user-select: none; }
    .rv__deco--a { top: 2rem; inset-inline-start: 2rem; transform: rotate(-12deg); }
    .rv__deco--b { bottom: 2.5rem; inset-inline-end: 2.5rem; }

    .rv__grid {
      list-style: none;
      margin: 0;
      padding: 0.5rem 0 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem 1.75rem;
    }
    @media (min-width: 700px) { .rv__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (min-width: 1100px) { .rv__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

    /* paper note (cream stays light in dark theme on purpose) */
    .rv__note {
      --rot: 0deg;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1.6rem 1.35rem 1.2rem;
      color: #1f3f40;
      background:
        repeating-linear-gradient(transparent 0 27px, rgba(31, 106, 106, 0.08) 27px 28px),
        #fffdf7;
      border-radius: 6px;
      box-shadow: 0 10px 24px rgba(31, 63, 64, 0.13), 0 2px 4px rgba(31, 63, 64, 0.08);
      transform: rotate(var(--rot));
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .rv__note:hover { transform: rotate(0) translateY(-6px); box-shadow: 0 18px 32px rgba(31, 63, 64, 0.2); }

    .rv__text {
      margin: 0;
      flex: 1;
      font-size: 1.02rem;
      line-height: 1.75;
      display: -webkit-box;
      -webkit-line-clamp: 6;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .rv__foot { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(202, 69, 98, 0.35); }

    .rv__product {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      color: var(--brand-secondary);
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
    }
    .rv__product:hover .rv__product-name { text-decoration: underline; }
    .rv__product:focus-visible { outline: 3px solid var(--brand-secondary); outline-offset: 3px; border-radius: 6px; }
    .rv__thumb { width: 34px; height: 34px; flex: none; object-fit: cover; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18); }
    .rv__product-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rv__service { color: var(--brand-secondary); font-size: 0.85rem; font-weight: 700; }
    .rv__who { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .rv__by { font-family: var(--font-display); font-size: 1.15rem; color: var(--brand-primary); }

    /* empty state */
    .rv__empty {
      position: relative;
      max-width: 520px;
      margin-inline: auto;
      padding: 2.25rem 1.5rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      text-align: center;
      color: #1f3f40;
      background: #fffdf7;
      border-radius: 6px;
      box-shadow: 0 12px 28px rgba(31, 63, 64, 0.14);
      transform: rotate(-1deg);
    }
    .rv__empty-emoji { font-size: 3rem; line-height: 1; }
    .rv__empty-title { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.6rem; color: #1f3f40; }
    .rv__empty-text { margin: 0 0 0.75rem; color: #3e5e5f; }

    @media (prefers-reduced-motion: reduce) {
      .rv__note { transition: none; }
      .rv__note:hover { transform: rotate(var(--rot)); }
    }
  `,
})
export class CustomerReviewsComponent implements OnInit {
  private reviewService = inject(ReviewService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly reviews = signal<FeaturedReview[]>([]);

  ngOnInit(): void {
    this.reviewService
      .listFeatured(6)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res?.success) {
          this.state.set('hidden');
          return;
        }
        this.reviews.set(res.data ?? []);
        this.state.set('ready');
      });
  }

  protected rot(i: number): string {
    return ROTATIONS[i % ROTATIONS.length];
  }

  protected tape(i: number): string {
    return TAPES[i % TAPES.length];
  }

  /** The API HTML-escapes stored text; interpolation is already XSS-safe, so show real characters. */
  protected clean(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&amp;/g, '&');
  }
}
