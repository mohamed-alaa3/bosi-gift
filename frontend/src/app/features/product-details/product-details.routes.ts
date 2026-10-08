import { Routes } from '@angular/router';

export const PRODUCT_DETAILS_ROUTES: Routes = [
  {
    path: ':slug',
    loadComponent: () => import('./product-details.page').then((m) => m.ProductDetailsPage),
  },
];
