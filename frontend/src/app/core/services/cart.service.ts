import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { CartStore } from '../stores/cart.store';
import { UiStore } from '../stores/ui.store';
import {
  AddToCartPayload,
  ApiSuccessResponse,
  Cart,
  GiftBoxOrderPayload,
  ObjectId,
  UpdateCartItemPayload,
} from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private cartStore = inject(CartStore);
  private uiStore = inject(UiStore);

  private readonly endpoint = `${this.baseUrl}/cart`;

  get(): Observable<ApiSuccessResponse<Cart>> {
    return this.http
      .get<ApiSuccessResponse<Cart>>(this.endpoint)
      .pipe(tap((res) => this.cartStore.setCart(res.data)));
  }

  add(payload: AddToCartPayload): Observable<ApiSuccessResponse<Cart>> {
    return this.http.post<ApiSuccessResponse<Cart>>(this.endpoint, payload).pipe(
      tap((res) => {
        this.cartStore.setCart(res.data);
        // Auto-open the drawer on successful add
        this.uiStore.openCartDrawer();
      }),
    );
  }
  addGiftBox(payload: GiftBoxOrderPayload): Observable<ApiSuccessResponse<Cart>> {
    return this.http.post<ApiSuccessResponse<Cart>>(`${this.endpoint}/gift-box`, payload).pipe(
      tap((res) => {
        this.cartStore.setCart(res.data);
        this.uiStore.openCartDrawer();
      }),
    );
  }

  updateItem(
    itemId: ObjectId,
    payload: UpdateCartItemPayload,
  ): Observable<ApiSuccessResponse<Cart>> {
    return this.http
      .patch<ApiSuccessResponse<Cart>>(`${this.endpoint}/${itemId}`, payload)
      .pipe(tap((res) => this.cartStore.setCart(res.data)));
  }

  removeItem(itemId: ObjectId): Observable<ApiSuccessResponse<Cart>> {
    return this.http
      .delete<ApiSuccessResponse<Cart>>(`${this.endpoint}/${itemId}`)
      .pipe(tap((res) => this.cartStore.setCart(res.data)));
  }

  clear(): Observable<ApiSuccessResponse<Cart>> {
    return this.http
      .delete<ApiSuccessResponse<Cart>>(this.endpoint)
      .pipe(tap((res) => this.cartStore.setCart(res.data)));
  }

  resetLocal(): void {
    this.cartStore.clear();
  }
}
