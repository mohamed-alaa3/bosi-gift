const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const couponService = require("../services/coupon.service");

/**
 * GET /api/admin/coupons?q=&isActive=
 */
const list = asyncHandler(async (req, res) => {
  const { q, isActive } = req.query;
  const data = await couponService.listCoupons({
    q: typeof q === "string" ? q : undefined,
    isActive:
      isActive === "true" ? true : isActive === "false" ? false : undefined,
  });
  return ok(res, data);
});

/**
 * GET /api/admin/coupons/:id
 */
const getOne = asyncHandler(async (req, res) => {
  const data = await couponService.getCouponById(req.params.id);
  return ok(res, data);
});

/**
 * POST /api/admin/coupons
 */
const create = asyncHandler(async (req, res) => {
  const data = await couponService.createCoupon(req.body);
  return ok(res, data, undefined, 201);
});

/**
 * PATCH /api/admin/coupons/:id
 */
const update = asyncHandler(async (req, res) => {
  const data = await couponService.updateCoupon(req.params.id, req.body);
  return ok(res, data);
});

/**
 * DELETE /api/admin/coupons/:id
 */
const remove = asyncHandler(async (req, res) => {
  const data = await couponService.deleteCoupon(req.params.id);
  return ok(res, data);
});

module.exports = { list, getOne, create, update, remove };
