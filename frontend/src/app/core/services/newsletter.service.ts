import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, ObjectId } from '../models';

export interface NewsletterSubscriber {
  _id: ObjectId;
  email: string;
  subscribedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribeResponse {
  email: string;
  isActive: boolean;
  subscribedAt: string;
}

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/newsletter`;

  subscribe(email: string): Observable<ApiSuccessResponse<SubscribeResponse>> {
    return this.http.post<ApiSuccessResponse<SubscribeResponse>>(
      `${this.endpoint}/subscribe`,
      { email }
    );
  }

  list(isActive?: boolean, page = 1, limit = 50): Observable<ApiSuccessResponse<NewsletterSubscriber[]>> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (isActive !== undefined) params = params.set('isActive', String(isActive));
    return this.http.get<ApiSuccessResponse<NewsletterSubscriber[]>>(this.endpoint, { params });
  }

  updateStatus(id: ObjectId, isActive: boolean): Observable<ApiSuccessResponse<NewsletterSubscriber>> {
    return this.http.patch<ApiSuccessResponse<NewsletterSubscriber>>(`${this.endpoint}/${id}`, {
      isActive,
    });
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }
}