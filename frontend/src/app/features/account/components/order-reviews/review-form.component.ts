import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { OwnReview } from '../../../../core/models';
import { decodeEntities } from '../../../../core/utils/html-entities';
import { StarInputComponent } from '../../../../shared/components/star-input/star-input.component';

export interface ReviewFormValue {
  rating: number;
  comment: string;
  customerServiceRating?: number | null;
  deliveryRating?: number | null;
  packagingRating?: number | null;
}

const MIN_COMMENT = 3;
const MAX_COMMENT = 1000;

/** One form for product reviews and the overall-experience (service) review. */
@Component({
  selector: 'app-review-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe, StarInputComponent],
  template: `
    <form class="rf" (ngSubmit)="submit()" novalidate>
      <div class="rf__field">
        <span class="rf__label" id="rf-overall-{{ uid }}">{{ 'reviews.overall' | translate }}</span>
        <app-star-input size="lg" [(value)]="rating" [label]="'reviews.overall' | translate" [disabled]="busy()" />
        @if (touched() && !rating()) {
          <p class="rf__error" role="alert">{{ 'reviews.ratingRequired' | translate }}</p>
        }
      </div>

      @if (kind() === 'service') {
        <div class="rf__extras">
          <p class="rf__hint">{{ 'reviews.optionalRatings' | translate }}</p>
          <div class="rf__extra">
            <span>{{ 'reviews.customerService' | translate }}</span>
            <app-star-input [(value)]="customerService" [label]="'reviews.customerService' | translate" [disabled]="busy()" />
          </div>
          <div class="rf__extra">
            <span>{{ 'reviews.delivery' | translate }}</span>
            <app-star-input [(value)]="delivery" [label]="'reviews.delivery' | translate" [disabled]="busy()" />
          </div>
          <div class="rf__extra">
            <span>{{ 'reviews.packaging' | translate }}</span>
            <app-star-input [(value)]="packaging" [label]="'reviews.packaging' | translate" [disabled]="busy()" />
          </div>
        </div>
      }

      <div class="rf__field">
        <label class="rf__label" [for]="'rf-comment-' + uid">
          {{ (kind() === 'service' ? 'reviews.tellUs' : 'reviews.productComment') | translate }}
        </label>
        <textarea
          class="rf__textarea"
          [id]="'rf-comment-' + uid"
          rows="4"
          [maxlength]="max"
          [ngModel]="comment()"
          (ngModelChange)="comment.set($event)"
          name="comment"
          [disabled]="busy()"
          [attr.aria-invalid]="touched() && commentError() ? 'true' : null"
        ></textarea>
        <div class="rf__meta">
          @if (touched() && commentError(); as err) {
            <p class="rf__error" role="alert">{{ err | translate }}</p>
          } @else {
            <span></span>
          }
          <span class="rf__count">{{ comment().length }} / {{ max }}</span>
        </div>
      </div>

      @if (error()) {
        <p class="rf__error rf__error--box" role="alert">{{ error() }}</p>
      }

      <p class="rf__note">{{ 'reviews.moderationNote' | translate }}</p>

      <div class="rf__actions">
        <button type="submit" class="rf__btn rf__btn--primary" [disabled]="busy()">
          @if (busy()) { {{ 'reviews.saving' | translate }} }
          @else { {{ (existing() ? 'reviews.saveChanges' : 'reviews.submit') | translate }} }
        </button>
        <button type="button" class="rf__btn" (click)="cancelled.emit()" [disabled]="busy()">
          {{ 'reviews.cancel' | translate }}
        </button>
      </div>
    </form>
  `,
  styles: `
    :host { display: block; }
    .rf { display: grid; gap: 1rem; }
    .rf__field { display: grid; gap: 0.4rem; }
    .rf__label { font-weight: 700; font-size: 0.95rem; }
    .rf__extras { display: grid; gap: 0.5rem; padding: 0.9rem; border-radius: var(--radius-lg); background: var(--bg-muted); }
    .rf__hint { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
    .rf__extra { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; font-size: 0.9rem; }
    .rf__textarea {
      width: 100%; resize: vertical; min-height: 96px; padding: 0.75rem 0.9rem;
      font: inherit; color: var(--text); background: var(--surface);
      border: 1.5px solid var(--border-strong); border-radius: var(--radius-md);
    }
    .rf__textarea:focus-visible { outline: 3px solid var(--brand-secondary); outline-offset: 1px; }
    .rf__textarea[aria-invalid='true'] { border-color: var(--danger); }
    .rf__meta { display: flex; justify-content: space-between; gap: 1rem; }
    .rf__count { font-size: 0.8rem; color: var(--text-muted); }
    .rf__error { margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--danger); }
    .rf__error--box { padding: 0.6rem 0.8rem; border-radius: var(--radius-md); background: var(--danger-soft); }
    .rf__note { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
    .rf__actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .rf__btn {
      padding: 0.65rem 1.3rem; border-radius: var(--radius-full); font: inherit; font-weight: 700; cursor: pointer;
      color: var(--text); background: var(--surface); border: 1.5px solid var(--border-strong);
    }
    .rf__btn--primary { color: #fff; background: var(--brand-primary); border-color: var(--brand-primary); }
    .rf__btn--primary:hover:not(:disabled) { background: var(--brand-primary-hover); }
    .rf__btn:focus-visible { outline: 3px solid var(--brand-secondary); outline-offset: 2px; }
    .rf__btn:disabled { opacity: 0.6; cursor: not-allowed; }
  `,
})
export class ReviewFormComponent {
  readonly kind = input.required<'product' | 'service'>();
  readonly existing = input<OwnReview | null>(null);
  readonly busy = input<boolean>(false);
  readonly error = input<string>('');

  readonly submitted = output<ReviewFormValue>();
  readonly cancelled = output<void>();

  protected readonly uid = Math.random().toString(36).slice(2, 8);
  protected readonly max = MAX_COMMENT;

  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly customerService = signal(0);
  protected readonly delivery = signal(0);
  protected readonly packaging = signal(0);
  protected readonly touched = signal(false);

  protected readonly commentError = computed<string | null>(() => {
    const len = this.comment().trim().length;
    if (len < MIN_COMMENT) return 'reviews.commentRequired';
    if (len > MAX_COMMENT) return 'reviews.commentTooLong';
    return null;
  });

  constructor() {
    // Pre-fill when editing (text is decoded so edits don't double-escape)
    effect(() => {
      const r = this.existing();
      this.rating.set(r?.rating ?? 0);
      this.comment.set(decodeEntities(r?.comment));
      this.customerService.set(r?.customerServiceRating ?? 0);
      this.delivery.set(r?.deliveryRating ?? 0);
      this.packaging.set(r?.packagingRating ?? 0);
    });
  }

  protected submit(): void {
    this.touched.set(true);
    if (!this.rating() || this.commentError() || this.busy()) return;

    const value: ReviewFormValue = { rating: this.rating(), comment: this.comment().trim() };
    if (this.kind() === 'service') {
      value.customerServiceRating = this.customerService() || null;
      value.deliveryRating = this.delivery() || null;
      value.packagingRating = this.packaging() || null;
    }
    this.submitted.emit(value);
  }
}
