import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { OrderService } from '../../../../core/services/order.service';
import { Order, OrderQuery, OrderStatus } from '../../../../core/models';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;
const PAGE_SIZE = 10;

@Component({
  selector: 'app-account-orders',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    TranslatePipe,
    PricePipe,
    EmptyStateComponent,
    LoaderComponent,
    PaginationComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class AccountOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly orders = signal<Order[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);
  protected readonly statusFilter = signal<OrderStatus | 'all'>('all');

  protected readonly statusOptions: Array<{ value: OrderStatus | 'all'; labelKey: string }> = [
    { value: 'all', labelKey: 'account.allOrders' },
    { value: 'pending', labelKey: 'orderStatus.pending' },
    { value: 'processing', labelKey: 'orderStatus.processing' },
    { value: 'shipped', labelKey: 'orderStatus.shipped' },
    { value: 'delivered', labelKey: 'orderStatus.delivered' },
    { value: 'cancelled', labelKey: 'orderStatus.cancelled' },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    const query: OrderQuery = {
      page: this.page(),
      limit: PAGE_SIZE,
    };

    if (this.statusFilter() !== 'all') {
      query.status = this.statusFilter() as OrderStatus;
    }

    this.orderService
      .list(query)
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

        const items = res.data ?? [];
        this.orders.set(items);

        if (res.meta) {
          this.total.set(res.meta.total);
          this.totalPages.set(res.meta.totalPages);
        } else {
          this.total.set(items.length);
          this.totalPages.set(1);
        }

        this.state.set(items.length > 0 ? 'success' : 'empty');
      });
  }

  protected setFilter(status: OrderStatus | 'all'): void {
    if (this.statusFilter() === status) return;
    this.statusFilter.set(status);
    this.page.set(1);
    this.load();
  }

  protected onPageChange(p: number): void {
    this.page.set(p);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected statusClass(status: OrderStatus): string {
    switch (status) {
      case 'pending':
        return 'is-pending';
      case 'confirmed':
        return 'is-confirmed';
      case 'processing':
        return 'is-processing';
      case 'shipped':
        return 'is-shipped';
      case 'delivered':
        return 'is-delivered';
      case 'cancelled':
        return 'is-cancelled';
      default:
        return '';
    }
  }
}
