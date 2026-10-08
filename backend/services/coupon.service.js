const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const cartService = require("./cart.service");
const { COUPON_TYPES } = require("../config/constants");

// ------------------------------------------------------------------
// Machine-readable reasons. The storefront maps these to i18n keys
// (coupon.errors.<REASON>); `message` is an English fallback only.
// ------------------------------------------------------------------
const REASONS = {
  NOT_FOUND: "NOT_FOUND",
  INACTIVE: "INACTIVE",
  NOT_STARTED: "NOT_STARTED",
  EXPIRED: "EXPIRED",
  USAGE_LIMIT_REACHED: "USAGE_LIMIT_REACHED",
  USER_LIMIT_REACHED: "USER_LIMIT_REACHED",
  MIN_ORDER_NOT_MET: "MIN_ORDER_NOT_MET",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  EMPTY_CART: "EMPTY_CART",
};

const MESSAGES = {
  NOT_FOUND: "Coupon code is not valid",
  INACTIVE: "This coupon is not active",
  NOT_STARTED: "This coupon is not valid yet",
  EXPIRED: "This coupon has expired",
  USAGE_LIMIT_REACHED: "This coupon has reached its usage limit",
  USER_LIMIT_REACHED: "You have already used this coupon",
  MIN_ORDER_NOT_MET: "Your order does not meet the minimum amount for this coupon",
  NOT_APPLICABLE: "This coupon does not apply to the items in your cart",
  EMPTY_CART: "Your cart is empty",
};

const MUTABLE_FIELDS = [
  "code",
  "type",
  "value",
  "minOrderAmount",
  "maxDiscountAmount",
  "usageLimit",
  "perUserLimit",
  "validFrom",
  "validUntil",
  "isActive",
  "applicableCategories",
  "applicableProducts",
];

const round2 = (n) => Math.round(n * 100) / 100;

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function invalid(reason, extra = {}) {
  return {
    valid: false,
    discount: 0,
    reason,
    message: MESSAGES[reason],
    coupon: null,
    ...extra,
  };
}

// ------------------------------------------------------------------
// Cart context
//   { subtotal, items: [{ type, productId, categoryId, lineTotal }] }
// ------------------------------------------------------------------

/**
 * Build the context from the user's server-side cart (used by /validate).
 * Prices come from the DB via cartService.enrichCart — never from the client.
 */
async function buildContextFromCart(userId) {
  const cart = await cartService.getOrCreateCart(userId);
  const enriched = await cartService.enrichCart(cart);

  const productIds = enriched.items
    .filter((i) => i.type === "product" && i.product)
    .map((i) => i.product._id);

  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select("category")
    : [];
  const categoryMap = new Map(
    products.map((p) => [
      p._id.toString(),
      p.category ? p.category.toString() : null,
    ]),
  );

  const items = [];
  for (const item of enriched.items) {
    if (item.type === "product" && item.product) {
      const productId = item.product._id.toString();
      items.push({
        type: "product",
        productId,
        categoryId: categoryMap.get(productId) || null,
        lineTotal: item.lineTotal || 0,
      });
    } else if (item.type === "gift-box") {
      items.push({
        type: "gift-box",
        productId: null,
        categoryId: null,
        lineTotal: item.lineTotal || 0,
      });
    }
  }

  return { subtotal: enriched.subtotal, items };
}

/**
 * Build the context from order items already built by order.service.
 * `productMap` maps productId string -> Product document.
 */
function buildContextFromOrderItems(orderItems, productMap, subtotal) {
  const items = orderItems.map((item) => {
    if (item.type === "product" && item.product) {
      const productId = item.product.toString();
      const product = productMap.get(productId);
      return {
        type: "product",
        productId,
        categoryId: product?.category ? product.category.toString() : null,
        lineTotal: item.subtotal,
      };
    }
    return {
      type: "gift-box",
      productId: null,
      categoryId: null,
      lineTotal: item.subtotal,
    };
  });

  return { subtotal, items };
}

// ------------------------------------------------------------------
// Discount math
// ------------------------------------------------------------------

/**
 * Sum of the lines this coupon may discount.
 * - No restrictions: the whole cart subtotal (gift boxes included).
 * - With restrictions: product lines whose product OR category matches.
 *   Gift-box lines never match a restricted coupon.
 */
function eligibleSubtotal(coupon, context) {
  const hasCategories = (coupon.applicableCategories || []).length > 0;
  const hasProducts = (coupon.applicableProducts || []).length > 0;

  if (!hasCategories && !hasProducts) return context.subtotal;

  const categorySet = new Set(coupon.applicableCategories.map(String));
  const productSet = new Set(coupon.applicableProducts.map(String));

  return context.items.reduce((sum, item) => {
    if (item.type !== "product") return sum;
    const matches =
      (item.productId && productSet.has(item.productId)) ||
      (item.categoryId && categorySet.has(item.categoryId));
    return matches ? sum + item.lineTotal : sum;
  }, 0);
}

/**
 * Discount amount (EGP, 2 decimals) for a coupon against a cart context.
 * Never exceeds the eligible subtotal; percentage coupons honour maxDiscountAmount.
 */
function applyToOrder(coupon, context) {
  const eligible = eligibleSubtotal(coupon, context);
  if (eligible <= 0) return 0;

  let discount =
    coupon.type === COUPON_TYPES.PERCENTAGE
      ? (eligible * coupon.value) / 100
      : coupon.value;

  if (
    coupon.type === COUPON_TYPES.PERCENTAGE &&
    coupon.maxDiscountAmount != null
  ) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }

  discount = Math.min(discount, eligible);
  return round2(Math.max(0, discount));
}

// ------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------

/**
 * Validate a coupon for a user + cart context.
 * Never throws for business-rule failures: returns { valid:false, reason }.
 * @returns {{ valid, discount, reason, message, coupon }}
 */
async function validate(code, cartContext, userId) {
  const normalized = normalizeCode(code);
  if (!normalized) return invalid(REASONS.NOT_FOUND);

  if (
    !cartContext ||
    !Array.isArray(cartContext.items) ||
    cartContext.items.length === 0 ||
    !(cartContext.subtotal > 0)
  ) {
    return invalid(REASONS.EMPTY_CART);
  }

  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon) return invalid(REASONS.NOT_FOUND);
  if (!coupon.isActive) return invalid(REASONS.INACTIVE);

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    return invalid(REASONS.NOT_STARTED);
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return invalid(REASONS.EXPIRED);
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return invalid(REASONS.USAGE_LIMIT_REACHED);
  }

  if (
    coupon.minOrderAmount != null &&
    cartContext.subtotal < coupon.minOrderAmount
  ) {
    return invalid(REASONS.MIN_ORDER_NOT_MET, {
      minOrderAmount: coupon.minOrderAmount,
    });
  }

  if (userId) {
    const usedByUser = await Order.countDocuments({
      user: userId,
      coupon: coupon._id,
      status: { $ne: "cancelled" },
    });
    if (usedByUser >= coupon.perUserLimit) {
      return invalid(REASONS.USER_LIMIT_REACHED);
    }
  }

  const discount = applyToOrder(coupon, cartContext);
  if (discount <= 0) return invalid(REASONS.NOT_APPLICABLE);

  return {
    valid: true,
    discount,
    reason: null,
    message: "Coupon applied",
    coupon,
  };
}

// ------------------------------------------------------------------
// Usage counters
// ------------------------------------------------------------------

/**
 * Atomically reserve one redemption.
 * The usage-limit check lives inside the update filter, so two concurrent
 * orders can never push usedCount past usageLimit.
 */
async function incrementUsage(couponId) {
  const updated = await Coupon.findOneAndUpdate(
    {
      _id: couponId,
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
      ],
    },
    { $inc: { usedCount: 1 } },
    { new: true },
  );

  if (!updated) {
    // ApiError.conflict() takes no `errors` argument, so build it directly.
    throw new ApiError(MESSAGES.USAGE_LIMIT_REACHED, 409, [
      { field: "couponCode", message: REASONS.USAGE_LIMIT_REACHED },
    ]);
  }
  return updated;
}

/**
 * Release one redemption (order cancelled / order creation rolled back).
 * Never drops below zero.
 */
async function decrementUsage(couponId) {
  await Coupon.updateOne(
    { _id: couponId, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
  );
}

// ------------------------------------------------------------------
// Admin CRUD
// ------------------------------------------------------------------

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickFields(data) {
  const out = {};
  for (const key of MUTABLE_FIELDS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  if (out.code !== undefined) out.code = normalizeCode(out.code);
  return out;
}

/**
 * Cross-field rules (need the final merged values).
 */
function assertRules(coupon) {
  if (coupon.type === COUPON_TYPES.PERCENTAGE) {
    if (!(coupon.value > 0 && coupon.value <= 100)) {
      throw ApiError.badRequest("Percentage value must be between 1 and 100");
    }
  } else if (!(coupon.value > 0)) {
    throw ApiError.badRequest("Fixed discount value must be greater than 0");
  }

  if (
    coupon.validFrom &&
    coupon.validUntil &&
    coupon.validUntil <= coupon.validFrom
  ) {
    throw ApiError.badRequest("Valid-until date must be after valid-from date");
  }
}

async function listCoupons({ q, isActive } = {}) {
  const filter = {};
  if (q) filter.code = { $regex: escapeRegex(normalizeCode(q)) };
  if (isActive === true || isActive === false) filter.isActive = isActive;

  const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
  return coupons.map((c) => c.toJSON());
}

async function getCouponById(id) {
  const coupon = await Coupon.findById(id)
    .populate("applicableCategories", "name")
    .populate("applicableProducts", "name");
  if (!coupon) throw ApiError.notFound("Coupon not found");
  return coupon.toJSON();
}

async function createCoupon(data) {
  const fields = pickFields(data);

  if (await Coupon.exists({ code: fields.code })) {
    throw ApiError.conflict("Coupon code already exists");
  }

  const coupon = new Coupon(fields);
  if (fields.type !== COUPON_TYPES.PERCENTAGE) coupon.maxDiscountAmount = null;
  assertRules(coupon);

  await coupon.save();
  return coupon.toJSON();
}

async function updateCoupon(id, data) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw ApiError.notFound("Coupon not found");

  const fields = pickFields(data);

  if (fields.code !== undefined && fields.code !== coupon.code) {
    if (await Coupon.exists({ code: fields.code, _id: { $ne: coupon._id } })) {
      throw ApiError.conflict("Coupon code already exists");
    }
  }

  coupon.set(fields);
  if (coupon.type !== COUPON_TYPES.PERCENTAGE) coupon.maxDiscountAmount = null;
  assertRules(coupon);

  await coupon.save();
  return coupon.toJSON();
}

/**
 * Coupons referenced by orders can't be deleted (order history keeps the link).
 * Deactivate them instead.
 */
async function deleteCoupon(id) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw ApiError.notFound("Coupon not found");

  if (await Order.exists({ coupon: coupon._id })) {
    throw ApiError.conflict(
      "This coupon has been used in orders and cannot be deleted. Deactivate it instead.",
    );
  }

  await coupon.deleteOne();
  return { _id: id };
}

module.exports = {
  REASONS,
  normalizeCode,
  buildContextFromCart,
  buildContextFromOrderItems,
  applyToOrder,
  validate,
  incrementUsage,
  decrementUsage,
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
