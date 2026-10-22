import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { Product } from '../models';
import { AuthStore } from '../stores/auth.store';
import { ToastService } from './toast.service';

/**
 * Opens the shared Quick Add modal for a product that needs option choices.
 * The modal itself (app-quick-add-modal) is mounted once in the app shell.
 */
@Injectable({ providedIn: 'root' })
export class QuickAddService {
  private authStore = inject(AuthStore);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  private readonly _product = signal<Product | null>(null);
  readonly product = this._product.asReadonly();

  open(product: Product): void {
    if (!this.authStore.isAuthenticated()) {
      this.toast.info(this.translate.instant('toast.signInToAddToCart'));
      return;
    }
    this._product.set(product);
  }

  close(): void {
    this._product.set(null);
  }
}
