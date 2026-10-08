import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../../core/models';
import { GiftBox, GiftBoxSelection, Ribbon, WrapStyle } from './gift-builder.types';

@Injectable({ providedIn: 'root' })
export class GiftBuilderStore {
  private readonly _selection = signal<GiftBoxSelection>({
    box: null,
    items: [],
    wrapStyle: null,
    ribbon: null,
    note: '',
  });

  readonly selection = this._selection.asReadonly();

  // ---------- Derived ----------
  readonly box = computed(() => this._selection().box);
  readonly items = computed(() => this._selection().items);
  readonly wrapStyle = computed(() => this._selection().wrapStyle);
  readonly ribbon = computed(() => this._selection().ribbon);
  readonly note = computed(() => this._selection().note);

  readonly itemCount = computed(() => this._selection().items.length);
  readonly capacity = computed(() => this._selection().box?.capacity ?? 0);
  readonly isFull = computed(() => {
    const cap = this.capacity();
    return cap > 0 && this.itemCount() >= cap;
  });
  readonly remaining = computed(() => {
    const cap = this.capacity();
    return Math.max(0, cap - this.itemCount());
  });

  readonly subtotal = computed(() => {
    const s = this._selection();
    let total = 0;
    if (s.box) total += s.box.basePrice;
    total += s.items.reduce((sum, p) => sum + this.effectivePrice(p), 0);
    if (s.wrapStyle) total += s.wrapStyle.price;
    if (s.ribbon) total += s.ribbon.price;
    return Math.round(total * 100) / 100;
  });

  // ---------- Mutations ----------

  setBox(box: GiftBox): void {
    this._selection.update((s) => ({ ...s, box }));
  }

  addItem(product: Product): void {
    this._selection.update((s) => {
      if (!s.box || s.items.length >= s.box.capacity) return s;
      // Prevent duplicates
      if (s.items.some((p) => p._id === product._id)) return s;
      return { ...s, items: [...s.items, product] };
    });
  }

  removeItem(productId: string): void {
    this._selection.update((s) => ({
      ...s,
      items: s.items.filter((p) => p._id !== productId),
    }));
  }

  setWrapStyle(style: WrapStyle | null): void {
    this._selection.update((s) => ({ ...s, wrapStyle: style }));
  }

  setRibbon(ribbon: Ribbon | null): void {
    this._selection.update((s) => ({ ...s, ribbon }));
  }

  setNote(note: string): void {
    this._selection.update((s) => ({ ...s, note }));
  }

  reset(): void {
    this._selection.set({
      box: null,
      items: [],
      wrapStyle: null,
      ribbon: null,
      note: '',
    });
  }

  // ---------- Helpers ----------

  private effectivePrice(product: Product): number {
    if (
      product.discountPrice != null &&
      product.discountPrice > 0 &&
      product.discountPrice < product.price
    ) {
      return product.discountPrice;
    }
    return product.price;
  }
}
