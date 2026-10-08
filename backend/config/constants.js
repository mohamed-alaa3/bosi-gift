/**
 * Central place for shared constants across the app.
 * Controllers, validators, and services should import from here,
 * not from models, to keep a single source of truth.
 */

// --- User roles ---
const ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
};

const ROLE_VALUES = Object.values(ROLES);

// --- Review statuses ---
const REVIEW_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const REVIEW_STATUS_VALUES = Object.values(REVIEW_STATUSES);

// --- Order statuses ---
const ORDER_STATUSES = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

const ORDER_STATUS_VALUES = Object.values(ORDER_STATUSES);

/**
 * Allowed order-status transitions.
 * - Linear, no skipping, no going back.
 * - `cancelled` and `delivered` are terminal.
 * - Cancelling from `processing` requires `confirm: true` (enforced in the service).
 */
const ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

// --- Payment statuses ---
const PAYMENT_STATUSES = {
  PENDING: "pending",
  PARTIAL: "partial",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUSES);

// --- Payment methods ---
const PAYMENT_METHODS = {
  COD: "cod", // legacy — cash on delivery only
  DEPOSIT: "deposit", // pay a deposit now, rest on delivery
  FULL: "full", // pay in full in advance (with discount)
};

const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHODS);

// --- Payment proof methods ---
const PAYMENT_PROOF_METHODS = {
  VODAFONE: "vodafone",
  INSTAPAY: "instapay",
};

const PAYMENT_PROOF_METHOD_VALUES = Object.values(PAYMENT_PROOF_METHODS);

// --- Coupons (Feature 2) ---
const COUPON_TYPES = {
  PERCENTAGE: "percentage",
  FIXED: "fixed",
};

const COUPON_TYPE_VALUES = Object.values(COUPON_TYPES);

/**
 * Machine-readable reasons the backend returns when a coupon is rejected.
 * Kept as plain strings so the frontend can map them to i18n keys.
 */
const COUPON_INVALID_REASONS = {
  NOT_FOUND: "NOT_FOUND",
  INACTIVE: "INACTIVE",
  NOT_YET_VALID: "NOT_YET_VALID",
  EXPIRED: "EXPIRED",
  USAGE_LIMIT_REACHED: "USAGE_LIMIT_REACHED",
  PER_USER_LIMIT_REACHED: "PER_USER_LIMIT_REACHED",
  MIN_ORDER_NOT_MET: "MIN_ORDER_NOT_MET",
  NO_APPLICABLE_ITEMS: "NO_APPLICABLE_ITEMS",
  EMPTY_CART: "EMPTY_CART",
};

const COUPON_INVALID_REASON_VALUES = Object.values(COUPON_INVALID_REASONS);

// --- Banner positions ---
const BANNER_POSITIONS = {
  HERO: "hero",
  PROMO: "promo",
  HOME_MID: "home-mid",
};

const BANNER_POSITION_VALUES = Object.values(BANNER_POSITIONS);

// --- Contact message statuses ---
const CONTACT_STATUSES = {
  NEW: "new",
  READ: "read",
  REPLIED: "replied",
};

const CONTACT_STATUS_VALUES = Object.values(CONTACT_STATUSES);

// --- Languages ---
const LANGUAGES = {
  EN: "en",
  AR: "ar",
};

const LANGUAGE_VALUES = Object.values(LANGUAGES);
const DEFAULT_LANGUAGE = LANGUAGES.EN;

// --- Pagination ---
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 100,
};

// --- Uploads ---
const UPLOAD = {
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"],
};

// --- OTP (password reset + email verification) ---
const OTP = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
  RESET_TOKEN_EXPIRES_IN: "15m",

  PURPOSES: {
    PASSWORD_RESET: "password-reset",
    EMAIL_VERIFICATION: "email-verification",
  },
};

module.exports = {
  ROLES,
  ROLE_VALUES,
  REVIEW_STATUSES,
  REVIEW_STATUS_VALUES,
  ORDER_STATUSES,
  ORDER_STATUS_VALUES,
  ORDER_TRANSITIONS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_VALUES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PROOF_METHODS,
  PAYMENT_PROOF_METHOD_VALUES,
  COUPON_TYPES,
  COUPON_TYPE_VALUES,
  COUPON_INVALID_REASONS,
  COUPON_INVALID_REASON_VALUES,
  BANNER_POSITIONS,
  BANNER_POSITION_VALUES,
  CONTACT_STATUSES,
  CONTACT_STATUS_VALUES,
  LANGUAGES,
  LANGUAGE_VALUES,
  DEFAULT_LANGUAGE,
  PAGINATION,
  UPLOAD,
  OTP,
};
