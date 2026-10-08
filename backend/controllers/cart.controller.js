const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const cartService = require("../services/cart.service");

/**
 * GET /api/cart
 */
const get = asyncHandler(async (req, res) => {
  const data = await cartService.getCart(req.user._id);
  return ok(res, data);
});

/**
 * POST /api/cart
 */
const add = asyncHandler(async (req, res) => {
  const { productId, quantity, selectedOptions } = req.body;
  const data = await cartService.addItem(req.user._id, {
    productId,
    quantity: quantity || 1,
    selectedOptions: selectedOptions || [],
  });
  return ok(res, data, undefined, 201);
});

/**
 * PATCH /api/cart/:itemId
 */
const update = asyncHandler(async (req, res) => {
  const data = await cartService.updateItem(
    req.user._id,
    req.params.itemId,
    req.body.quantity,
  );
  return ok(res, data);
}); 

const addGiftBox = asyncHandler(async (req, res) => {
  const data = await cartService.addGiftBox(req.user._id, req.body);
  return ok(res, data, undefined, 201);
});
/**
 * DELETE /api/cart/:itemId
 */
const remove = asyncHandler(async (req, res) => {
  const data = await cartService.removeItem(req.user._id, req.params.itemId);
  return ok(res, data);
});

/**
 * DELETE /api/cart
 */
const clear = asyncHandler(async (req, res) => {
  const data = await cartService.clearCart(req.user._id);
  return ok(res, data);
});

module.exports = { get, add, addGiftBox, update, remove, clear };