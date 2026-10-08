import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
})
export class AdminKpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly growth = input<number | null>(null);
  readonly icon = input<string>('');
  readonly iconColor = input<'primary' | 'success' | 'info' | 'warning' | 'danger'>('primary');
  readonly loading = input<boolean>(false);

  protected absGrowth(): number {
    return Math.abs(this.growth() ?? 0);
  }
}
