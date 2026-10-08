import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, LocalizedText, ObjectId } from '../models';

export interface AdminWrapStyle {
  _id: ObjectId;
  name: LocalizedText;
  slug: string;
  description: LocalizedText;
  image: string;
  imageUrl?: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWrapStylePayload {
  name: LocalizedText;
  description?: LocalizedText;
  price: number;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminWrapStyleService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/wrap-styles`;

  list(includeInactive = false): Observable<ApiSuccessResponse<AdminWrapStyle[]>> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<ApiSuccessResponse<AdminWrapStyle[]>>(this.endpoint, { params });
  }

  getById(id: ObjectId): Observable<ApiSuccessResponse<AdminWrapStyle>> {
    return this.http.get<ApiSuccessResponse<AdminWrapStyle>>(`${this.endpoint}/${id}`);
  }

  create(
    payload: AdminWrapStylePayload,
    image: File,
  ): Observable<ApiSuccessResponse<AdminWrapStyle>> {
    return this.http.post<ApiSuccessResponse<AdminWrapStyle>>(
      this.endpoint,
      this.toFormData(payload, image),
    );
  }

  update(
    id: ObjectId,
    payload: Partial<AdminWrapStylePayload>,
    image?: File,
  ): Observable<ApiSuccessResponse<AdminWrapStyle>> {
    return this.http.patch<ApiSuccessResponse<AdminWrapStyle>>(
      `${this.endpoint}/${id}`,
      this.toFormData(payload, image),
    );
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }

  private toFormData(payload: Partial<AdminWrapStylePayload>, image?: File): FormData {
    const form = new FormData();

    if (payload.name) {
      if (payload.name.en) form.append('name[en]', payload.name.en);
      if (payload.name.ar) form.append('name[ar]', payload.name.ar);
    }

    if (payload.description) {
      if (payload.description.en) form.append('description[en]', payload.description.en);
      if (payload.description.ar) form.append('description[ar]', payload.description.ar);
    }

    if (payload.price !== undefined) form.append('price', String(payload.price));
    if (payload.isActive !== undefined) form.append('isActive', String(payload.isActive));
    if (payload.sortOrder !== undefined) form.append('sortOrder', String(payload.sortOrder));

    if (image) form.append('image', image);

    return form;
  }
}
