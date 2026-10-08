/**
 * Pure pricing logic for orders.
 *
 * Shared by:
 *   - POST /api/orders/quote   (preview shown to the customer)
 *   - order.service.createOrder (authoritative at order creation)
 *
 * No DB access — the caller passes everything in. This keeps the two
 * code paths from drifting apart.
 *
 * Formula:
 *   total = subtotal + shippingFee + tax - discount - paymentDiscount
 *   amountDueNow = deposit (capped at total) OR the full total
 *   remainingAmount = total - amountDueNow
 */

const { PAYMENT_METHODS } = require("../config/constants");
const ApiError = require("../utils/ApiError");

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {Object} input
 * @param {number} input.subtotal           Cart subtotal (server-computed)
 * @param {number} input.shippingFee        From governorate settings
 * @param {number} [input.taxRate=0]        Fraction, e.g. 0.14
 * @param {number} [input.couponDiscount=0] Absolute discount from the coupon
 * @param {string} input.paymentMethod      'cod' | 'deposit' | 'full'
 * @param {number} [input.depositAmount]    Required for 'deposit' — from settings
 * @param {number} [input.fullPaymentDiscountPercent=0] For 'full' — from settings
 * @returns {{
 *   subtotal: number,
 *   shippingFee: number,
 *   tax: number,
 *   couponDiscount: number,
 *   paymentDiscount: number,
 *   total: number,
 *   amountDueNow: number,
 *   remainingAmount: number,
 * }}
 */
function computePricing(input) {
  const {
    subtotal,
    shippingFee = 0,
    taxRate = 0,
    couponDiscount = 0,
    paymentMethod,
    depositAmount = 0,
    fullPaymentDiscountPercent = 0,
  } = input || {};

  // ---- Guards ----
  if (typeof subtotal !== "number" || subtotal < 0) {
    throw ApiError.badRequest("Invalid subtotal");
  }
  if (
    paymentMethod !== PAYMENT_METHODS.COD &&
    paymentMethod !== PAYMENT_METHODS.DEPOSIT &&
    paymentMethod !== PAYMENT_METHODS.FULL
  ) {
    throw ApiError.badRequest(`Invalid payment method: ${paymentMethod}`);
  }

  // ---- Tax ----
  const tax = round2(subtotal * (Number(taxRate) || 0));

  // ---- Coupon (already validated elsewhere) ----
  const safeCouponDiscount = Math.max(0, Number(couponDiscount) || 0);

  // ---- Payment-method-specific discount ----
  // The full-payment discount is applied to the merchandise AFTER the
  // coupon and BEFORE shipping + tax.
  let paymentDiscount = 0;
  if (paymentMethod === PAYMENT_METHODS.FULL) {
    const percent = Math.max(
      0,
      Math.min(100, Number(fullPaymentDiscountPercent) || 0),
    );
    const base = Math.max(0, subtotal - safeCouponDiscount);
    paymentDiscount = round2(base * (percent / 100));
  }

  // ---- Total ----
  const total = Math.max(
    0,
    round2(subtotal + shippingFee + tax - safeCouponDiscount - paymentDiscount),
  );

  // ---- Amount due now ----
  let amountDueNow;
  if (paymentMethod === PAYMENT_METHODS.DEPOSIT) {
    const deposit = Math.max(0, Number(depositAmount) || 0);
    // Deposit can never exceed the total.
    amountDueNow = round2(Math.min(deposit, total));
  } else if (paymentMethod === PAYMENT_METHODS.FULL) {
    amountDueNow = total;
  } else {
    // COD: nothing is paid now.
    amountDueNow = 0;
  }

  const remainingAmount = round2(Math.max(0, total - amountDueNow));

  return {
    subtotal: round2(subtotal),
    shippingFee: round2(shippingFee),
    tax,
    couponDiscount: round2(safeCouponDiscount),
    paymentDiscount,
    total,
    amountDueNow,
    remainingAmount,
  };
}

module.exports = { computePricing };
