import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, finalize, map, tap } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { WishlistStore } from '../stores/wishlist.store';
import { ApiSuccessResponse, ObjectId, Wishlist } from '../models';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private wishlistStore = inject(WishlistStore);
  private readonly endpoint = `${this.baseUrl}/wishlist`;

  get(): Observable<ApiSuccessResponse<Wishlist>> {
    return this.http
      .get<ApiSuccessResponse<Wishlist>>(this.endpoint)
      .pipe(tap((res) => this.wishlistStore.setWishlist(res.data)));
  }

  add(productId: ObjectId): Observable<ApiSuccessResponse<Wishlist>> {
    return this.http
      .post<ApiSuccessResponse<Wishlist>>(this.endpoint, { productId })
      .pipe(tap((res) => this.wishlistStore.setWishlist(res.data)));
  }

  remove(productId: ObjectId): Observable<ApiSuccessResponse<Wishlist>> {
    return this.http
      .delete<ApiSuccessResponse<Wishlist>>(`${this.endpoint}/${productId}`)
      .pipe(tap((res) => this.wishlistStore.setWishlist(res.data)));
  }

  /** Product ids with a request in flight (prevents double-click races). */
  private readonly pending = new Set<ObjectId>();

  /**
   * Real toggle: adds when the product is not in the (server-synced) wishlist,
   * removes when it is. The store is replaced by the API response, so UI and
   * backend stay in sync. Ignores clicks while a request for the same product
   * is still in flight. Emits `{ added }` on success.
   */
  toggle(productId: ObjectId): Observable<{ added: boolean }> {
    if (this.pending.has(productId)) return EMPTY;
    const willAdd = !this.wishlistStore.has(productId);
    this.pending.add(productId);
    const request = willAdd ? this.add(productId) : this.remove(productId);
    return request.pipe(
      map(() => ({ added: willAdd })),
      finalize(() => this.pending.delete(productId)),
    );
  }

  resetLocal(): void {
    this.wishlistStore.clear();
  }
}