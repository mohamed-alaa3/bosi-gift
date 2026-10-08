import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import {
  AdminReview,
  AdminReviewPayload,
  ApiSuccessResponse,
  ObjectId,
  ReviewStatus,
  ReviewType,
} from '../models';

export interface AdminReviewQuery {
  type?: ReviewType;
  status?: ReviewStatus;
  q?: string;
  page?: number;
  limit?: number;
}

/** Admin review moderation + manual testimonials (/api/admin/reviews). */
@Injectable({ providedIn: 'root' })
export class AdminReviewService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/admin/reviews`;

  list(query: AdminReviewQuery = {}): Observable<ApiSuccessResponse<AdminReview[]>> {
    let params = new HttpParams();
    if (query.type) params = params.set('type', query.type);
    if (query.status) params = params.set('status', query.status);
    if (query.q) params = params.set('q', query.q);
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    return this.http.get<ApiSuccessResponse<AdminReview[]>>(this.endpoint, { params });
  }

  create(payload: AdminReviewPayload): Observable<ApiSuccessResponse<AdminReview>> {
    return this.http.post<ApiSuccessResponse<AdminReview>>(this.endpoint, payload);
  }

  setStatus(id: ObjectId, status: ReviewStatus): Observable<ApiSuccessResponse<AdminReview>> {
    return this.http.patch<ApiSuccessResponse<AdminReview>>(`${this.endpoint}/${id}`, { status });
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }
}
