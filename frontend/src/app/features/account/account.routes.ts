import { Routes } from '@angular/router';
import { AccountLayoutComponent } from '../../layout/account-layout/account-layout.component';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    component: AccountLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/overview/overview.component').then((m) => m.AccountOverviewComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/orders/orders.component').then((m) => m.AccountOrdersComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./pages/order-details/order-details.component').then(
            (m) => m.AccountOrderDetailsComponent,
          ),
      },
      {
        path: 'track-order',
        loadComponent: () =>
          import('./pages/track-order/track-order.component').then(
            (m) => m.AccountTrackOrderComponent,
          ),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./pages/wishlist/wishlist.component').then((m) => m.AccountWishlistComponent),
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('./pages/addresses/addresses.component').then((m) => m.AccountAddressesComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.AccountSettingsComponent),
      },
      {
        path: 'payment-methods',
        loadComponent: () =>
          import('./pages/payment-methods/payment-methods.component').then(
            (m) => m.AccountPaymentMethodsComponent,
          ),
      },
    ],
  },
];
