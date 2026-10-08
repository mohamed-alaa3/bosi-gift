import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import {
  Address,
  AddressPayload,
  ApiSuccessResponse,
  ObjectId,
  UpdateAddressPayload,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/addresses`;

  list(): Observable<ApiSuccessResponse<Address[]>> {
    return this.http.get<ApiSuccessResponse<Address[]>>(this.endpoint);
  }

  getById(id: ObjectId): Observable<ApiSuccessResponse<Address>> {
    return this.http.get<ApiSuccessResponse<Address>>(`${this.endpoint}/${id}`);
  }

  create(payload: AddressPayload): Observable<ApiSuccessResponse<Address>> {
    return this.http.post<ApiSuccessResponse<Address>>(this.endpoint, payload);
  }

  update(id: ObjectId, payload: UpdateAddressPayload): Observable<ApiSuccessResponse<Address>> {
    return this.http.patch<ApiSuccessResponse<Address>>(`${this.endpoint}/${id}`, payload);
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId }>>(`${this.endpoint}/${id}`);
  }

  setDefault(id: ObjectId): Observable<ApiSuccessResponse<Address>> {
    return this.http.patch<ApiSuccessResponse<Address>>(`${this.endpoint}/${id}/default`, {});
  }
}