import { ObjectId } from './api-response.model';

export interface Address {
  _id: ObjectId;
  user: ObjectId;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  street: string;
  building: string;
  apartment: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressPayload {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  area?: string;
  building?: string;
  apartment?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export type UpdateAddressPayload = Partial<AddressPayload>;

/**
 * Snapshot of an address inside an order.
 * Mirrors the backend's `addressSnapshotSchema`.
 */
export interface AddressSnapshot {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  street: string;
  building: string;
  apartment: string;
  postalCode: string;
  /** Governorate key selected at checkout (Phase 3). */
  governorate?: string;
  /** Governorate display name snapshot. */
  governorateName?: { en: string; ar: string };
}