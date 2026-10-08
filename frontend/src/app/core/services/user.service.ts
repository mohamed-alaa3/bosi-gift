import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, User } from '../models';

/**
 * Admin-facing user operations.
 * The authenticated user's own profile lives in AuthService.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/users`;

  // Reserved for future admin user management endpoints.
  // Placeholder so the file exists and follows the pattern.
  getById(id: string): Observable<ApiSuccessResponse<User>> {
    return this.http.get<ApiSuccessResponse<User>>(`${this.endpoint}/${id}`);
  }
}