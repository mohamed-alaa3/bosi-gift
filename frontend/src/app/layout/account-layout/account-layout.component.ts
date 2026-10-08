import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';
import { AuthStore } from '../../core/stores/auth.store';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

interface AccountNavItem {
  labelKey: string;
  path: string;
  icon: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe, RevealOnScrollDirective],
  templateUrl: './account-layout.component.html',
  styleUrl: './account-layout.component.scss',
})
export class AccountLayoutComponent {
  private authService = inject(AuthService);
  private authStore = inject(AuthStore);

  protected readonly user = this.authStore.user;

  protected readonly userInitial = computed(() => {
    const u = this.user();
    return u?.name?.trim().charAt(0).toUpperCase() ?? '?';
  });

  protected readonly navItems: AccountNavItem[] = [
    {
      labelKey: 'account.dashboard',
      path: '/account',
      icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10',
    },
    {
      labelKey: 'account.orderHistory',
      path: '/account/orders',
      icon: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    },
    {
      labelKey: 'account.trackOrder',
      path: '/account/track-order',
      icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a2 2 0 1 0 0 .01',
    },
    {
      labelKey: 'account.wishlist',
      path: '/account/wishlist',
      icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
    },
    {
      labelKey: 'account.addresses',
      path: '/account/addresses',
      icon: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 10a3 3 0 1 0 0 .01',
    },
    {
      labelKey: 'account.paymentMethods',
      path: '/account/payment-methods',
      icon: 'M2 8h20M2 8v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2M6 15h4',
      disabled: true,
    },
    {
      labelKey: 'account.settings',
      path: '/account/settings',
      icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    },
  ];

  protected onSignOut(): void {
    this.authService.logout();
  }
}
