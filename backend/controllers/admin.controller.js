const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const statsService = require("../services/stats.service");

/**
 * GET /api/admin/stats/overview?range=30d
 */
const overview = asyncHandler(async (req, res) => {
  const data = await statsService.getOverview(req.query);
  return ok(res, data);
});

/**
 * GET /api/admin/stats/revenue?range=30d
 */
const revenueSeries = asyncHandler(async (req, res) => {
  const data = await statsService.getRevenueSeries(req.query);
  return ok(res, data);
});

/**
 * GET /api/admin/products/low-stock?threshold=5
 */
const lowStock = asyncHandler(async (req, res) => {
  const threshold = Math.max(0, parseInt(req.query.threshold, 10) || 5);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const data = await statsService.getLowStock({ threshold, limit });
  return ok(res, data);
});

/**
 * GET /api/admin/products/top?range=30d&limit=5
 */
const topProducts = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const data = await statsService.getTopProducts({ ...req.query, limit });
  return ok(res, data);
});

/**
 * GET /api/admin/orders/recent?limit=5
 */
const recentOrders = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const data = await statsService.getRecentOrders({ limit });
  return ok(res, data);
});

module.exports = {
  overview,
  revenueSeries,
  lowStock,
  topProducts,
  recentOrders,
};
