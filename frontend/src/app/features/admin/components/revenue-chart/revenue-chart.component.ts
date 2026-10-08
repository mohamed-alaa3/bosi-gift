import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

@Component({
  selector: 'app-admin-revenue-chart',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './revenue-chart.component.html',
  styleUrl: './revenue-chart.component.scss',
})
export class AdminRevenueChartComponent {
  readonly points = input<RevenuePoint[]>([]);
  readonly loading = input<boolean>(false);

  // Chart dimensions
  protected readonly width = 800;
  protected readonly height = 260;
  protected readonly padding = { top: 20, right: 20, bottom: 40, left: 50 };

  // Computed values
  protected readonly chartWidth = computed(
    () => this.width - this.padding.left - this.padding.right,
  );
  protected readonly chartHeight = computed(
    () => this.height - this.padding.top - this.padding.bottom,
  );

  protected readonly maxValue = computed(() => {
    const values = this.points().map((p) => p.revenue);
    if (values.length === 0) return 100;
    const max = Math.max(...values);
    return max > 0 ? max * 1.1 : 100;
  });

  protected readonly pathD = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';

    const w = this.chartWidth();
    const h = this.chartHeight();
    const max = this.maxValue();
    const stepX = pts.length > 1 ? w / (pts.length - 1) : 0;

    return pts
      .map((p, i) => {
        const x = this.padding.left + i * stepX;
        const y = this.padding.top + h - (p.revenue / max) * h;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  });

  protected readonly areaD = computed(() => {
    const line = this.pathD();
    if (!line) return '';

    const pts = this.points();
    const w = this.chartWidth();
    const h = this.chartHeight();
    const stepX = pts.length > 1 ? w / (pts.length - 1) : 0;
    const lastX = this.padding.left + (pts.length - 1) * stepX;
    const baselineY = this.padding.top + h;

    return `${line} L ${lastX.toFixed(1)} ${baselineY} L ${this.padding.left} ${baselineY} Z`;
  });

  protected readonly yTicks = computed(() => {
    const max = this.maxValue();
    const h = this.chartHeight();
    const count = 4;
    const ticks: Array<{ value: number; y: number; label: string }> = [];

    for (let i = 0; i <= count; i++) {
      const value = (max / count) * i;
      const y = this.padding.top + h - (value / max) * h;
      ticks.push({ value, y, label: this.formatValue(value) });
    }

    return ticks.reverse();
  });

  protected readonly xLabels = computed(() => {
    const pts = this.points();
    const w = this.chartWidth();
    const stepX = pts.length > 1 ? w / (pts.length - 1) : 0;

    // Show max 7 labels
    const maxLabels = 7;
    const step = Math.max(1, Math.ceil(pts.length / maxLabels));

    return pts
      .map((p, i) => ({
        x: this.padding.left + i * stepX,
        label: this.formatDate(p.date),
        index: i,
      }))
      .filter((_, i) => i % step === 0 || i === pts.length - 1);
  });

  protected readonly currentPoint = computed(() => {
    const pts = this.points();
    return pts[pts.length - 1] ?? null;
  });

  // Helpers
  private formatValue(value: number): string {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(0);
  }

  protected formatDate(date: string): string {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length < 3) return date;
    return `${parts[1]}/${parts[2]}`;
  }

  protected formatCurrency(v: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);
  }
}
