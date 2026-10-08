import { CommonModule, DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { RecentOrder } from '../../../../core/services/admin-stats.service';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-admin-recent-orders',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, TranslatePipe, PricePipe],
  templateUrl: './recent-orders.component.html',
  styleUrl: './recent-orders.component.scss',
})
export class AdminRecentOrdersComponent {
  readonly orders = input<RecentOrder[]>([]);
  readonly loading = input<boolean>(false);
}
