import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, of, timeout } from 'rxjs';

import { ModalComponent } from '../modal/modal.component';
import { QuantityStepperComponent } from '../quantity-stepper/quantity-stepper.component';
import { LocalizedPipe } from '../../pipes/localized.pipe';
import { PricePipe } from '../../pipes/price.pipe';
import { SafeImagePipe } from '../../pipes/safe-image.pipe';
import {
  isOptionSelected,
  missingOptionGroups,
  selectOptionValue,
} from '../../utils/product-options';
import { LocalizedText, SelectedOption } from '../../../core/models';
import { CartService } from '../../../core/services/cart.service';
import { QuickAddService } from '../../../core/services/quick-add.service';
import { ToastService } from '../../../core/services/toast.service';
import { CartStore } from '../../../core/stores/cart.store';

const FETCH_TIMEOUT_MS = 10000;

@Component({
  selector: 'app-quick-add-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    ModalComponent,
    QuantityStepperComponent,
    LocalizedPipe,
    PricePipe,
    SafeImagePipe,
  ],
  templateUrl: './quick-add-modal.component.html',
  styleUrl: './quick-add-modal.component.scss',
})
export class QuickAddModalComponent {
  private quickAdd = inject(QuickAddService);
  private cartService = inject(CartService);
  private cartStore = inject(CartStore);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly product = this.quickAdd.product;
  protected readonly selectedOptions = signal<SelectedOption[]>([]);
  protected readonly quantity = signal(1);
  protected readonly adding = signal(false);

  protected readonly image = computed(() => {
    const p = this.product();
    return p?.imageUrls?.[0] || p?.images?.[0] || '';
  });

  protected readonly unitPrice = computed(() => {
    const p = this.product();
    if (!p) return 0;
    return p.discountPrice != null && p.discountPrice > 0 && p.discountPrice < p.price
      ? p.discountPrice
      : p.price;
  });

  protected readonly hasDiscount = computed(() => {
    const p = this.product();
    return !!p && this.unitPrice() < p.price;
  });

  /** Units of this product already in the cart (stock is per product). */
  private readonly inCartQty = computed(() => {
    const p = this.product();
    if (!p) return 0;
    return this.cartStore
      .items()
      .filter((i) => i.type === 'product' && i.product?._id === p._id)
      .reduce((sum, i) => sum + i.quantity, 0);
  });

  /** How many more units can be added right now. */
  protected readonly maxQty = computed(() => {
    const p = this.product();
    return p ? Math.max(0, p.stock - this.inCartQty()) : 0;
  });

  protected readonly isOutOfStock = computed(() => (this.product()?.stock ?? 0) <= 0);
  protected readonly atCartLimit = computed(() => !this.isOutOfStock() && this.maxQty() <= 0);

  /** A group without any value can never be satisfied. */
  protected readonly hasUnavailableGroup = computed(() =>
    (this.product()?.options ?? []).some((g) => !g.values?.length),
  );

  protected readonly missing = computed(() =>
    missingOptionGroups(this.product()?.options, this.selectedOptions()),
  );

  protected readonly canAdd = computed(
    () =>
      !!this.product() &&
      !this.adding() &&
      !this.isOutOfStock() &&
      this.maxQty() >= 1 &&
      !this.hasUnavailableGroup() &&
      this.missing().length === 0 &&
      this.quantity() >= 1 &&
      this.quantity() <= this.maxQty(),
  );

  constructor() {
    // Fresh selection every time the modal opens for a product.
    effect(() => {
      this.product();
      this.selectedOptions.set([]);
      this.quantity.set(1);
      this.adding.set(false);
    });
  }

  protected isSelected(group: LocalizedText, value: LocalizedText): boolean {
    return isOptionSelected(this.selectedOptions(), group, value);
  }

  protected select(group: LocalizedText, value: LocalizedText): void {
    this.selectedOptions.set(selectOptionValue(this.selectedOptions(), group, value));
  }

  protected onQuantity(qty: number): void {
    this.quantity.set(qty);
  }

  protected close(): void {
    this.quickAdd.close();
  }

  protected add(): void {
    const p = this.product();
    if (!p || !this.canAdd()) return;

    this.adding.set(true);
    this.cartService
      .add({ productId: p._id, quantity: this.quantity(), selectedOptions: this.selectedOptions() })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)), // the HTTP interceptor already shows the server message
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.adding.set(false);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.addedToCart'));
          this.close();
        }
      });
  }
}
