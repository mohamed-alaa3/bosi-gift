import { Injectable, signal, computed } from '@angular/core';
import { ObjectId, Wishlist } from '../models';

/**
 * Wishlist UI state.
 * Keeps the wishlist in memory for the header badge and page.
 */
@Injectable({ providedIn: 'root' })
export class WishlistStore {
  private readonly _wishlist = signal<Wishlist | null>(null);
  private readonly _loading = signal<boolean>(false);

  readonly wishlist = this._wishlist.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly count = computed(() => this._wishlist()?.count ?? 0);
  readonly items = computed(() => this._wishlist()?.items ?? []);
  readonly isEmpty = computed(() => (this._wishlist()?.items?.length ?? 0) === 0);

  setWishlist(wishlist: Wishlist | null): void {
    this._wishlist.set(wishlist);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  /**
   * Fast check whether a given product id is in the wishlist.
   * Reads from the in-memory list — no API call.
   */
  has(productId: ObjectId): boolean {
    return this._wishlist()?.items.some((p) => p._id === productId) ?? false;
  }

  clear(): void {
    this._wishlist.set(null);
  }
}