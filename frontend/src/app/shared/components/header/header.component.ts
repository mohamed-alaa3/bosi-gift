import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthStore } from '../../../core/stores/auth.store';
import { CartStore } from '../../../core/stores/cart.store';
import { UiStore } from '../../../core/stores/ui.store';
import { WishlistStore } from '../../../core/stores/wishlist.store';

import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { SearchBarComponent } from '../search-bar/search-bar.component';

interface NavItem {
  labelKey: string;
  path: string;
}

const SCROLL_THRESHOLD = 100;
const SCROLL_DELTA = 8;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    LanguageSwitcherComponent,
    ThemeToggleComponent,
    SearchBarComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private authStore = inject(AuthStore);
  private cartStore = inject(CartStore);
  private wishlistStore = inject(WishlistStore);
  private uiStore = inject(UiStore);
  private router = inject(Router);

  readonly showNav = input<boolean>(true);

  protected readonly isScrolled = signal(false);
  protected readonly isHidden = signal(false);
  protected readonly mobileMenuOpen = signal(false);
  /** Mobile search bar visibility */
  protected readonly mobileSearchOpen = signal(false);

  protected readonly isAuthenticated = this.authStore.isAuthenticated;
  protected readonly currentUser = this.authStore.user;
  protected readonly cartCount = this.cartStore.itemCount;
  protected readonly wishlistCount = this.wishlistStore.count;

  protected readonly accountLink = computed(() => {
    const user = this.currentUser();
    if (!user) return '/auth/login';
    return user.role === 'admin' ? '/admin' : '/account';
  });

  protected readonly navItems: NavItem[] = [
    { labelKey: 'nav.home', path: '/' },
    { labelKey: 'nav.shop', path: '/shop' },
    { labelKey: 'nav.gifts', path: '/gifts' },
    { labelKey: 'nav.about', path: '/about' },
    { labelKey: 'nav.contact', path: '/contact' },
  ];

  protected readonly userInitial = computed(() => {
    const user = this.currentUser();
    if (!user?.name) return '';
    return user.name.trim().charAt(0).toUpperCase();
  });

  private lastScrollY = 0;

  constructor() {
    this.lastScrollY = window.scrollY || 0;
    this.updateScrollState(this.lastScrollY);
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.updateScrollState(window.scrollY || 0);
  }

  private updateScrollState(y: number): void {
    this.isScrolled.set(y > 8);

    const diff = y - this.lastScrollY;

    if (y < SCROLL_THRESHOLD || this.mobileMenuOpen() || this.uiStore.anyOverlayOpen()) {
      this.isHidden.set(false);
      this.lastScrollY = y;
      return;
    }

    if (Math.abs(diff) < SCROLL_DELTA) return;

    if (diff > 0) {
      this.isHidden.set(true);
    } else {
      this.isHidden.set(false);
    }

    this.lastScrollY = y;
  }

  /** Desktop search bar submission */
  protected onSearchSubmit(query: string): void {
    const q = (query || '').trim();
    if (!q) return;

    this.uiStore.closeSearch();
    this.router.navigate(['/shop'], { queryParams: { q } });
  }

  /** Mobile: toggle the inline search bar */
  protected toggleMobileSearch(): void {
    this.mobileSearchOpen.update((v) => !v);
  }

  /** (Keep for backwards compat) — not used if the desktop bar is visible */
  protected openSearch(): void {
    this.uiStore.openSearch();
  }

  protected openCart(): void {
    this.uiStore.openCartDrawer();
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
