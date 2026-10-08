import { Routes } from '@angular/router';

export const CHECKOUT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./checkout.page').then((m) => m.CheckoutPage),
  },
];
