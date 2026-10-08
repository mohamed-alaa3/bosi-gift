import { Injectable, signal, computed } from '@angular/core';
import { Cart } from '../models';

/**
 * Cart UI state.
 * Holds the last-fetched cart in memory so the header badge,
 * drawer, and cart page stay in sync.
 * Actual API calls live in CartService (feature-layer).
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _cart = signal<Cart | null>(null);
  private readonly _loading = signal<boolean>(false);

  readonly cart = this._cart.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly itemCount = computed(() => this._cart()?.itemCount ?? 0);
  readonly subtotal = computed(() => this._cart()?.subtotal ?? 0);
  readonly items = computed(() => this._cart()?.items ?? []);
  readonly hasUnavailable = computed(() => this._cart()?.hasUnavailable ?? false);
  readonly isEmpty = computed(() => (this._cart()?.items?.length ?? 0) === 0);

  setCart(cart: Cart | null): void {
    this._cart.set(cart);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  clear(): void {
    this._cart.set(null);
  }
}