import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AdminStatsService,
  StatsOverview,
  RevenuePoint,
  TopProduct,
  LowStockProduct,
  RecentOrder,
  StatsRange,
} from '../../../../core/services/admin-stats.service';

import { AdminKpiCardComponent } from '../../components/kpi-card/kpi-card.component';
import { AdminRevenueChartComponent } from '../../components/revenue-chart/revenue-chart.component';
import { AdminRecentOrdersComponent } from '../../components/recent-orders/recent-orders.component';
import { AdminLowStockAlertComponent } from '../../components/low-stock-alert/low-stock-alert.component';
import { AdminTopProductsComponent } from '../../components/top-products/top-products.component';

const FETCH_TIMEOUT_MS = 10000;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    AdminKpiCardComponent,
    AdminRevenueChartComponent,
    AdminRecentOrdersComponent,
    AdminLowStockAlertComponent,
    AdminTopProductsComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private statsService = inject(AdminStatsService);
  private destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly range = signal<StatsRange>('30d');

  protected readonly overview = signal<StatsOverview | null>(null);
  protected readonly revenueSeries = signal<RevenuePoint[]>([]);
  protected readonly recentOrders = signal<RecentOrder[]>([]);
  protected readonly lowStock = signal<LowStockProduct[]>([]);
  protected readonly topProducts = signal<TopProduct[]>([]);

  protected readonly maxRevenue = computed(() => {
    const list = this.topProducts();
    return list.length > 0 ? Math.max(...list.map((p) => p.totalRevenue)) : 1;
  });

  protected readonly rangeOptions: Array<{ value: StatsRange; labelKey: string }> = [
    { value: '7d', labelKey: 'admin.dashboard.range7d' },
    { value: '30d', labelKey: 'admin.dashboard.range30d' },
    { value: '90d', labelKey: 'admin.dashboard.range90d' },
  ];

  ngOnInit(): void {
    this.loadAll();
  }

  protected setRange(r: StatsRange): void {
    if (this.range() === r) return;
    this.range.set(r);
    this.loadAll();
  }

  protected loadAll(): void {
    this.loading.set(true);
    const r = this.range();

    forkJoin({
      overview: this.statsService.getOverview(r).pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
      series: this.statsService.getRevenueSeries(r).pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
      orders: this.statsService.getRecentOrders(5).pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
      lowStock: this.statsService.getLowStock(5, 10).pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
      top: this.statsService.getTopProducts(r, 5).pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.overview.set(result.overview?.success ? result.overview.data : null);
        this.revenueSeries.set(result.series?.success ? result.series.data : []);
        this.recentOrders.set(result.orders?.success ? result.orders.data : []);
        this.lowStock.set(result.lowStock?.success ? result.lowStock.data : []);
        this.topProducts.set(result.top?.success ? result.top.data : []);
        this.loading.set(false);
      });
  }

  // Format helpers for KPI cards
  protected formatCurrency(v: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);
  }

  protected formatNumber(v: number): string {
    return new Intl.NumberFormat('en-US').format(v);
  }

  protected formatPercent(v: number): string {
    return `${v.toFixed(1)}%`;
  }
}
