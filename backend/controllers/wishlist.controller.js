const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const wishlistService = require("../services/wishlist.service");

/**
 * GET /api/wishlist
 */
const get = asyncHandler(async (req, res) => {
  const data = await wishlistService.getWishlist(req.user._id);
  return ok(res, data);
});

/**
 * POST /api/wishlist
 */
const add = asyncHandler(async (req, res) => {
  const data = await wishlistService.addItem(req.user._id, req.body.productId);
  return ok(res, data, undefined, 201);
});

/**
 * DELETE /api/wishlist/:productId
 */
const remove = asyncHandler(async (req, res) => {
  const data = await wishlistService.removeItem(
    req.user._id,
    req.params.productId,
  );
  return ok(res, data);
});

module.exports = { get, add, remove };
