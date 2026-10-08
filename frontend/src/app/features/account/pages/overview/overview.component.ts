import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthStore } from '../../../../core/stores/auth.store';
import { CartStore } from '../../../../core/stores/cart.store';
import { WishlistStore } from '../../../../core/stores/wishlist.store';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RevealOnScrollDirective],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class AccountOverviewComponent {
  private authStore = inject(AuthStore);
  private cartStore = inject(CartStore);
  private wishlistStore = inject(WishlistStore);

  protected readonly user = this.authStore.user;

  protected readonly firstName = computed(() => {
    const name = this.user()?.name ?? '';
    return name.split(' ')[0] || name;
  });

  protected readonly wishlistCount = this.wishlistStore.count;
  protected readonly cartCount = this.cartStore.itemCount;
}