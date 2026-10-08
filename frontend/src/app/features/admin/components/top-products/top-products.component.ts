import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { TopProduct } from '../../../../core/services/admin-stats.service';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';

@Component({
  selector: 'app-admin-top-products',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LocalizedPipe, PricePipe, SafeImagePipe],
  templateUrl: './top-products.component.html',
  styleUrl: './top-products.component.scss',
})
export class AdminTopProductsComponent {
  readonly products = input<TopProduct[]>([]);
  readonly loading = input<boolean>(false);
  readonly maxRevenue = input<number>(1);
}
