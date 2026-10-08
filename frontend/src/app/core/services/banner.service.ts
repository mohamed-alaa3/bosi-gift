import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import {
  ApiSuccessResponse,
  Banner,
  BannerPayload,
  BannerPosition,
  ObjectId,
} from '../models';

@Injectable({ providedIn: 'root' })
export class BannerService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/banners`;

  list(position?: BannerPosition, includeInactive = false): Observable<ApiSuccessResponse<Banner[]>> {
    let params = new HttpParams();
    if (position) params = params.set('position', position);
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<ApiSuccessResponse<Banner[]>>(this.endpoint, { params });
  }

  getById(id: ObjectId): Observable<ApiSuccessResponse<Banner>> {
    return this.http.get<ApiSuccessResponse<Banner>>(`${this.endpoint}/${id}`);
  }

  create(payload: BannerPayload, image: File): Observable<ApiSuccessResponse<Banner>> {
    return this.http.post<ApiSuccessResponse<Banner>>(this.endpoint, this.toFormData(payload, image));
  }

  update(id: ObjectId, payload: Partial<BannerPayload>, image?: File): Observable<ApiSuccessResponse<Banner>> {
    return this.http.patch<ApiSuccessResponse<Banner>>(
      `${this.endpoint}/${id}`,
      this.toFormData(payload, image)
    );
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }

  private toFormData(payload: Partial<BannerPayload>, image?: File): FormData {
    const form = new FormData();

    if (payload.title) {
      if (payload.title.en) form.append('title[en]', payload.title.en);
      if (payload.title.ar) form.append('title[ar]', payload.title.ar);
    }

    if (payload.subtitle) {
      if (payload.subtitle.en) form.append('subtitle[en]', payload.subtitle.en);
      if (payload.subtitle.ar) form.append('subtitle[ar]', payload.subtitle.ar);
    }

    if (payload.buttonText) {
      if (payload.buttonText.en) form.append('buttonText[en]', payload.buttonText.en);
      if (payload.buttonText.ar) form.append('buttonText[ar]', payload.buttonText.ar);
    }

    if (payload.buttonLink !== undefined) form.append('buttonLink', payload.buttonLink);
    if (payload.position) form.append('position', payload.position);
    if (payload.isActive !== undefined) form.append('isActive', String(payload.isActive));
    if (payload.sortOrder !== undefined) form.append('sortOrder', String(payload.sortOrder));

    if (image) form.append('image', image);

    return form;
  }
}