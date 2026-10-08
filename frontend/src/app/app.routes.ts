import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AccountLayoutComponent } from './layout/account-layout/account-layout.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // ============================
  // ADMIN — Standalone (no header/footer)
  // ============================
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, adminGuard],
    canActivateChild: [authGuard, adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/pages/dashboard/dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      // Products
      {
        path: 'products',
        loadComponent: () =>
          import('./features/admin/pages/products/products-list/products-list.component').then(
            (m) => m.AdminProductsListComponent,
          ),
      },
      {
        path: 'gift-boxes',
        loadComponent: () =>
          import('./features/admin/pages/gift-boxes/gift-boxes-list/gift-boxes-list.component').then(
            (m) => m.AdminGiftBoxesListComponent,
          ),
      },
      {
        path: 'gift-boxes/new',
        loadComponent: () =>
          import('./features/admin/pages/gift-boxes/gift-box-form/gift-box-form.component').then(
            (m) => m.AdminGiftBoxFormComponent,
          ),
      },
      {
        path: 'wrap-styles',
        loadComponent: () =>
          import('./features/admin/pages/wrap-styles/wrap-styles-list/wrap-styles-list.component').then(
            (m) => m.AdminWrapStylesListComponent,
          ),
      },
      {
        path: 'wrap-styles/new',
        loadComponent: () =>
          import('./features/admin/pages/wrap-styles/wrap-style-form/wrap-style-form.component').then(
            (m) => m.AdminWrapStyleFormComponent,
          ),
      },
      {
        path: 'wrap-styles/:id/edit',
        loadComponent: () =>
          import('./features/admin/pages/wrap-styles/wrap-style-form/wrap-style-form.component').then(
            (m) => m.AdminWrapStyleFormComponent,
          ),
      },
      {
        path: 'gift-boxes/:id/edit',
        loadComponent: () =>
          import('./features/admin/pages/gift-boxes/gift-box-form/gift-box-form.component').then(
            (m) => m.AdminGiftBoxFormComponent,
          ),
      },
      {
        path: 'ribbons',
        loadComponent: () =>
          import('./features/admin/pages/ribbons/ribbons-list/ribbons-list.component').then(
            (m) => m.AdminRibbonsListComponent,
          ),
      },
      {
        path: 'ribbons/new',
        loadComponent: () =>
          import('./features/admin/pages/ribbons/ribbon-form/ribbon-form.component').then(
            (m) => m.AdminRibbonFormComponent,
          ),
      },
      {
        path: 'ribbons/:id/edit',
        loadComponent: () =>
          import('./features/admin/pages/ribbons/ribbon-form/ribbon-form.component').then(
            (m) => m.AdminRibbonFormComponent,
          ),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/admin/pages/reviews/reviews-list/reviews-list.component').then(
            (m) => m.AdminReviewsListComponent,
          ),
      },
      {
        path: 'coupons',
        loadComponent: () =>
          import('./features/admin/pages/coupons/coupons-list/coupons-list.component').then(
            (m) => m.AdminCouponsListComponent,
          ),
      },
      {
        path: 'coupons/new',
        loadComponent: () =>
          import('./features/admin/pages/coupons/coupon-form/coupon-form.component').then(
            (m) => m.AdminCouponFormComponent,
          ),
      },
      {
        path: 'coupons/:id/edit',
        loadComponent: () =>
          import('./features/admin/pages/coupons/coupon-form/coupon-form.component').then(
            (m) => m.AdminCouponFormComponent,
          ),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/admin/pages/products/product-form/product-form.component').then(
            (m) => m.AdminProductFormComponent,
          ),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./features/admin/pages/products/product-form/product-form.component').then(
            (m) => m.AdminProductFormComponent,
          ),
      },
      // Categories
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/admin/pages/categories/categories-list/categories-list.component').then(
            (m) => m.AdminCategoriesListComponent,
          ),
      },
      // Orders
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/pages/orders/orders-list/orders-list.component').then(
            (m) => m.AdminOrdersListComponent,
          ),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/admin/pages/orders/order-details/order-details.component').then(
            (m) => m.AdminOrderDetailsComponent,
          ),
      },
      // Banners
      {
        path: 'banners',
        loadComponent: () =>
          import('./features/admin/pages/banners/banners-list/banners-list.component').then(
            (m) => m.AdminBannersListComponent,
          ),
      },
      {
        path: 'banners/new',
        loadComponent: () =>
          import('./features/admin/pages/banners/banner-form/banner-form.component').then(
            (m) => m.AdminBannerFormComponent,
          ),
      },
      {
        path: 'banners/:id/edit',
        loadComponent: () =>
          import('./features/admin/pages/banners/banner-form/banner-form.component').then(
            (m) => m.AdminBannerFormComponent,
          ),
      },
      // Newsletter
      {
        path: 'newsletter',
        loadComponent: () =>
          import('./features/admin/pages/newsletter/newsletter.component').then(
            (m) => m.AdminNewsletterComponent,
          ),
      },
      // Contact
      {
        path: 'contact-messages',
        loadComponent: () =>
          import('./features/admin/pages/contact-messages/contact-messages.component').then(
            (m) => m.AdminContactMessagesComponent,
          ),
      },
      // Settings
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/admin/pages/settings/settings.component').then(
            (m) => m.AdminSettingsComponent,
          ),
      },
    ],
  },

  // ============================
  // AUTH (full-screen, no shell)
  // ============================
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // ============================
  // STOREFRONT — with header + footer
  // ============================
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { seoKey: 'home' },
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'shop',
        data: { seoKey: 'shop' },
        loadComponent: () => import('./features/shop/shop.page').then((m) => m.ShopPage),
      },
      {
        path: 'products/:slug',
        data: { seoKey: 'productDetails' },
        loadComponent: () =>
          import('./features/product-details/product-details.page').then(
            (m) => m.ProductDetailsPage,
          ),
      },
      {
        path: 'cart',
        data: { seoKey: 'cart' },
        loadComponent: () => import('./features/cart/cart.page').then((m) => m.CartPage),
      },
      {
        path: 'gifts',
        data: { seoKey: 'gifts' },
        loadComponent: () =>
          import('./features/gift-builder/gift-builder.page').then((m) => m.GiftBuilderPage),
      },
      {
        path: 'checkout',
        data: { seoKey: 'checkout' },
        loadComponent: () =>
          import('./features/checkout/checkout.page').then((m) => m.CheckoutPage),
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
      {
        path: 'about',
        data: { seoKey: 'about' },
        loadComponent: () => import('./features/about/about.page').then((m) => m.AboutPage),
      },
      {
        path: 'contact',
        data: { seoKey: 'contact' },
        loadComponent: () => import('./features/contact/contact.page').then((m) => m.ContactPage),
      },
      {
        path: 'privacy-policy',
        data: { seoKey: 'privacyPolicy' },
        loadComponent: () =>
          import('./features/static-pages/static-page.component').then(
            (m) => m.StaticPageComponent,
          ),
      },
      {
        path: 'terms-of-service',
        data: { seoKey: 'termsOfService' },
        loadComponent: () =>
          import('./features/static-pages/static-page.component').then(
            (m) => m.StaticPageComponent,
          ),
      },
      {
        path: 'shipping-policy',
        data: { seoKey: 'shippingPolicy' },
        loadComponent: () =>
          import('./features/static-pages/static-page.component').then(
            (m) => m.StaticPageComponent,
          ),
      },
      {
        path: 'returns-exchanges',
        data: { seoKey: 'returnsExchanges' },
        loadComponent: () =>
          import('./features/static-pages/static-page.component').then(
            (m) => m.StaticPageComponent,
          ),
      },
      {
        path: 'gift-cards',
        data: { seoKey: 'giftCards' },
        loadComponent: () =>
          import('./features/static-pages/static-page.component').then(
            (m) => m.StaticPageComponent,
          ),
      },
      {
        path: '**',
        data: { seoKey: 'notFound' },
        loadComponent: () =>
          import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
