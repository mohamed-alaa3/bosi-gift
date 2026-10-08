import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import {
  ApiSuccessResponse,
  ObjectId,
  Product,
  ProductPayload,
  ProductQuery,
  Review,
  ReviewPayload,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/products`;

  list(query: ProductQuery = {}): Observable<ApiSuccessResponse<Product[]>> {
    return this.http.get<ApiSuccessResponse<Product[]>>(this.endpoint, {
      params: this.buildParams(query),
    });
  }

  getByIdOrSlug(idOrSlug: string): Observable<ApiSuccessResponse<Product>> {
    return this.http.get<ApiSuccessResponse<Product>>(`${this.endpoint}/${idOrSlug}`);
  }

  getRelated(id: ObjectId, limit = 4): Observable<ApiSuccessResponse<Product[]>> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<ApiSuccessResponse<Product[]>>(`${this.endpoint}/${id}/related`, { params });
  }

  create(payload: ProductPayload, images: File[]): Observable<ApiSuccessResponse<Product>> {
    return this.http.post<ApiSuccessResponse<Product>>(this.endpoint, this.toFormData(payload, images));
  }

  update(id: ObjectId, payload: Partial<ProductPayload>, images?: File[]): Observable<ApiSuccessResponse<Product>> {
    return this.http.patch<ApiSuccessResponse<Product>>(
      `${this.endpoint}/${id}`,
      this.toFormData(payload, images ?? [])
    );
  }

  delete(id: ObjectId): Observable<ApiSuccessResponse<{ _id: ObjectId; isActive: boolean }>> {
    return this.http.delete<ApiSuccessResponse<{ _id: ObjectId; isActive: boolean }>>(
      `${this.endpoint}/${id}`
    );
  }

  // --- Reviews nested under a product ---

  listReviews(productId: ObjectId, page = 1, limit = 10): Observable<ApiSuccessResponse<Review[]>> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<ApiSuccessResponse<Review[]>>(
      `${this.endpoint}/${productId}/reviews`,
      { params }
    );
  }

  createReview(productId: ObjectId, payload: ReviewPayload): Observable<ApiSuccessResponse<Review>> {
    return this.http.post<ApiSuccessResponse<Review>>(
      `${this.endpoint}/${productId}/reviews`,
      payload
    );
  }

  // --- Helpers ---

  private buildParams(query: ProductQuery): HttpParams {
    let params = new HttpParams();

    if (query.q) params = params.set('q', query.q);
    if (query.category) params = params.set('category', query.category);
    if (query.minPrice != null) params = params.set('minPrice', String(query.minPrice));
    if (query.maxPrice != null) params = params.set('maxPrice', String(query.maxPrice));
    if (query.rating != null) params = params.set('rating', String(query.rating));
    if (query.inStock != null) params = params.set('inStock', String(query.inStock));
    if (query.featured != null) params = params.set('featured', String(query.featured));
    if (query.recipient) params = params.set('recipient', query.recipient);
    if (query.occasion) params = params.set('occasion', query.occasion);
    if (query.trending) params = params.set('trending', 'true');
    if (query.dailyOffer) params = params.set('dailyOffer', 'true');
    if (query.readyBox) params = params.set('readyBox', 'true');
    if (query.onSale) params = params.set('onSale', 'true');
    if (query.sort) params = params.set('sort', query.sort);
    if (query.page != null) params = params.set('page', String(query.page));
    if (query.limit != null) params = params.set('limit', String(query.limit));
    if (query.includeInactive != null) params = params.set('includeInactive', String(query.includeInactive));

    return params;
  }

  private appendList(form: FormData, key: string, values: string[]): void {
    if (values.length === 0) {
      form.append(key, '');
      return;
    }
    for (const v of values) form.append(key, v);
  }

  private toFormData(payload: Partial<ProductPayload>, images: File[]): FormData {
    const form = new FormData();

    if (payload.name) {
      if (payload.name.en) form.append('name[en]', payload.name.en);
      if (payload.name.ar) form.append('name[ar]', payload.name.ar);
    }

    if (payload.description) {
      if (payload.description.en) form.append('description[en]', payload.description.en);
      if (payload.description.ar) form.append('description[ar]', payload.description.ar);
    }

    if (payload.shortDescription) {
      if (payload.shortDescription.en) form.append('shortDescription[en]', payload.shortDescription.en);
      if (payload.shortDescription.ar) form.append('shortDescription[ar]', payload.shortDescription.ar);
    }

    if (payload.price != null) form.append('price', String(payload.price));
    if (payload.discountPrice != null) form.append('discountPrice', String(payload.discountPrice));
    if (payload.category) form.append('category', payload.category);
    if (payload.stock != null) form.append('stock', String(payload.stock));
    if (payload.sku) form.append('sku', payload.sku);
    if (payload.isFeatured != null) form.append('isFeatured', String(payload.isFeatured));
    if (payload.isActive != null) form.append('isActive', String(payload.isActive));

    // Gift discovery metadata. Lists: repeated field; empty list → '' (clears it).
    if (payload.recipients) this.appendList(form, 'recipients', payload.recipients);
    if (payload.occasions) this.appendList(form, 'occasions', payload.occasions);
    if (payload.isReadyGiftBox != null) form.append('isReadyGiftBox', String(payload.isReadyGiftBox));
    if (payload.isDailyOffer != null) form.append('isDailyOffer', String(payload.isDailyOffer));
    if (payload.dailyOfferStart !== undefined) form.append('dailyOfferStart', payload.dailyOfferStart ?? '');
    if (payload.dailyOfferEnd !== undefined) form.append('dailyOfferEnd', payload.dailyOfferEnd ?? '');

    if (payload.options && payload.options.length > 0) {
      form.append('options', JSON.stringify(payload.options));
    }

    for (const file of images) {
      form.append('images', file);
    }

    return form;
  }
}