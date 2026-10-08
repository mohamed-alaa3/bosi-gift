import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import {
  ApiSuccessResponse,
  FeaturedReview,
  ObjectId,
  OrderReviewState,
  OwnReview,
  Review,
  ServiceReviewPayload,
  UpdateReviewPayload,
} from '../models';

/**
 * Standalone review endpoints.
 * Note: create + list-by-product are also available from ProductService
 * (nested under /products/:id/reviews). This service exists for flexibility.
 */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/reviews`;

  /** Latest real, approved reviews with a written comment (public). */
  listFeatured(limit = 6): Observable<ApiSuccessResponse<FeaturedReview[]>> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<ApiSuccessResponse<FeaturedReview[]>>(`${this.endpoint}/featured`, {
      params,
    });
  }

  /** What the customer can review for one of THEIR orders (auth). */
  orderState(orderId: ObjectId): Observable<ApiSuccessResponse<OrderReviewState>> {
    return this.http.get<ApiSuccessResponse<OrderReviewState>>(`${this.endpoint}/order/${orderId}`);
  }

  /** Product review — the backend verifies a delivered order contains the product. */
  createProductReview(
    productId: ObjectId,
    payload: { rating: number; comment: string },
  ): Observable<ApiSuccessResponse<OwnReview>> {
    return this.http.post<ApiSuccessResponse<OwnReview>>(
      `${this.baseUrl}/products/${productId}/reviews`,
      payload,
    );
  }

  createServiceReview(payload: ServiceReviewPayload): Observable<ApiSuccessResponse<OwnReview>> {
    return this.http.post<ApiSuccessResponse<OwnReview>>(`${this.endpoint}/service`, payload);
  }

  /** Edit your own review (it returns to moderation). */
  update(id: ObjectId, payload: UpdateReviewPayload): Observable<ApiSuccessResponse<OwnReview>> {
    return this.http.patch<ApiSuccessResponse<OwnReview>>(`${this.endpoint}/${id}`, payload);
  }

  listByProduct(productId: ObjectId, page = 1, limit = 10): Observable<ApiSuccessResponse<Review[]>> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<ApiSuccessResponse<Review[]>>(
      `${this.baseUrl}/products/${productId}/reviews`,
      { params }
    );
  }
}