import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import {
  ApiSuccessResponse,
  CreateOrderPayload,
  CreateOrderResponse,
  ObjectId,
  Order,
  OrderQuery,
  OrderTracking,
  QuoteOrderPayload,
  QuoteResponse,
  UpdateOrderStatusPayload,
} from '../models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/orders`;

  /**
   * Preview the order total without creating it.
   * Safe to call repeatedly — the backend recalculates from fresh data.
   */
  quote(payload: QuoteOrderPayload): Observable<ApiSuccessResponse<QuoteResponse>> {
    return this.http.post<ApiSuccessResponse<QuoteResponse>>(`${this.endpoint}/quote`, payload);
  }

  /**
   * Create an order. Uses multipart because of the optional payment proof.
   */
  create(payload: CreateOrderPayload): Observable<ApiSuccessResponse<CreateOrderResponse>> {
    const form = new FormData();

    form.append('shippingAddress', JSON.stringify(payload.shippingAddress));
    form.append('paymentMethod', payload.paymentMethod);
    form.append('amountDueNow', String(payload.amountDueNow));

    if (payload.couponCode) form.append('couponCode', payload.couponCode);
    if (payload.notes) form.append('notes', payload.notes);
    if (payload.paymentProofMethod) {
      form.append('paymentProofMethod', payload.paymentProofMethod);
    }
    if (payload.paymentProof) {
      form.append('paymentProof', payload.paymentProof, payload.paymentProof.name);
    }

    return this.http.post<ApiSuccessResponse<CreateOrderResponse>>(this.endpoint, form);
  }

  list(query: OrderQuery = {}): Observable<ApiSuccessResponse<Order[]>> {
    return this.http.get<ApiSuccessResponse<Order[]>>(this.endpoint, {
      params: this.buildParams(query),
    });
  }

  getById(id: ObjectId): Observable<ApiSuccessResponse<Order>> {
    return this.http.get<ApiSuccessResponse<Order>>(`${this.endpoint}/${id}`);
  }

  getTracking(id: ObjectId): Observable<ApiSuccessResponse<OrderTracking>> {
    return this.http.get<ApiSuccessResponse<OrderTracking>>(`${this.endpoint}/${id}/tracking`);
  }

  /**
   * Fetch the payment proof image as a blob.
   * Needed because <img src> can't carry the Authorization header.
   */
  getPaymentProofBlob(id: ObjectId): Observable<Blob> {
    return this.http.get(`${this.endpoint}/${id}/payment-proof`, {
      responseType: 'blob',
    });
  }

  updateStatus(
    id: ObjectId,
    payload: UpdateOrderStatusPayload,
  ): Observable<ApiSuccessResponse<Order>> {
    return this.http.patch<ApiSuccessResponse<Order>>(`${this.endpoint}/${id}/status`, payload);
  }

  private buildParams(query: OrderQuery): HttpParams {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    if (query.page != null) params = params.set('page', String(query.page));
    if (query.limit != null) params = params.set('limit', String(query.limit));
    return params;
  }
}
