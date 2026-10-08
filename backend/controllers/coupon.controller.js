const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const couponService = require("../services/coupon.service");

/**
 * POST /api/coupons/validate  (authenticated)
 * Body: { code }
 *
 * The cart context is built from the user's server-side cart, so prices
 * can never be spoofed. Business-rule failures return 200 with
 * { valid: false, reason } so the storefront can show a translated message.
 */
const validate = asyncHandler(async (req, res) => {
  const context = await couponService.buildContextFromCart(req.user._id);
  const result = await couponService.validate(
    req.body.code,
    context,
    req.user._id,
  );

  return ok(res, {
    valid: result.valid,
    code: result.coupon
      ? result.coupon.code
      : couponService.normalizeCode(req.body.code),
    discount: result.discount,
    reason: result.reason,
    message: result.message,
    type: result.coupon ? result.coupon.type : null,
    value: result.coupon ? result.coupon.value : null,
    minOrderAmount: result.minOrderAmount ?? null,
  });
});

module.exports = { validate };
