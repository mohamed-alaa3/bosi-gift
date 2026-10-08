const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const reviewService = require("../services/review.service");

// GET /api/products/:productId/reviews  (public, approved only)
const listByProduct = asyncHandler(async (req, res) => {
  const { items, meta } = await reviewService.listProductReviews(req.params.productId, req.query);
  return ok(res, items, meta);
});

// GET /api/reviews/featured  (public) — approved product + service testimonials
const listFeatured = asyncHandler(async (req, res) => {
  return ok(res, await reviewService.listFeaturedReviews(req.query));
});

// GET /api/reviews/service  (public) — approved service reviews
const listService = asyncHandler(async (req, res) => {
  const { items, meta } = await reviewService.listServiceReviews(req.query);
  return ok(res, items, meta);
});

// POST /api/products/:productId/reviews  (customer; must have a delivered order with it)
const create = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user._id, req.params.productId, req.body);
  return ok(res, review, undefined, 201);
});

// POST /api/reviews/service  (customer; must own a delivered order)
const createService = asyncHandler(async (req, res) => {
  const review = await reviewService.createServiceReview(req.user._id, req.body);
  return ok(res, review, undefined, 201);
});

// PATCH /api/reviews/:id  (customer; own review only)
const updateOwn = asyncHandler(async (req, res) => {
  return ok(res, await reviewService.updateOwnReview(req.user._id, req.params.id, req.body));
});

// GET /api/reviews/mine
const listMine = asyncHandler(async (req, res) => {
  return ok(res, await reviewService.listMyReviews(req.user._id));
});

// GET /api/reviews/order/:orderId  — what can be reviewed for this (own) order
const orderState = asyncHandler(async (req, res) => {
  return ok(res, await reviewService.getOrderReviewState(req.user._id, req.params.orderId));
});

module.exports = { listByProduct, listFeatured, listService, create, createService, updateOwn, listMine, orderState };
