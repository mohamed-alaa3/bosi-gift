import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, ObjectId } from '../models';

export type ContactStatus = 'new' | 'read' | 'replied';

export interface ContactMessage {
  _id: ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/contact`;

  send(payload: ContactPayload): Observable<ApiSuccessResponse<{ _id: ObjectId; message: string }>> {
    return this.http.post<ApiSuccessResponse<{ _id: ObjectId; message: string }>>(
      this.endpoint,
      payload
    );
  }

  list(status?: ContactStatus, page = 1, limit = 20): Observable<ApiSuccessResponse<ContactMessage[]>> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (status) params = params.set('status', status);
    return this.http.get<ApiSuccessResponse<ContactMessage[]>>(this.endpoint, { params });
  }

  getById(id: ObjectId): Observable<ApiSuccessResponse<ContactMessage>> {
    return this.http.get<ApiSuccessResponse<ContactMessage>>(`${this.endpoint}/${id}`);
  }

  updateStatus(id: ObjectId, status: ContactStatus): Observable<ApiSuccessResponse<ContactMessage>> {
    return this.http.patch<ApiSuccessResponse<ContactMessage>>(`${this.endpoint}/${id}`, { status });
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }
}