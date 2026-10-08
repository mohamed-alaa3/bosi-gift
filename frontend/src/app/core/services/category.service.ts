import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, Category, CategoryPayload, ObjectId } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/categories`;

  list(includeInactive = false): Observable<ApiSuccessResponse<Category[]>> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<ApiSuccessResponse<Category[]>>(this.endpoint, { params });
  }

  getById(id: ObjectId): Observable<ApiSuccessResponse<Category>> {
    return this.http.get<ApiSuccessResponse<Category>>(`${this.endpoint}/${id}`);
  }

  create(payload: CategoryPayload, image?: File): Observable<ApiSuccessResponse<Category>> {
    const form = this.toFormData(payload, image);
    return this.http.post<ApiSuccessResponse<Category>>(this.endpoint, form);
  }

  update(id: ObjectId, payload: Partial<CategoryPayload>, image?: File): Observable<ApiSuccessResponse<Category>> {
    const form = this.toFormData(payload, image);
    return this.http.patch<ApiSuccessResponse<Category>>(`${this.endpoint}/${id}`, form);
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }

  /**
   * Serialize payload to FormData the backend expects.
   * Nested fields use the `key[subkey]` convention (e.g. name[en]).
   */
  private toFormData(payload: Partial<CategoryPayload>, image?: File): FormData {
    const form = new FormData();

    if (payload.name) {
      if (payload.name.en) form.append('name[en]', payload.name.en);
      if (payload.name.ar) form.append('name[ar]', payload.name.ar);
    }

    if (payload.description) {
      if (payload.description.en) form.append('description[en]', payload.description.en);
      if (payload.description.ar) form.append('description[ar]', payload.description.ar);
    }

    if (payload.isActive !== undefined) form.append('isActive', String(payload.isActive));
    if (payload.sortOrder !== undefined) form.append('sortOrder', String(payload.sortOrder));

    if (image) form.append('image', image);

    return form;
  }
}