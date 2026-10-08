import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, LocalizedText, ObjectId } from '../models';

export interface AdminGiftBox {
  _id: ObjectId;
  name: LocalizedText;
  slug: string;
  description: LocalizedText;
  image: string;
  imageUrl?: string;
  basePrice: number;
  capacity: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGiftBoxPayload {
  name: LocalizedText;
  description?: LocalizedText;
  basePrice: number;
  capacity: number;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminGiftBoxService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/gift-boxes`;

  list(includeInactive = false): Observable<ApiSuccessResponse<AdminGiftBox[]>> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<ApiSuccessResponse<AdminGiftBox[]>>(this.endpoint, { params });
  }

  getById(id: ObjectId): Observable<ApiSuccessResponse<AdminGiftBox>> {
    return this.http.get<ApiSuccessResponse<AdminGiftBox>>(`${this.endpoint}/${id}`);
  }

  create(payload: AdminGiftBoxPayload, image: File): Observable<ApiSuccessResponse<AdminGiftBox>> {
    return this.http.post<ApiSuccessResponse<AdminGiftBox>>(
      this.endpoint,
      this.toFormData(payload, image),
    );
  }

  update(
    id: ObjectId,
    payload: Partial<AdminGiftBoxPayload>,
    image?: File,
  ): Observable<ApiSuccessResponse<AdminGiftBox>> {
    return this.http.patch<ApiSuccessResponse<AdminGiftBox>>(
      `${this.endpoint}/${id}`,
      this.toFormData(payload, image),
    );
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }

  private toFormData(payload: Partial<AdminGiftBoxPayload>, image?: File): FormData {
    const form = new FormData();

    if (payload.name) {
      if (payload.name.en) form.append('name[en]', payload.name.en);
      if (payload.name.ar) form.append('name[ar]', payload.name.ar);
    }

    if (payload.description) {
      if (payload.description.en) form.append('description[en]', payload.description.en);
      if (payload.description.ar) form.append('description[ar]', payload.description.ar);
    }

    if (payload.basePrice !== undefined) form.append('basePrice', String(payload.basePrice));
    if (payload.capacity !== undefined) form.append('capacity', String(payload.capacity));
    if (payload.isActive !== undefined) form.append('isActive', String(payload.isActive));
    if (payload.sortOrder !== undefined) form.append('sortOrder', String(payload.sortOrder));

    if (image) form.append('image', image);

    return form;
  }
}
