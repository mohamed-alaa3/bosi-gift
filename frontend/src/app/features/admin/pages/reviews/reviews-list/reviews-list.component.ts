import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, timeout } from 'rxjs';

import { AdminReview, AdminReviewPayload, ObjectId, Product, ReviewStatus, ReviewType } from '../../../../../core/models';
import { AdminReviewService } from '../../../../../core/services/admin-review.service';
import { ProductService } from '../../../../../core/services/product.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { decodeEntities } from '../../../../../core/utils/html-entities';
import { RatingStarsComponent } from '../../../../../shared/components/rating-stars/rating-stars.component';
import { StarInputComponent } from '../../../../../shared/components/star-input/star-input.component';
import { LocalizedPipe } from '../../../../../shared/pipes/localized.pipe';

const FETCH_TIMEOUT_MS = 10000;

/**
 * Admin → Reviews: moderate customer reviews (approve / reject / delete) and
 * add testimonials received outside the site. Manual testimonials are never
 * "verified purchase" and have no customer account behind them.
 */
@Component({
  selector: 'app-admin-reviews-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, TranslatePipe, LocalizedPipe, RatingStarsComponent, StarInputComponent],
  templateUrl: './reviews-list.component.html',
  styleUrl: './reviews-list.component.scss',
})
export class AdminReviewsListComponent implements OnInit {
  private reviewService = inject(AdminReviewService);
  private productService = inject(ProductService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly reviews = signal<AdminReview[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly busyId = signal<ObjectId | null>(null);

  // Filters
  protected type: '' | ReviewType = '';
  protected status: '' | ReviewStatus = '';
  protected q = '';
  private readonly search$ = new Subject<string>();

  // Manual testimonial form
  protected readonly formOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly products = signal<Product[]>([]);
  protected form = this.emptyForm();
  protected readonly rating = signal(0);
  protected readonly customerService = signal(0);
  protected readonly delivery = signal(0);
  protected readonly packaging = signal(0);

  ngOnInit(): void {
    this.load();
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  protected onSearch(value: string): void {
    this.q = value;
    this.search$.next(value.trim());
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  protected goTo(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.reviewService
      .list({
        type: this.type || undefined,
        status: this.status || undefined,
        q: this.q.trim() || undefined,
        page: this.page(),
        limit: 15,
      })
      .pipe(timeout(FETCH_TIMEOUT_MS), catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.loading.set(false);
        if (!res?.success) return this.error.set(true);
        this.reviews.set(res.data ?? []);
        const meta = (res as { meta?: { total: number; totalPages: number } }).meta;
        this.total.set(meta?.total ?? res.data?.length ?? 0);
        this.totalPages.set(meta?.totalPages ?? 1);
      });
  }

  protected clean(text: string): string {
    return decodeEntities(text);
  }

  protected authorOf(r: AdminReview): string {
    return r.source === 'admin' ? r.displayName : r.user?.name || r.displayName || '—';
  }

  protected setStatus(r: AdminReview, status: ReviewStatus): void {
    if (r.status === status || this.busyId()) return;
    this.busyId.set(r._id);
    this.reviewService
      .setStatus(r._id, status)
      .pipe(timeout(FETCH_TIMEOUT_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.busyId.set(null);
          this.reviews.update((list) => list.map((x) => (x._id === r._id ? res.data : x)));
          this.toast.success(this.translate.instant('admin.reviews.statusUpdated'));
        },
        error: () => {
          this.busyId.set(null);
          this.toast.error(this.translate.instant('reviews.genericError'));
        },
      });
  }

  protected remove(r: AdminReview): void {
    if (this.busyId()) return;
    if (!window.confirm(this.translate.instant('admin.reviews.confirmDelete'))) return;
    this.busyId.set(r._id);
    this.reviewService
      .delete(r._id)
      .pipe(timeout(FETCH_TIMEOUT_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.toast.success(this.translate.instant('admin.reviews.deleted'));
          this.load();
        },
        error: () => {
          this.busyId.set(null);
          this.toast.error(this.translate.instant('reviews.genericError'));
        },
      });
  }

  // ---- Manual testimonial ----

  private emptyForm() {
    return { type: 'product' as ReviewType, displayName: '', comment: '', product: '', status: 'approved' as ReviewStatus, date: '' };
  }

  protected openForm(): void {
    this.form = this.emptyForm();
    this.rating.set(0);
    this.customerService.set(0);
    this.delivery.set(0);
    this.packaging.set(0);
    this.formError.set('');
    this.formOpen.set(true);
    if (this.products().length === 0) {
      this.productService
        .list({ limit: 100, sort: 'newest' })
        .pipe(timeout(FETCH_TIMEOUT_MS), catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
        .subscribe((res) => this.products.set(res?.data ?? []));
    }
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected save(): void {
    const f = this.form;
    if (this.saving()) return;
    if (f.displayName.trim().length < 2) return this.formError.set(this.translate.instant('admin.reviews.errName'));
    if (!this.rating()) return this.formError.set(this.translate.instant('reviews.ratingRequired'));
    if (f.comment.trim().length < 3) return this.formError.set(this.translate.instant('reviews.commentRequired'));
    if (f.type === 'product' && !f.product) return this.formError.set(this.translate.instant('admin.reviews.errProduct'));

    const payload: AdminReviewPayload = {
      type: f.type,
      displayName: f.displayName.trim(),
      rating: this.rating(),
      comment: f.comment.trim(),
      status: f.status,
    };
    if (f.type === 'product') payload.product = f.product;
    if (f.date) payload.createdAt = new Date(f.date).toISOString();
    if (f.type === 'service') {
      payload.customerServiceRating = this.customerService() || null;
      payload.deliveryRating = this.delivery() || null;
      payload.packagingRating = this.packaging() || null;
    }

    this.saving.set(true);
    this.formError.set('');
    this.reviewService
      .create(payload)
      .pipe(timeout(FETCH_TIMEOUT_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.toast.success(this.translate.instant('admin.reviews.created'));
          this.page.set(1);
          this.load();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          const msg = err instanceof HttpErrorResponse ? err.error?.message : '';
          this.formError.set(msg || this.translate.instant('reviews.genericError'));
        },
      });
  }
}
