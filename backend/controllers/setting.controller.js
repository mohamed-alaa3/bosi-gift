const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const settingService = require("../services/setting.service");

/**
 * GET /api/settings/public  (no auth)
 * Read-only config the storefront needs at checkout. Allow-listed in the
 * service — never exposes store info or anything admin-only.
 */
const getPublic = asyncHandler(async (req, res) => {
  const data = await settingService.getPublicSettings();
  // Always revalidate (cheap 304 via ETag) so fee changes show up immediately
  res.set("Cache-Control", "no-cache");
  return ok(res, data);
});

/**
 * GET /api/admin/settings
 */
const getAdmin = asyncHandler(async (req, res) => {
  const data = await settingService.getAdminSettings();
  return ok(res, data);
});

/**
 * PATCH /api/admin/settings
 * Body (all parts optional): { governorates?, payment?, store? }
 */
const update = asyncHandler(async (req, res) => {
  const data = await settingService.updateSettings(req.body, req.user._id);
  return ok(res, data);
});

module.exports = { getPublic, getAdmin, update };
