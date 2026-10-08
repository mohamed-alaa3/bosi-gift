import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { OCCASIONS } from '../../../../core/constants/gift-taxonomy';
import { GiftIconComponent } from '../../../../shared/components/gift-icon/gift-icon.component';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

/**
 * "Shop by Occasion" — every card opens the real Shop pre-filtered with
 * ?occasion=<slug> (backed by Product.occasions + the /products filter).
 */
@Component({
  selector: 'app-shop-by-occasion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslatePipe, GiftIconComponent, RevealOnScrollDirective],
  templateUrl: './shop-by-occasion.component.html',
  styleUrl: './shop-by-occasion.component.scss',
})
export class ShopByOccasionComponent {
  protected readonly occasions = OCCASIONS;
}
