const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const addressService = require("../services/address.service");

/**
 * GET /api/addresses
 */
const list = asyncHandler(async (req, res) => {
  const data = await addressService.listAddresses(req.user._id);
  return ok(res, data);
});

/**
 * GET /api/addresses/:id
 */
const getOne = asyncHandler(async (req, res) => {
  const data = await addressService.getAddressById(req.user._id, req.params.id);
  return ok(res, data);
});

/**
 * POST /api/addresses
 */
const create = asyncHandler(async (req, res) => {
  const data = await addressService.createAddress(req.user._id, req.body);
  return ok(res, data, undefined, 201);
});

/**
 * PATCH /api/addresses/:id
 */
const update = asyncHandler(async (req, res) => {
  const data = await addressService.updateAddress(
    req.user._id,
    req.params.id,
    req.body,
  );
  return ok(res, data);
});

/**
 * DELETE /api/addresses/:id
 */
const remove = asyncHandler(async (req, res) => {
  const data = await addressService.deleteAddress(req.user._id, req.params.id);
  return ok(res, data);
});

/**
 * PATCH /api/addresses/:id/default
 */
const setDefault = asyncHandler(async (req, res) => {
  const data = await addressService.setDefaultAddress(
    req.user._id,
    req.params.id,
  );
  return ok(res, data);
});

module.exports = { list, getOne, create, update, remove, setDefault };
