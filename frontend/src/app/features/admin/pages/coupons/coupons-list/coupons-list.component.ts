import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AdminCouponService } from '../../../../../core/services/admin-coupon.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { Coupon } from '../../../../../core/models';
import { PricePipe } from '../../../../../shared/pipes/price.pipe';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

type LoadState = 'loading' | 'success' | 'empty' | 'error';
type StatusFilter = 'all' | 'active' | 'inactive';
type CouponStatus = 'active' | 'inactive' | 'scheduled' | 'expired' | 'exhausted';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-admin-coupons-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    PricePipe,
    EmptyStateComponent,
    LoaderComponent,
  ],
  templateUrl: './coupons-list.component.html',
  styleUrl: './coupons-list.component.scss',
})
export class AdminCouponsListComponent implements OnInit {
  private couponService = inject(AdminCouponService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly coupons = signal<Coupon[]>([]);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly togglingId = signal<string | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');

  protected readonly statusOptions: { value: StatusFilter; labelKey: string }[] = [
    { value: 'all', labelKey: 'admin.coupons.filterAll' },
    { value: 'active', labelKey: 'admin.coupons.active' },
    { value: 'inactive', labelKey: 'admin.coupons.inactive' },
  ];

  /** Client-side filtering — the coupon list is small and loaded in full. */
  protected readonly filteredCoupons = computed(() => {
    const term = this.searchTerm().trim().toUpperCase();
    const filter = this.statusFilter();

    return this.coupons().filter((c) => {
      if (filter === 'active' && !c.isActive) return false;
      if (filter === 'inactive' && c.isActive) return false;
      return !term || c.code.includes(term);
    });
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.couponService
      .list()
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res || !res.success) {
          this.state.set('error');
          return;
        }
        this.coupons.set(res.data ?? []);
        this.state.set((res.data?.length ?? 0) > 0 ? 'success' : 'empty');
      });
  }

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected setStatus(value: StatusFilter): void {
    this.statusFilter.set(value);
  }

  /** Effective status, combining the active flag, schedule and usage. */
  protected statusOf(c: Coupon): CouponStatus {
    if (!c.isActive) return 'inactive';
    const now = Date.now();
    if (c.validFrom && now < new Date(c.validFrom).getTime()) return 'scheduled';
    if (c.validUntil && now > new Date(c.validUntil).getTime()) return 'expired';
    if (c.usageLimit != null && c.usedCount >= c.usageLimit) return 'exhausted';
    return 'active';
  }

  protected toggleActive(coupon: Coupon): void {
    if (this.togglingId()) return;
    this.togglingId.set(coupon._id);

    this.couponService
      .update(coupon._id, { isActive: !coupon.isActive })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.togglingId.set(null);
        if (!res?.success) return;

        this.coupons.update((list) => list.map((c) => (c._id === coupon._id ? res.data : c)));
        this.toast.success(
          this.translate.instant(
            res.data.isActive ? 'admin.coupons.toastActivated' : 'admin.coupons.toastDeactivated',
          ),
        );
      });
  }

  protected remove(coupon: Coupon): void {
    if (this.deletingId()) return;
    const message = this.translate.instant('admin.coupons.confirmDelete', { code: coupon.code });
    if (!window.confirm(message)) return;

    this.deletingId.set(coupon._id);

    this.couponService
      .delete(coupon._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.deletingId.set(null);
        if (res?.success) {
          this.toast.success(this.translate.instant('admin.coupons.toastDeleted'));
          this.load();
        }
      });
  }
}
