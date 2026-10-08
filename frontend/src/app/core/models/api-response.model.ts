/**
 * Standard response envelopes returned by the Habiba backend.
 * Every successful response has `success: true` and a `data` payload.
 * List endpoints also include `meta` for pagination.
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiPaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ApiFieldError[];
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Common types used across models.
 */

// Localized text — the pattern the backend uses for translatable fields.
export interface LocalizedText {
  en: string;
  ar: string;
}

// MongoDB-style ObjectId as a string on the client.
export type ObjectId = string;