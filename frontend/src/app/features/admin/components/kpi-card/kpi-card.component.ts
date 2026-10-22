import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { LanguageService } from '../../../../core/services/language.service';
import { formatPercent } from '../../../../shared/utils/format';

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

  private language = inject(LanguageService);

  protected absGrowth(): number {
    return Math.abs(this.growth() ?? 0);
  }

  protected growthText(): string {
    return formatPercent(this.absGrowth(), this.language.current());
  }
}
