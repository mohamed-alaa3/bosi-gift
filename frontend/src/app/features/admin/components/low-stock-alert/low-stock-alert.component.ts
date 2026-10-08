import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LowStockProduct } from '../../../../core/services/admin-stats.service';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';

@Component({
  selector: 'app-admin-low-stock-alert',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, LocalizedPipe],
  templateUrl: './low-stock-alert.component.html',
  styleUrl: './low-stock-alert.component.scss',
})
export class AdminLowStockAlertComponent {
  readonly products = input<LowStockProduct[]>([]);
  readonly loading = input<boolean>(false);
}
