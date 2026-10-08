import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';
import { AuthStore } from '../../core/stores/auth.store';

import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

interface AdminNavItem {
  labelKey: string;
  path: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslatePipe,
    LanguageSwitcherComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private authService = inject(AuthService);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private el = inject(ElementRef<HTMLElement>);

  protected readonly user = this.authStore.user;
  protected readonly sidebarOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  protected readonly userInitial = computed(() => {
    const u = this.user();
    return u?.name?.trim().charAt(0).toUpperCase() ?? 'A';
  });

  protected readonly navItems: AdminNavItem[] = [
    {
      labelKey: 'admin.nav.dashboard',
      path: '/admin',
      icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10',
      exact: true,
    },
    {
      labelKey: 'admin.nav.products',
      path: '/admin/products',
      icon: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7l8.7 5 8.7-5M12 22V12',
    },
    {
      labelKey: 'admin.nav.categories',
      path: '/admin/categories',
      icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    },
    {
      labelKey: 'admin.nav.giftBoxes',
      path: '/admin/gift-boxes',
      icon: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7l8.7 5 8.7-5M12 22V12',
    },
    {
      labelKey: 'admin.nav.orders',
      path: '/admin/orders',
      icon: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    },
    {
      labelKey: 'admin.nav.reviews',
      path: '/admin/reviews',
      icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    },
    {
      labelKey: 'admin.nav.coupons',
      path: '/admin/coupons',
      icon: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
    },
    {
      labelKey: 'admin.nav.banners',
      path: '/admin/banners',
      icon: 'M2 6h20v12H2zM2 14l5-5 5 5 4-4 6 6',
    },
    {
      labelKey: 'admin.nav.wrapStyles',
      path: '/admin/wrap-styles',
      icon: 'M3 8h18v4H3zM3 12v7a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-7M12 8v12M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5',
    },
    {
      labelKey: 'admin.nav.ribbons',
      path: '/admin/ribbons',
      icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    },
    {
      labelKey: 'admin.nav.newsletter',
      path: '/admin/newsletter',
      icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
    },
    {
      labelKey: 'admin.nav.contact',
      path: '/admin/contact-messages',
      icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    },
    {
      labelKey: 'admin.nav.settings',
      path: '/admin/settings',
      icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    },
  ];

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  protected closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  protected goToStore(): void {
    this.closeUserMenu();
    this.router.navigate(['/']);
  }

  protected goToAccount(): void {
    this.closeUserMenu();
    this.router.navigate(['/account']);
  }

  protected signOut(): void {
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.admin-layout__user-wrap')) {
      this.userMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.userMenuOpen.set(false);
    this.sidebarOpen.set(false);
  }
}
