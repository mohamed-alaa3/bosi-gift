import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, Coupon, CouponDetail, CouponPayload, ObjectId } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminCouponService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/admin/coupons`;

  list(query: { q?: string; isActive?: boolean } = {}): Observable<ApiSuccessResponse<Coupon[]>> {
    let params = new HttpParams();
    if (query.q) params = params.set('q', query.q);
    if (query.isActive !== undefined) params = params.set('isActive', String(query.isActive));
    return this.http.get<ApiSuccessResponse<Coupon[]>>(this.endpoint, { params });
  }

  /** Returns categories/products populated with their names (for the edit form). */
  getById(id: ObjectId): Observable<ApiSuccessResponse<CouponDetail>> {
    return this.http.get<ApiSuccessResponse<CouponDetail>>(`${this.endpoint}/${id}`);
  }

  create(payload: CouponPayload): Observable<ApiSuccessResponse<Coupon>> {
    return this.http.post<ApiSuccessResponse<Coupon>>(this.endpoint, payload);
  }

  update(id: ObjectId, payload: Partial<CouponPayload>): Observable<ApiSuccessResponse<Coupon>> {
    return this.http.patch<ApiSuccessResponse<Coupon>>(`${this.endpoint}/${id}`, payload);
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }
}
