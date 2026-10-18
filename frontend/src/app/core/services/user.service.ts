import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { AdminUser, ApiSuccessResponse, ObjectId } from '../models';

export interface AdminUserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'suspended';
}

/**
 * Admin-facing user operations (all endpoints are admin-only on the server).
 * The authenticated user's own profile lives in AuthService.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/admin/users`;

  list(query: AdminUserListQuery = {}): Observable<ApiSuccessResponse<AdminUser[]>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status && query.status !== 'all') params = params.set('status', query.status);
    return this.http.get<ApiSuccessResponse<AdminUser[]>>(this.endpoint, { params });
  }

  setStatus(id: ObjectId, isActive: boolean): Observable<ApiSuccessResponse<AdminUser>> {
    return this.http.patch<ApiSuccessResponse<AdminUser>>(`${this.endpoint}/${id}/status`, {
      isActive,
    });
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }
}
