import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiSuccessResponse, LocalizedText, ObjectId } from '../models';

export type StatsRange = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface StatsOverview {
  range: { from: string; to: string };
  revenue: { total: number; previousTotal: number; growthPercent: number };
  orders: { total: number; previousTotal: number; growthPercent: number };
  customers: {
    newInRange: number;
    previousNewInRange: number;
    growthPercent: number;
    total: number;
  };
  conversionRate: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: ObjectId;
  name: LocalizedText;
  image: string;
  totalRevenue: number;
  totalSold: number;
}

export interface LowStockProduct {
  _id: ObjectId;
  name: LocalizedText;
  slug: string;
  images: string[];
  stock: number;
  sku: string;
}

export interface RecentOrder {
  _id: ObjectId;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  user: ObjectId | { _id: ObjectId; name: string; email: string };
  shippingAddress?: { fullName: string };
}

@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.baseUrl}/admin`;

  getOverview(range: StatsRange = '30d', from?: string, to?: string): Observable<ApiSuccessResponse<StatsOverview>> {
    return this.http.get<ApiSuccessResponse<StatsOverview>>(
      `${this.endpoint}/stats/overview`,
      { params: this.rangeParams(range, from, to) }
    );
  }

  getRevenueSeries(range: StatsRange = '30d', from?: string, to?: string): Observable<ApiSuccessResponse<RevenuePoint[]>> {
    return this.http.get<ApiSuccessResponse<RevenuePoint[]>>(
      `${this.endpoint}/stats/revenue`,
      { params: this.rangeParams(range, from, to) }
    );
  }

  getLowStock(threshold = 5, limit = 20): Observable<ApiSuccessResponse<LowStockProduct[]>> {
    const params = new HttpParams().set('threshold', String(threshold)).set('limit', String(limit));
    return this.http.get<ApiSuccessResponse<LowStockProduct[]>>(
      `${this.endpoint}/products/low-stock`,
      { params }
    );
  }

  getTopProducts(range: StatsRange = '30d', limit = 5): Observable<ApiSuccessResponse<TopProduct[]>> {
    const params = new HttpParams().set('range', range).set('limit', String(limit));
    return this.http.get<ApiSuccessResponse<TopProduct[]>>(
      `${this.endpoint}/products/top`,
      { params }
    );
  }

  getRecentOrders(limit = 5): Observable<ApiSuccessResponse<RecentOrder[]>> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<ApiSuccessResponse<RecentOrder[]>>(
      `${this.endpoint}/orders/recent`,
      { params }
    );
  }

  private rangeParams(range: StatsRange, from?: string, to?: string): HttpParams {
    let params = new HttpParams().set('range', range);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return params;
  }
}