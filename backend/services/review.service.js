const mongoose = require("mongoose");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { buildImageUrl } = require("../utils/buildImageUrl");
const { ORDER_STATUSES } = require("../config/constants");

const toId = (v) => new mongoose.Types.ObjectId(String(v));
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const firstName = (full) => String(full || "").trim().split(/\s+/)[0] || "";

const SERVICE_FIELDS = ["customerServiceRating", "deliveryRating", "packagingRating"];

function pickServiceRatings(body = {}) {
  const out = {};
  for (const f of SERVICE_FIELDS) {
    if (body[f] !== undefined) out[f] = body[f] === null ? null : Number(body[f]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Product rating summary (stored on Product; recomputed by aggregation) */
/* ------------------------------------------------------------------ */

async function recalcProductRating(productId) {
  if (!productId) return;
  const stats = await Review.aggregate([
    {
      $match: {
        product: toId(productId),
        type: { $in: ["product", null] }, // legacy docs have no type
        status: "approved",
      },
    },
    { $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const avg = stats[0]?.avg || 0;
  const count = stats[0]?.count || 0;

  await Product.updateOne(
    { _id: productId },
    { $set: { ratingAvg: Math.round(avg * 10) / 10, ratingCount: count } },
  );
}

/* ------------------------------------------------------------------ */
/* Eligibility (always derived from the database, never the client)    */
/* ------------------------------------------------------------------ */

/** Latest DELIVERED order of this user that contains this product. */
function findDeliveredOrderForProduct(userId, productId) {
  return Order.findOne({
    user: userId,
    status: ORDER_STATUSES.DELIVERED,
    items: { $elemMatch: { type: { $ne: "gift-box" }, product: productId } },
  })
    .sort({ createdAt: -1 })
    .select("_id");
}

async function getOwnedDeliveredOrder(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId }).select("_id status");
  if (!order) throw ApiError.notFound("Order not found");
  if (order.status !== ORDER_STATUSES.DELIVERED) {
    throw ApiError.forbidden("You can review an order after it has been delivered");
  }
  return order;
}

/* ------------------------------------------------------------------ */
/* Mapping helpers                                                      */
/* ------------------------------------------------------------------ */

function productPreview(p) {
  if (!p) return null;
  return {
    _id: p._id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.images?.[0] ? buildImageUrl(p.images[0]) : "",
  };
}

/** Public testimonial — never exposes email/full name/ids of the customer. */
function toPublic(r) {
  return {
    _id: r._id,
    type: r.type || "product",
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    userName: r.displayName || firstName(r.user?.name),
    isVerifiedPurchase: !!r.isVerifiedPurchase,
    product: productPreview(r.product),
    ...(r.type === "service"
      ? {
          customerServiceRating: r.customerServiceRating,
          deliveryRating: r.deliveryRating,
          packagingRating: r.packagingRating,
        }
      : {}),
  };
}

function toOwn(r) {
  return {
    _id: r._id,
    type: r.type || "product",
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    isVerifiedPurchase: !!r.isVerifiedPurchase,
    customerServiceRating: r.customerServiceRating ?? null,
    deliveryRating: r.deliveryRating ?? null,
    packagingRating: r.packagingRating ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toAdmin(r) {
  return {
    _id: r._id,
    type: r.type || "product",
    source: r.source || "customer",
    status: r.status,
    rating: r.rating,
    comment: r.comment,
    displayName: r.displayName || "",
    isVerifiedPurchase: !!r.isVerifiedPurchase,
    customerServiceRating: r.customerServiceRating ?? null,
    deliveryRating: r.deliveryRating ?? null,
    packagingRating: r.packagingRating ?? null,
    order: r.order || null,
    user: r.user ? { _id: r.user._id, name: r.user.name, email: r.user.email } : null,
    product: productPreview(r.product),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Public reads                                                         */
/* ------------------------------------------------------------------ */

async function listProductReviews(productId, query = {}) {
  const product = await Product.findById(productId).select("ratingAvg ratingCount");
  if (!product) throw ApiError.notFound("Product not found");

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { product: productId, status: "approved", type: { $in: ["product", null] } };

  const [rows, total] = await Promise.all([
    Review.find(filter).populate("user", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);

  // Keep the legacy `user: { name }` shape (first name only — no full names in public)
  const items = rows.map((r) => ({
    _id: r._id,
    type: "product",
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    isVerifiedPurchase: !!r.isVerifiedPurchase,
    user: { name: r.displayName || firstName(r.user?.name) },
  }));

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary: { ratingAvg: product.ratingAvg || 0, ratingCount: product.ratingCount || 0 },
    },
  };
}

/** Homepage testimonials: approved product + service reviews, newest first. */
async function listFeaturedReviews(query = {}) {
  const limit = Math.min(12, Math.max(1, parseInt(query.limit, 10) || 6));
  const filter = { status: "approved", comment: { $exists: true, $ne: "" } };
  if (query.type === "product" || query.type === "service") filter.type = query.type;

  const reviews = await Review.find(filter)
    .populate("user", "name")
    .populate({ path: "product", select: "name slug images isActive", match: { isActive: true } })
    .sort({ createdAt: -1 })
    .limit(limit * 2);

  return reviews
    .filter((r) => r.comment && r.comment.trim())
    .filter((r) => (r.type === "service" ? true : !!r.product))
    .slice(0, limit)
    .map(toPublic);
}

async function listServiceReviews(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const filter = { type: "service", status: "approved" };
  const [rows, total] = await Promise.all([
    Review.find(filter).populate("user", "name").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Review.countDocuments(filter),
  ]);
  return {
    items: rows.map(toPublic),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/* ------------------------------------------------------------------ */
/* Customer: create / update / read own                                 */
/* ------------------------------------------------------------------ */

async function createReview(userId, productId, { rating, comment }) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw ApiError.notFound("Product not found");

  const order = await findDeliveredOrderForProduct(userId, productId);
  if (!order) {
    throw ApiError.forbidden("You can only review products from your delivered orders");
  }

  const existing = await Review.findOne({ user: userId, product: productId });
  if (existing) {
    throw ApiError.conflict("You have already reviewed this product. You can edit your review.");
  }

  let review;
  try {
    review = await Review.create({
      type: "product",
      source: "customer",
      user: userId,
      product: productId,
      order: order._id,
      isVerifiedPurchase: true,
      rating,
      comment,
      status: "pending", // moderated before it becomes public
    });
  } catch (err) {
    if (err?.code === 11000) throw ApiError.conflict("You have already reviewed this product");
    throw err;
  }
  await recalcProductRating(productId);
  return toOwn(review);
}

async function createServiceReview(userId, body) {
  const order = await getOwnedDeliveredOrder(userId, body.orderId);

  const existing = await Review.findOne({ user: userId, type: "service", order: order._id });
  if (existing) {
    throw ApiError.conflict("You have already reviewed this order experience. You can edit it.");
  }

  try {
    const review = await Review.create({
      type: "service",
      source: "customer",
      user: userId,
      order: order._id,
      isVerifiedPurchase: true,
      rating: body.rating,
      comment: body.comment,
      ...pickServiceRatings(body),
      status: "pending",
    });
    return toOwn(review);
  } catch (err) {
    if (err?.code === 11000) throw ApiError.conflict("You have already reviewed this order experience");
    throw err;
  }
}

/** Customer edits their OWN review; it goes back to moderation. */
async function updateOwnReview(userId, reviewId, body) {
  const review = await Review.findOne({ _id: reviewId, user: userId, source: { $ne: "admin" } });
  if (!review) throw ApiError.notFound("Review not found");

  if (body.rating !== undefined) review.rating = body.rating;
  if (body.comment !== undefined) review.comment = body.comment;
  if (review.type === "service") Object.assign(review, pickServiceRatings(body));
  review.status = "pending";
  await review.save();

  if (review.product) await recalcProductRating(review.product);
  return toOwn(review);
}

async function listMyReviews(userId) {
  const rows = await Review.find({ user: userId })
    .populate({ path: "product", select: "name slug images" })
    .sort({ createdAt: -1 });
  return rows.map((r) => ({ ...toOwn(r), product: productPreview(r.product), order: r.order }));
}

/** What the customer can review for one of THEIR orders (drives Order Details). */
async function getOrderReviewState(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId }).select("status items");
  if (!order) throw ApiError.notFound("Order not found");

  const productIds = [
    ...new Set(
      order.items
        .filter((i) => i.type !== "gift-box" && i.product)
        .map((i) => String(i.product)),
    ),
  ];

  const [products, reviews] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).select("name slug images"),
    Review.find({
      user: userId,
      $or: [{ type: { $in: ["product", null] }, product: { $in: productIds } }, { type: "service", order: order._id }],
    }),
  ]);

  const byProduct = new Map(
    reviews.filter((r) => r.type !== "service").map((r) => [String(r.product), r]),
  );
  const service = reviews.find((r) => r.type === "service");

  return {
    orderId: order._id,
    orderStatus: order.status,
    canReview: order.status === ORDER_STATUSES.DELIVERED,
    products: products.map((p) => ({
      product: productPreview(p),
      review: byProduct.has(String(p._id)) ? toOwn(byProduct.get(String(p._id))) : null,
    })),
    service: service ? toOwn(service) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Admin                                                                */
/* ------------------------------------------------------------------ */

async function adminList(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

  const filter = {};
  if (query.type === "service") filter.type = "service";
  if (query.type === "product") filter.type = { $in: ["product", null] };
  if (["pending", "approved", "rejected"].includes(query.status)) filter.status = query.status;

  if (typeof query.q === "string" && query.q.trim()) {
    const rx = new RegExp(escapeRegex(query.q.trim().slice(0, 60)), "i");
    const [users, products] = await Promise.all([
      User.find({ $or: [{ name: rx }, { email: rx }] }).select("_id").limit(50),
      Product.find({ $or: [{ "name.en": rx }, { "name.ar": rx }] }).select("_id").limit(50),
    ]);
    filter.$or = [
      { comment: rx },
      { displayName: rx },
      { user: { $in: users.map((u) => u._id) } },
      { product: { $in: products.map((p) => p._id) } },
    ];
  }

  const [rows, total] = await Promise.all([
    Review.find(filter)
      .populate("user", "name email")
      .populate("product", "name slug images")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  return {
    items: rows.map(toAdmin),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Admin-entered testimonial: never verified, no user/order link. */
async function adminCreate(body) {
  if (body.type === "product") {
    const exists = await Product.exists({ _id: body.product });
    if (!exists) throw ApiError.notFound("Product not found");
  }

  const review = await Review.create({
    type: body.type,
    source: "admin",
    user: null,
    order: null,
    isVerifiedPurchase: false,
    product: body.type === "product" ? body.product : null,
    displayName: body.displayName,
    rating: body.rating,
    comment: body.comment,
    ...(body.type === "service" ? pickServiceRatings(body) : {}),
    status: body.status || "approved",
    ...(body.createdAt ? { createdAt: body.createdAt } : {}),
  });

  if (review.product) await recalcProductRating(review.product);
  return adminGetOne(review._id);
}

async function adminGetOne(id) {
  const r = await Review.findById(id)
    .populate("user", "name email")
    .populate("product", "name slug images");
  if (!r) throw ApiError.notFound("Review not found");
  return toAdmin(r);
}

async function adminUpdate(id, body) {
  const review = await Review.findById(id);
  if (!review) throw ApiError.notFound("Review not found");

  const touchesContent = ["rating", "comment", "displayName", "createdAt", ...SERVICE_FIELDS].some(
    (k) => body[k] !== undefined,
  );
  if (touchesContent && review.source !== "admin") {
    throw ApiError.badRequest("Only the status of a customer's review can be changed");
  }

  if (body.status !== undefined) review.status = body.status;
  if (review.source === "admin") {
    if (body.rating !== undefined) review.rating = body.rating;
    if (body.comment !== undefined) review.comment = body.comment;
    if (body.displayName !== undefined) review.displayName = body.displayName;
    if (body.createdAt) review.createdAt = body.createdAt;
    if (review.type === "service") Object.assign(review, pickServiceRatings(body));
  }
  await review.save();

  if (review.product) await recalcProductRating(review.product);
  return adminGetOne(review._id);
}

async function adminDelete(id) {
  const review = await Review.findByIdAndDelete(id);
  if (!review) throw ApiError.notFound("Review not found");
  if (review.product) await recalcProductRating(review.product);
  return { _id: review._id };
}

/* ------------------------------------------------------------------ */
/* Startup migration (idempotent, non-destructive)                      */
/* ------------------------------------------------------------------ */

/**
 * - Backfills `type`/`source` on legacy reviews (no data is removed).
 * - Replaces the old unique (user, product) index — which would block service
 *   reviews and admin testimonials — with partial unique indexes.
 * Needed because autoIndex is disabled in production.
 */
async function migrateReviewIndexes() {
  const coll = Review.collection;
  try {
    await coll.dropIndex("user_1_product_1");
  } catch (_) {
    /* already migrated / never existed */
  }
  await Review.updateMany(
    { type: { $exists: false } },
    { $set: { type: "product", source: "customer" } },
  );
  await Review.createIndexes();
}

module.exports = {
  recalcProductRating,
  listProductReviews,
  listFeaturedReviews,
  listServiceReviews,
  createReview,
  createServiceReview,
  updateOwnReview,
  listMyReviews,
  getOrderReviewState,
  adminList,
  adminCreate,
  adminGetOne,
  adminUpdate,
  adminDelete,
  migrateReviewIndexes,
};
