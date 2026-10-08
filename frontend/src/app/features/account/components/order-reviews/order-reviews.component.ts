import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable, catchError, of, timeout } from 'rxjs';

import { ApiSuccessResponse, ObjectId, OrderReviewState, OwnReview } from '../../../../core/models';
import { ReviewService } from '../../../../core/services/review.service';
import { ToastService } from '../../../../core/services/toast.service';
import { decodeEntities } from '../../../../core/utils/html-entities';
import { RatingStarsComponent } from '../../../../shared/components/rating-stars/rating-stars.component';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';
import { ReviewFormComponent, ReviewFormValue } from './review-form.component';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type Panel = 'products' | 'service' | null;

const FETCH_TIMEOUT_MS = 10000;

/**
 * Order Details → feedback. Review forms are only offered once the order is
 * DELIVERED (the backend enforces this too). Everything is optional.
 */
@Component({
  selector: 'app-order-reviews',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, LocalizedPipe, SafeImagePipe, RatingStarsComponent, ReviewFormComponent],
  template: `
    @if (orderStatus() === 'delivered') {
      <section class="or" aria-labelledby="or-title">
        <span class="or__deco" aria-hidden="true">🎁</span>
        <header class="or__head">
          <h2 id="or-title" class="or__title">{{ 'reviews.cta.title' | translate }}</h2>
          <p class="or__text">{{ 'reviews.cta.text' | translate }}</p>
        </header>

        @if (state() === 'error') {
          <p class="or__msg" role="alert">{{ 'reviews.loadError' | translate }}</p>
        } @else {
          <div class="or__tabs" role="group" [attr.aria-label]="'reviews.cta.title' | translate">
            <button type="button" class="or__tab" [class.is-active]="panel() === 'products'" [attr.aria-expanded]="panel() === 'products'" (click)="toggle('products')">
              ⭐ {{ 'reviews.cta.products' | translate }}
            </button>
            <button type="button" class="or__tab" [class.is-active]="panel() === 'service'" [attr.aria-expanded]="panel() === 'service'" (click)="toggle('service')">
              💕 {{ 'reviews.cta.service' | translate }}
            </button>
          </div>
          <p class="or__optional">{{ 'reviews.cta.optional' | translate }}</p>
        }

        @if (state() === 'loading') {
          <p class="or__msg">{{ 'reviews.loading' | translate }}</p>
        }

        @if (data(); as d) {
          @if (panel() === 'products') {
            <ul class="or__list">
              @for (row of d.products; track row.product._id) {
                <li class="or__item">
                  <div class="or__item-head">
                    @if (row.product.imageUrl) {
                      <img class="or__thumb img-fallback" [src]="row.product.imageUrl | safeImage" alt="" loading="lazy" />
                    }
                    <div class="or__item-info">
                      <p class="or__item-name">{{ row.product.name | localized }}</p>
                      @if (row.review; as r) {
                        <p class="or__done">✓ {{ 'reviews.reviewed' | translate }}</p>
                        <app-rating-stars size="sm" [value]="r.rating" />
                        <span class="or__status" [attr.data-status]="r.status">{{ 'reviews.status.' + r.status | translate }}</span>
                      }
                    </div>
                    @if (editing() !== row.product._id) {
                      <button type="button" class="or__btn" (click)="open(row.product._id)">
                        {{ (row.review ? 'reviews.edit' : 'reviews.rate') | translate }}
                      </button>
                    }
                  </div>
                  @if (row.review && editing() !== row.product._id && row.review.comment) {
                    <p class="or__quote">{{ clean(row.review.comment) }}</p>
                  }
                  @if (editing() === row.product._id) {
                    <app-review-form
                      kind="product"
                      [existing]="row.review"
                      [busy]="busy()"
                      [error]="formError()"
                      (submitted)="saveProduct(row.product._id, row.review, $event)"
                      (cancelled)="close()"
                    />
                  }
                </li>
              }
              @if (d.products.length === 0) {
                <li class="or__msg">{{ 'reviews.noProducts' | translate }}</li>
              }
            </ul>
          }

          @if (panel() === 'service') {
            <div class="or__service">
              <h3 class="or__subtitle">{{ 'reviews.serviceTitle' | translate }}</h3>
              @if (d.service && editing() !== 'service') {
                <p class="or__done">✓ {{ 'reviews.serviceReviewed' | translate }}</p>
                <app-rating-stars size="sm" [value]="d.service.rating" />
                <span class="or__status" [attr.data-status]="d.service.status">{{ 'reviews.status.' + d.service.status | translate }}</span>
                @if (d.service.comment) { <p class="or__quote">{{ clean(d.service.comment) }}</p> }
                <button type="button" class="or__btn" (click)="open('service')">{{ 'reviews.edit' | translate }}</button>
              } @else {
                <app-review-form
                  kind="service"
                  [existing]="d.service"
                  [busy]="busy()"
                  [error]="formError()"
                  (submitted)="saveService(d.service, $event)"
                  (cancelled)="close()"
                />
              }
            </div>
          }
        }
      </section>
    } @else if (orderStatus() && orderStatus() !== 'cancelled') {
      <p class="or-later">{{ 'reviews.afterDelivery' | translate }}</p>
    }
  `,
  styles: `
    :host { display: block; }

    .or {
      position: relative; overflow: hidden; display: grid; gap: 0.9rem;
      padding: 1.5rem 1.25rem; border-radius: 28px; border-end-start-radius: 10px;
      background: radial-gradient(circle at 92% 8%, rgba(247, 161, 176, 0.3), transparent 45%),
        linear-gradient(145deg, var(--brand-primary-soft), var(--surface));
      border: 2px dashed var(--border-strong);
      box-shadow: var(--shadow-md);
    }
    .or__deco { position: absolute; top: 0.8rem; inset-inline-end: 1rem; font-size: 2rem; opacity: 0.35; pointer-events: none; }
    .or__head { display: grid; gap: 0.25rem; padding-inline-end: 2.5rem; }
    .or__title { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.7rem; line-height: 1.2; }
    .or__text { margin: 0; color: var(--text-muted); }

    .or__tabs { display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .or__tab {
      padding: 0.65rem 1.25rem; border-radius: var(--radius-full); cursor: pointer;
      font: inherit; font-weight: 700; color: var(--brand-primary);
      background: var(--surface); border: 2px solid var(--brand-primary);
    }
    .or__tab.is-active, .or__tab:hover { color: #fff; background: var(--brand-primary); }
    .or__tab:focus-visible, .or__btn:focus-visible { outline: 3px solid var(--brand-secondary); outline-offset: 2px; }
    .or__optional { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
    .or__msg { margin: 0; color: var(--text-muted); }

    .or__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
    .or__item { display: grid; gap: 0.75rem; padding: 0.9rem; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); }
    .or__item-head { display: flex; align-items: center; gap: 0.75rem; }
    .or__thumb { width: 56px; height: 56px; flex: none; object-fit: cover; border-radius: var(--radius-md); }
    .or__item-info { flex: 1; min-width: 0; display: grid; gap: 0.2rem; justify-items: start; }
    .or__item-name { margin: 0; font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
    .or__done { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--brand-secondary); }
    .or__quote { margin: 0; padding-inline-start: 0.75rem; border-inline-start: 3px solid var(--brand-pink); color: var(--text-muted); white-space: pre-line; }

    .or__status { padding: 0.1rem 0.6rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; background: var(--bg-muted); color: var(--text-muted); }
    .or__status[data-status='approved'] { background: var(--brand-secondary-soft); color: var(--brand-secondary); }
    .or__status[data-status='rejected'] { background: var(--danger-soft); color: var(--danger); }

    .or__btn {
      flex: none; padding: 0.5rem 1rem; border-radius: var(--radius-full); cursor: pointer;
      font: inherit; font-size: 0.875rem; font-weight: 700; color: var(--brand-primary);
      background: transparent; border: 1.5px solid var(--brand-primary);
    }
    .or__btn:hover { color: #fff; background: var(--brand-primary); }

    .or__service { display: grid; gap: 0.6rem; justify-items: start; padding: 1rem; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); }
    .or__service app-review-form { width: 100%; }
    .or__subtitle { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 1.35rem; }

    .or-later { margin: 0; padding: 0.8rem 1rem; border-radius: var(--radius-lg); background: var(--bg-muted); color: var(--text-muted); font-size: 0.9rem; }
  `,
})
export class OrderReviewsComponent implements OnInit {
  readonly orderId = input.required<ObjectId>();
  readonly orderStatus = input<string>('');

  private reviewService = inject(ReviewService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('idle');
  protected readonly data = signal<OrderReviewState | null>(null);
  protected readonly panel = signal<Panel>(null);
  protected readonly editing = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly formError = signal('');

  ngOnInit(): void {
    if (this.orderStatus() === 'delivered') this.load();
  }

  private load(): void {
    this.state.set('loading');
    this.reviewService
      .orderState(this.orderId())
      .pipe(timeout(FETCH_TIMEOUT_MS), catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (!res?.success) return this.state.set('error');
        this.data.set(res.data);
        this.state.set('ready');
      });
  }

  protected toggle(p: Exclude<Panel, null>): void {
    this.panel.update((cur) => (cur === p ? null : p));
    this.close();
  }

  protected open(key: string): void {
    this.formError.set('');
    this.editing.set(key);
  }

  protected close(): void {
    this.editing.set(null);
    this.formError.set('');
  }

  protected clean(text: string): string {
    return decodeEntities(text);
  }

  protected saveProduct(productId: ObjectId, existing: OwnReview | null, v: ReviewFormValue): void {
    const req = existing
      ? this.reviewService.update(existing._id, { rating: v.rating, comment: v.comment })
      : this.reviewService.createProductReview(productId, { rating: v.rating, comment: v.comment });
    this.run(req, !!existing);
  }

  protected saveService(existing: OwnReview | null, v: ReviewFormValue): void {
    const req = existing
      ? this.reviewService.update(existing._id, v)
      : this.reviewService.createServiceReview({ orderId: this.orderId(), ...v });
    this.run(req, !!existing);
  }

  private run(req: Observable<ApiSuccessResponse<OwnReview>>, wasEdit: boolean): void {
    this.busy.set(true);
    this.formError.set('');
    req.pipe(timeout(FETCH_TIMEOUT_MS), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(this.translate.instant(wasEdit ? 'reviews.updated' : 'reviews.sent'));
        this.close();
        this.load(); // re-read the server state (single source of truth)
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const msg = err instanceof HttpErrorResponse ? err.error?.message : '';
        this.formError.set(msg || this.translate.instant('reviews.genericError'));
      },
    });
  }
}
