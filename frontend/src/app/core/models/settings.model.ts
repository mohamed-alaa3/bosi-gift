import { LocalizedText } from './api-response.model';

export type GovernorateRegion = 'major' | 'delta' | 'upper' | 'frontier';

/** Display order of the regions in the admin Shipping tab. */
export const GOVERNORATE_REGIONS: readonly GovernorateRegion[] = [
  'major',
  'delta',
  'upper',
  'frontier',
];

// ---------- Public (GET /settings/public) ----------

export interface PublicGovernorate {
  /** Stable id, e.g. "cairo". */
  key: string;
  name: LocalizedText;
  /** Shipping fee in EGP. 0 = free shipping. */
  fee: number;
  /** false = "we don't ship here right now" (still listed so checkout can say so). */
  enabled: boolean;
}

export interface PublicSettings {
  governorates: PublicGovernorate[];
  /** Amount (EGP) paid now with the deposit option. */
  depositAmount: number;
  /** % off the products when paying in full in advance. */
  fullPaymentDiscountPercent: number;
  /** Empty string = method not offered. */
  vodafoneCashNumber: string;
  instapayNumber: string;
}

// ---------- Admin (GET/PATCH /admin/settings) ----------

export interface AdminGovernorate extends PublicGovernorate {
  region: GovernorateRegion;
}

export interface PaymentSettings {
  depositAmount: number;
  fullPaymentDiscountPercent: number;
  vodafoneCashNumber: string;
  instapayNumber: string;
}

export interface StoreSettings {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface AdminSettings {
  governorates: AdminGovernorate[];
  payment: PaymentSettings;
  store: StoreSettings;
  updatedAt: string | null;
}

export interface GovernorateUpdate {
  key: string;
  fee?: number;
  enabled?: boolean;
}

/** Every part is optional: only what is sent is changed. */
export interface UpdateSettingsPayload {
  governorates?: GovernorateUpdate[];
  payment?: Partial<PaymentSettings>;
  store?: Partial<StoreSettings>;
}
