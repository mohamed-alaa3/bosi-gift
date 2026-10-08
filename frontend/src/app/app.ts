import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthStore } from './core/stores/auth.store';
import { CartStore } from './core/stores/cart.store';
import { WishlistStore } from './core/stores/wishlist.store';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { SeoService } from './core/services/seo.service';
import { CartService } from './core/services/cart.service';
import { WishlistService } from './core/services/wishlist.service';

import { CartDrawerComponent } from './features/cart/components/cart-drawer/cart-drawer.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CartDrawerComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private authStore = inject(AuthStore);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private languageService = inject(LanguageService);
  private themeService = inject(ThemeService);
  private seoService = inject(SeoService);

  ngOnInit(): void {
    this.authStore.initialize();
    this.languageService.initialize();
    this.themeService.initialize();
    this.seoService.init();

    // Pre-load cart + wishlist if the user is authenticated
    if (this.authStore.isAuthenticated()) {
      this.cartService.get().subscribe({ error: () => {} });
      this.wishlistService.get().subscribe({ error: () => {} });
    }
  }
}
