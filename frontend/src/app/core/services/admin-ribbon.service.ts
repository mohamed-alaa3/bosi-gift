import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, LocalizedText, ObjectId } from '../models';

export interface AdminRibbon {
  _id: ObjectId;
  name: LocalizedText;
  slug: string;
  color: string;
  image: string;
  imageUrl?: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRibbonPayload {
  name: LocalizedText;
  color: string;
  price: number;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminRibbonService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/ribbons`;

  list(includeInactive = false): Observable<ApiSuccessResponse<AdminRibbon[]>> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<ApiSuccessResponse<AdminRibbon[]>>(this.endpoint, { params });
  }

  getById(id: ObjectId): Observable<ApiSuccessResponse<AdminRibbon>> {
    return this.http.get<ApiSuccessResponse<AdminRibbon>>(`${this.endpoint}/${id}`);
  }

  create(payload: AdminRibbonPayload, image?: File): Observable<ApiSuccessResponse<AdminRibbon>> {
    return this.http.post<ApiSuccessResponse<AdminRibbon>>(
      this.endpoint,
      this.toFormData(payload, image),
    );
  }

  update(
    id: ObjectId,
    payload: Partial<AdminRibbonPayload>,
    image?: File,
  ): Observable<ApiSuccessResponse<AdminRibbon>> {
    return this.http.patch<ApiSuccessResponse<AdminRibbon>>(
      `${this.endpoint}/${id}`,
      this.toFormData(payload, image),
    );
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }

  private toFormData(payload: Partial<AdminRibbonPayload>, image?: File): FormData {
    const form = new FormData();

    if (payload.name) {
      if (payload.name.en) form.append('name[en]', payload.name.en);
      if (payload.name.ar) form.append('name[ar]', payload.name.ar);
    }

    if (payload.color) form.append('color', payload.color);
    if (payload.price !== undefined) form.append('price', String(payload.price));
    if (payload.isActive !== undefined) form.append('isActive', String(payload.isActive));
    if (payload.sortOrder !== undefined) form.append('sortOrder', String(payload.sortOrder));

    if (image) form.append('image', image);

    return form;
  }
}
