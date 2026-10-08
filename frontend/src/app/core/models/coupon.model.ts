import { LocalizedText, ObjectId } from './api-response.model';

export type CouponType = 'percentage' | 'fixed';

/**
 * Machine-readable reasons returned by POST /coupons/validate.
 * The UI maps each one to an i18n key: `coupon.errors.<REASON>`.
 */
export const COUPON_INVALID_REASONS = [
  'NOT_FOUND',
  'INACTIVE',
  'NOT_STARTED',
  'EXPIRED',
  'USAGE_LIMIT_REACHED',
  'USER_LIMIT_REACHED',
  'MIN_ORDER_NOT_MET',
  'NOT_APPLICABLE',
  'EMPTY_CART',
] as const;

export type CouponInvalidReason = (typeof COUPON_INVALID_REASONS)[number];

export function isCouponInvalidReason(value: unknown): value is CouponInvalidReason {
  return (
    typeof value === 'string' && (COUPON_INVALID_REASONS as readonly string[]).includes(value)
  );
}

// ---------- Storefront ----------

/** Response of POST /coupons/validate (always HTTP 200 for business-rule failures). */
export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discount: number;
  reason: CouponInvalidReason | null;
  message: string;
  type: CouponType | null;
  value: number | null;
  minOrderAmount: number | null;
}

/** Coupon currently applied to the customer's cart (kept in CouponStore). */
export interface AppliedCoupon {
  code: string;
  discount: number;
  type: CouponType | null;
  value: number | null;
}

// ---------- Admin ----------

export interface Coupon {
  _id: ObjectId;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  applicableCategories: ObjectId[];
  applicableProducts: ObjectId[];
  createdAt: string;
  updatedAt: string;
}

/** Category / product reference as returned (populated) by GET /admin/coupons/:id. */
export interface CouponTargetRef {
  _id: ObjectId;
  name: LocalizedText;
}

export interface CouponDetail extends Omit<Coupon, 'applicableCategories' | 'applicableProducts'> {
  applicableCategories: CouponTargetRef[];
  applicableProducts: CouponTargetRef[];
}

export interface CouponPayload {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  perUserLimit: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  applicableCategories: ObjectId[];
  applicableProducts: ObjectId[];
}
