import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/tokens/api-base-url.token';
import { ApiSuccessResponse } from '../../core/models';
import { GiftBox, Ribbon, WrapStyle } from './gift-builder.types';

@Injectable({ providedIn: 'root' })
export class GiftBuilderService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);

  // ---------- Gift Boxes ----------
  listBoxes(includeInactive = false): Observable<ApiSuccessResponse<GiftBox[]>> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<ApiSuccessResponse<GiftBox[]>>(`${this.baseUrl}/gift-boxes`, { params });
  }

  // ---------- Wrap Styles ----------
  listWrapStyles(includeInactive = false): Observable<ApiSuccessResponse<WrapStyle[]>> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<ApiSuccessResponse<WrapStyle[]>>(`${this.baseUrl}/wrap-styles`, {
      params,
    });
  }

  // ---------- Ribbons ----------
  listRibbons(includeInactive = false): Observable<ApiSuccessResponse<Ribbon[]>> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<ApiSuccessResponse<Ribbon[]>>(`${this.baseUrl}/ribbons`, { params });
  }
}
