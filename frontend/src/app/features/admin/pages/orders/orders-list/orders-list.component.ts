import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { OrderService } from '../../../../../core/services/order.service';
import { Order, OrderQuery, OrderStatus } from '../../../../../core/models';
import { PricePipe } from '../../../../../shared/pipes/price.pipe';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;
const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-orders-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TranslatePipe,
    PricePipe,
    EmptyStateComponent,
    LoaderComponent,
    PaginationComponent,
  ],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss',
})
export class AdminOrdersListComponent implements OnInit {
  private orderService = inject(OrderService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly orders = signal<Order[]>([]);
  protected readonly statusFilter = signal<OrderStatus | 'all'>('all');
  protected readonly searchTerm = signal('');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);

  protected readonly statusOptions: Array<{ value: OrderStatus | 'all'; labelKey: string }> = [
    { value: 'all', labelKey: 'account.allOrders' },
    { value: 'pending', labelKey: 'orderStatus.pending' },
    { value: 'confirmed', labelKey: 'orderStatus.confirmed' },
    { value: 'processing', labelKey: 'orderStatus.processing' },
    { value: 'shipped', labelKey: 'orderStatus.shipped' },
    { value: 'delivered', labelKey: 'orderStatus.delivered' },
    { value: 'cancelled', labelKey: 'orderStatus.cancelled' },
  ];

  protected readonly filteredOrders = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.orders();
    return this.orders().filter((o) => o.orderNumber.toLowerCase().includes(term));
  });

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

  protected setStatus(s: OrderStatus | 'all'): void {
    if (this.statusFilter() === s) return;
    this.statusFilter.set(s);
    this.page.set(1);
    this.load();
  }

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected onPageChange(p: number): void {
    this.page.set(p);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected goToDetails(id: string): void {
    this.router.navigate(['/admin/orders', id]);
  }

  protected statusClass(status: OrderStatus): string {
    return `is-${status}`;
  }

  protected customerName(o: Order): string {
    const u = o.user;
    if (u && typeof u === 'object' && 'name' in u) {
      return (u as { name: string }).name || 'Guest';
    }
    return o.shippingAddress?.fullName || 'Guest';
  }

  protected customerEmail(o: Order): string {
    const u = o.user;
    if (u && typeof u === 'object' && 'email' in u) {
      return (u as { email: string }).email || '';
    }
    return '';
  }
}
