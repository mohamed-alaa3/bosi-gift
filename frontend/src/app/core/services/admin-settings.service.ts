import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { AdminSettings, ApiSuccessResponse, UpdateSettingsPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/admin/settings`;

  get(): Observable<ApiSuccessResponse<AdminSettings>> {
    return this.http.get<ApiSuccessResponse<AdminSettings>>(this.endpoint);
  }

  /** Partial update — only the parts present in the payload are changed. */
  update(payload: UpdateSettingsPayload): Observable<ApiSuccessResponse<AdminSettings>> {
    return this.http.patch<ApiSuccessResponse<AdminSettings>>(this.endpoint, payload);
  }
}
