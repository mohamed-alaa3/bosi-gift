const Order = require("../models/Order");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const GiftBox = require("../models/GiftBox");
const WrapStyle = require("../models/WrapStyle");
const Ribbon = require("../models/Ribbon");
const generateOrderNumber = require("../utils/generateOrderNumber");
const cartService = require("./cart.service");
const couponService = require("./coupon.service");
const settingService = require("./setting.service");
const env = require("../config/env");
const path = require("path");
const fs = require("fs");
const { buildImageUrl } = require("../utils/buildImageUrl");
const { assertTransition } = require("../utils/orderTransitions");
const { computePricing } = require("./orderPricing.service");
const { buildOrderMessage } = require("./whatsappMessage.service");
const { PRIVATE_UPLOAD_DIR } = require("../middleware/upload");
const {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_PROOF_METHODS,
} = require("../config/constants");

// ============================================================
// Helpers
// ============================================================

function effectivePrice(product) {
  if (
    product.discountPrice != null &&
    product.discountPrice > 0 &&
    product.discountPrice < product.price
  ) {
    return product.discountPrice;
  }
  return product.price;
}

/**
 * Attach public URLs to a stored order.
 * - Product / gift-box images use buildImageUrl (local /uploads).
 * - Payment proof is exposed via an authenticated endpoint.
 */
function withImageUrls(order) {
  const obj = order.toJSON();

  if (obj.items) {
    obj.items = obj.items.map((it) => {
      const enriched = {
        ...it,
        imageUrl: buildImageUrl(it.imageSnapshot || ""),
      };

      if (it.type === "gift-box" && it.giftBox) {
        if (it.giftBox.box) {
          it.giftBox.box.imageUrl = buildImageUrl(it.giftBox.box.image || "");
        }
        if (it.giftBox.items) {
          it.giftBox.items = it.giftBox.items.map((gi) => ({
            ...gi,
            imageUrl: buildImageUrl(gi.image || ""),
          }));
        }
        if (it.giftBox.wrap) {
          it.giftBox.wrap.imageUrl = buildImageUrl(it.giftBox.wrap.image || "");
        }
        if (it.giftBox.ribbon) {
          it.giftBox.ribbon.imageUrl = buildImageUrl(
            it.giftBox.ribbon.image || "",
          );
        }
      }

      return enriched;
    });
  }

  // Expose a stable URL the frontend can call with the auth header.
  obj.hasPaymentProof = Boolean(obj.paymentProofImage);
  if (obj.hasPaymentProof) {
    obj.paymentProofUrl = `/api/orders/${obj._id}/payment-proof`;
  } else {
    obj.paymentProofUrl = null;
  }
  delete obj.paymentProofImage;

  return obj;
}

// ============================================================
// Gift-box builder (unchanged from Feature 2)
// ============================================================

async function buildGiftBoxOrderItem(giftBoxInput) {
  if (
    !giftBoxInput ||
    !giftBoxInput.boxId ||
    !Array.isArray(giftBoxInput.items)
  ) {
    throw ApiError.badRequest("Invalid gift box configuration");
  }

  const box = await GiftBox.findById(giftBoxInput.boxId);
  if (!box || !box.isActive) {
    throw ApiError.badRequest("Gift box is not available");
  }

  if (giftBoxInput.items.length === 0) {
    throw ApiError.badRequest("Gift box must contain at least one item");
  }
  if (giftBoxInput.items.length > box.capacity) {
    throw ApiError.conflict(
      `Gift box capacity is ${box.capacity} items, you selected ${giftBoxInput.items.length}`,
    );
  }

  const productIds = giftBoxInput.items.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const itemsSnapshot = [];
  let itemsTotal = 0;

  for (const inputItem of giftBoxInput.items) {
    const product = productMap.get(String(inputItem.productId));
    if (!product) {
      throw ApiError.badRequest(`Product not found: ${inputItem.productId}`);
    }

    if (product.stock < 1) {
      throw ApiError.conflict(
        `${product.name.en || product.name.ar}: out of stock`,
      );
    }

    const quantity = Math.max(1, Number(inputItem.quantity) || 1);
    if (product.stock < quantity) {
      throw ApiError.conflict(
        `${product.name.en || product.name.ar}: only ${product.stock} left in stock`,
      );
    }

    const unitPrice = effectivePrice(product);
    const lineTotal = unitPrice * quantity;

    itemsSnapshot.push({
      id: product._id.toString(),
      name: product.name,
      price: unitPrice,
      image: product.images?.[0] || "",
      quantity,
    });

    itemsTotal += lineTotal;
  }

  let wrapSnapshot = null;
  let wrapPrice = 0;
  if (giftBoxInput.wrapStyleId) {
    const wrap = await WrapStyle.findById(giftBoxInput.wrapStyleId);
    if (!wrap || !wrap.isActive) {
      throw ApiError.badRequest("Wrap style is not available");
    }
    wrapSnapshot = {
      id: wrap._id.toString(),
      name: wrap.name,
      price: wrap.price,
      image: wrap.image || "",
    };
    wrapPrice = wrap.price;
  }

  let ribbonSnapshot = null;
  let ribbonPrice = 0;
  if (giftBoxInput.ribbonId) {
    const ribbon = await Ribbon.findById(giftBoxInput.ribbonId);
    if (!ribbon || !ribbon.isActive) {
      throw ApiError.badRequest("Ribbon is not available");
    }
    ribbonSnapshot = {
      id: ribbon._id.toString(),
      name: ribbon.name,
      price: ribbon.price,
      color: ribbon.color,
      image: ribbon.image || "",
    };
    ribbonPrice = ribbon.price;
  }

  const note = (giftBoxInput.note || "").toString().slice(0, 500);
  const total = box.basePrice + itemsTotal + wrapPrice + ribbonPrice;

  const giftBoxSnapshot = {
    box: {
      id: box._id.toString(),
      name: box.name,
      price: box.basePrice,
      image: box.image || "",
      capacity: box.capacity,
    },
    items: itemsSnapshot,
    wrap: wrapSnapshot,
    ribbon: ribbonSnapshot,
    note,
  };

  const nameSnapshot = {
    en: `${box.name.en || "Gift Box"} (Custom)`,
    ar: `${box.name.ar || "بوكس هدايا"} (مخصص)`,
  };

  return {
    type: "gift-box",
    product: null,
    nameSnapshot,
    imageSnapshot: box.image || "",
    priceAtPurchase: total,
    quantity: 1,
    selectedOptions: [],
    subtotal: total,
    giftBox: giftBoxSnapshot,
  };
}

// ============================================================
// Cart snapshot — shared by quote + create
// ============================================================

/**
 * Load the user's cart, validate all items, and return:
 *  - orderItems   (fresh snapshots, server prices)
 *  - subtotal     (merchandise only)
 *  - productMap   (for coupon scoping)
 */
async function buildCartSnapshot(userId) {
  const cart = await cartService.getOrCreateCart(userId);

  if (!cart.items || cart.items.length === 0) {
    throw ApiError.badRequest("Your cart is empty");
  }

  const productIds = cart.items
    .filter((i) => i.type === "product" && i.product)
    .map((i) => i.product);

  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const orderItems = [];
  let subtotal = 0;

  for (const item of cart.items) {
    if (item.type === "gift-box" && item.giftBox) {
      const giftBoxItem = await buildGiftBoxOrderItem({
        boxId: item.giftBox.boxId,
        items: (item.giftBox.items || []).map((gi) => ({
          productId: gi.productId,
          quantity: gi.quantity || 1,
        })),
        wrapStyleId: item.giftBox.wrap?.wrapStyleId || null,
        ribbonId: item.giftBox.ribbon?.ribbonId || null,
        note: item.giftBox.note || "",
      });

      orderItems.push(giftBoxItem);
      subtotal += giftBoxItem.subtotal;
      continue;
    }

    const product = productMap.get(item.product.toString());

    if (!product || !product.isActive) {
      throw ApiError.conflict(`Product is no longer available`);
    }

    if (product.stock < item.quantity) {
      throw ApiError.conflict(
        `${product.name.en || product.name.ar}: only ${product.stock} left in stock`,
      );
    }

    const unitPrice = effectivePrice(product);
    const lineSubtotal = unitPrice * item.quantity;

    orderItems.push({
      type: "product",
      product: product._id,
      nameSnapshot: product.name,
      imageSnapshot: product.images?.[0] || "",
      priceAtPurchase: unitPrice,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions || [],
      subtotal: lineSubtotal,
      giftBox: null,
    });

    subtotal += lineSubtotal;
  }

  return { cart, orderItems, subtotal, productMap };
}

// ============================================================
// Governorate + payment-method resolution (from Settings)
// ============================================================

/**
 * Validate the governorate key against Settings and return
 * { key, name, fee, enabled } or throw.
 */
async function resolveGovernorate(governorateKey) {
  if (!governorateKey || typeof governorateKey !== "string") {
    throw ApiError.badRequest("Please select a governorate");
  }

  const gov = await settingService.getGovernorate(governorateKey);
  if (!gov) {
    throw ApiError.badRequest("Unknown governorate");
  }
  if (!gov.enabled) {
    throw ApiError.badRequest("We don't ship to this governorate right now");
  }
  return gov;
}

/**
 * Load payment-related settings + enforce that the customer's
 * chosen method is actually offered.
 */
async function resolvePaymentSettings(paymentMethod, paymentProofMethod) {
  const payment = await settingService.getPaymentSettings();

  if (
    paymentMethod === PAYMENT_METHODS.DEPOSIT ||
    paymentMethod === PAYMENT_METHODS.FULL
  ) {
    // At least one method must be configured.
    const hasVodafone = Boolean(payment.vodafoneCashNumber);
    const hasInstapay = Boolean(payment.instapayNumber);
    if (!hasVodafone && !hasInstapay) {
      throw ApiError.badRequest(
        "Online payment is not available right now. Please choose cash on delivery.",
      );
    }

    if (paymentProofMethod) {
      if (
        paymentProofMethod === PAYMENT_PROOF_METHODS.VODAFONE &&
        !hasVodafone
      ) {
        throw ApiError.badRequest("Vodafone Cash is not available right now");
      }
      if (
        paymentProofMethod === PAYMENT_PROOF_METHODS.INSTAPAY &&
        !hasInstapay
      ) {
        throw ApiError.badRequest("InstaPay is not available right now");
      }
    }
  }

  return payment;
}

// ============================================================
// Public API — quote
// ============================================================

/**
 * POST /api/orders/quote
 *
 * Runs the full pricing pipeline (cart snapshot, governorate fee,
 * coupon, payment discount) WITHOUT touching the DB. Safe to call
 * on every keystroke of the checkout summary.
 */
async function quoteOrder(userId, input) {
  const { shippingAddress, paymentMethod, couponCode, paymentProofMethod } =
    input;

  const { orderItems, subtotal, productMap } = await buildCartSnapshot(userId);

  const gov = await resolveGovernorate(shippingAddress?.governorate);
  const payment = await resolvePaymentSettings(
    paymentMethod,
    paymentProofMethod,
  );

  // Coupon — validated against the fresh cart context.
  let couponDiscount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const context = couponService.buildContextFromOrderItems(
      orderItems,
      productMap,
      subtotal,
    );
    const result = await couponService.validate(couponCode, context, userId);
    if (!result.valid) {
      throw ApiError.badRequest(result.message, [
        { field: "couponCode", message: result.reason },
      ]);
    }
    couponDiscount = result.discount;
    appliedCoupon = result.coupon;
  }

  const pricing = computePricing({
    subtotal,
    shippingFee: gov.fee,
    taxRate: env.taxRate,
    couponDiscount,
    paymentMethod,
    depositAmount: payment.depositAmount,
    fullPaymentDiscountPercent: payment.fullPaymentDiscountPercent,
  });

  return {
    governorate: { key: gov.key, name: gov.name, fee: gov.fee },
    paymentSettings: {
      depositAmount: payment.depositAmount,
      fullPaymentDiscountPercent: payment.fullPaymentDiscountPercent,
      vodafoneCashNumber: payment.vodafoneCashNumber,
      instapayNumber: payment.instapayNumber,
    },
    coupon: appliedCoupon
      ? { code: appliedCoupon.code, discount: couponDiscount }
      : null,
    items: orderItems,
    ...pricing,
  };
}

// ============================================================
// Public API — create
// ============================================================

/**
 * POST /api/orders
 *
 * Atomic create:
 * 1. Snapshot the cart.
 * 2. Resolve governorate + payment settings.
 * 3. Validate coupon.
 * 4. Compute pricing server-side.
 * 5. Verify the client's `amountDueNow` matches ours (PRICE_CHANGED guard).
 * 6. Require a payment proof for deposit/full.
 * 7. Create order + reserve stock + increment coupon usage (rollback on failure).
 * 8. Return order + WhatsApp message.
 */
async function createOrder(userId, input) {
  const {
    shippingAddress,
    notes,
    couponCode,
    paymentMethod,
    paymentProofMethod,
    amountDueNow,
    paymentProofFile,
  } = input;

  // ---- 1. Cart snapshot ----
  const { cart, orderItems, subtotal, productMap } =
    await buildCartSnapshot(userId);

  // ---- 2. Governorate + payment ----
  const gov = await resolveGovernorate(shippingAddress?.governorate);
  const payment = await resolvePaymentSettings(
    paymentMethod,
    paymentProofMethod,
  );

  // ---- 3. Coupon ----
  let couponDiscount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const context = couponService.buildContextFromOrderItems(
      orderItems,
      productMap,
      subtotal,
    );
    const result = await couponService.validate(couponCode, context, userId);
    if (!result.valid) {
      throw ApiError.badRequest(result.message, [
        { field: "couponCode", message: result.reason },
      ]);
    }
    couponDiscount = result.discount;
    appliedCoupon = result.coupon;
  }

  // ---- 4. Pricing ----
  const pricing = computePricing({
    subtotal,
    shippingFee: gov.fee,
    taxRate: env.taxRate,
    couponDiscount,
    paymentMethod,
    depositAmount: payment.depositAmount,
    fullPaymentDiscountPercent:
      payment.paymentDiscountPercent ?? payment.fullPaymentDiscountPercent,
  });

  // ---- 5. Price guard ----
  // The frontend sends back the amountDueNow it showed to the customer.
  // If it doesn't match our server-side value, refuse rather than let
  // them transfer a stale amount.
  const clientDue = Number(amountDueNow);
  if (
    !Number.isFinite(clientDue) ||
    Math.abs(clientDue - pricing.amountDueNow) > 0.01
  ) {
    throw ApiError.conflict(
      "The order total has changed. Please refresh the checkout and try again.",
      [{ field: "amountDueNow", message: "PRICE_CHANGED" }],
    );
  }

  // ---- 6. Payment proof requirement ----
  const needsProof =
    paymentMethod === PAYMENT_METHODS.DEPOSIT ||
    paymentMethod === PAYMENT_METHODS.FULL;

  if (needsProof && !paymentProofFile) {
    throw ApiError.badRequest("Please upload a screenshot of your transfer");
  }
  if (needsProof && !paymentProofMethod) {
    throw ApiError.badRequest("Please choose which number you transferred to");
  }
  if (!needsProof && paymentProofFile) {
    throw ApiError.badRequest(
      "Payment proof is not required for cash on delivery",
    );
  }

  // ---- 7. Build snapshot address ----
  const snapshotAddress = {
    fullName: shippingAddress.fullName,
    phone: shippingAddress.phone,
    country: shippingAddress.country,
    city: shippingAddress.city,
    area: shippingAddress.area || "",
    street: shippingAddress.street,
    building: shippingAddress.building || "",
    apartment: shippingAddress.apartment || "",
    postalCode: shippingAddress.postalCode || "",
    governorate: gov.key,
    governorateName: gov.name,
  };

  // ---- 8. Create order (retry on orderNumber collision) ----
  let order;
  let attempts = 0;
  while (!order && attempts < 5) {
    attempts += 1;
    const orderNumber = generateOrderNumber();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Order.exists({ orderNumber });
    if (exists) continue;

    // eslint-disable-next-line no-await-in-loop
    const created = await Order.create({
      user: userId,
      orderNumber,
      items: orderItems,
      shippingAddress: snapshotAddress,
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      tax: pricing.tax,
      discount: pricing.couponDiscount,
      paymentDiscount: pricing.paymentDiscount,
      couponCode: appliedCoupon ? appliedCoupon.code : "",
      coupon: appliedCoupon ? appliedCoupon._id : null,
      total: pricing.total,
      amountDueNow: pricing.amountDueNow,
      remainingAmount: pricing.remainingAmount,
      status: ORDER_STATUSES.PENDING,
      paymentStatus: PAYMENT_STATUSES.PENDING,
      paymentMethod,
      paymentProofImage: paymentProofFile ? paymentProofFile.filename : "",
      paymentProofMethod: paymentProofFile ? paymentProofMethod : "",
      paymentProofUploadedAt: paymentProofFile ? new Date() : null,
      notes: notes || "",
    });

    order = created;
  }

  if (!order) {
    throw ApiError.internal("Could not generate a unique order number");
  }

  // ---- 9. Decrement stock + reserve coupon (with rollback) ----
  const decremented = [];
  try {
    for (const item of orderItems) {
      if (item.type !== "product" || !item.product) continue;

      // eslint-disable-next-line no-await-in-loop
      const res = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
      );
      if (res.modifiedCount !== 1) {
        throw ApiError.conflict(
          `Could not reserve stock for ${item.nameSnapshot?.en || item.nameSnapshot?.ar}`,
        );
      }
      decremented.push(item);
    }

    if (appliedCoupon) {
      await couponService.incrementUsage(appliedCoupon._id);
    }
  } catch (err) {
    for (const item of decremented) {
      // eslint-disable-next-line no-await-in-loop
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
      ).catch(() => {});
    }
    await Order.deleteOne({ _id: order._id }).catch(() => {});
    // Clean up the uploaded proof on rollback
    if (paymentProofFile?.filename) {
      const fp = path.join(PRIVATE_UPLOAD_DIR, paymentProofFile.filename);
      fs.promises.unlink(fp).catch(() => {});
    }
    throw err;
  }

  // ---- 10. Decrement stock for gift-box internal products ----
  const giftItems = orderItems.filter((i) => i.type === "gift-box");
  for (const gItem of giftItems) {
    if (!gItem.giftBox?.items) continue;
    for (const gbItem of gItem.giftBox.items) {
      // eslint-disable-next-line no-await-in-loop
      await Product.updateOne(
        { _id: gbItem.id },
        { $inc: { stock: -(gbItem.quantity || 1) } },
      ).catch(() => {});
    }
  }

  // ---- 11. Clear the cart ----
  cart.items = [];
  await cart.save();

  // ---- 12. Return enriched order + WhatsApp message ----
  const enriched = withImageUrls(order);
  const whatsappMessage = buildOrderMessage(enriched);

  return {
    order: enriched,
    whatsappMessage,
  };
}

// ============================================================
// Public API — reads
// ============================================================

async function listOrders(user, query = {}) {
  const filter = {};
  if (user.role !== "admin") filter.user = user._id;

  if (query.status) filter.status = query.status;

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    items: items.map(withImageUrls),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getOrderById(user, orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  if (user.role !== "admin" && order.user.toString() !== user._id.toString()) {
    throw ApiError.forbidden("You do not have access to this order");
  }

  return withImageUrls(order);
}

async function getOrderTracking(user, orderId) {
  const order = await getOrderById(user, orderId);
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Return the physical path + mime type of an order's payment proof,
 * enforcing that only the owner or an admin can access it.
 */
async function getPaymentProofFile(user, orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  if (user.role !== "admin" && order.user.toString() !== user._id.toString()) {
    throw ApiError.forbidden("You do not have access to this order");
  }

  if (!order.paymentProofImage) {
    throw ApiError.notFound("No payment proof uploaded for this order");
  }

  const filePath = path.join(PRIVATE_UPLOAD_DIR, order.paymentProofImage);

  // Guard against path traversal in the stored filename.
  if (!filePath.startsWith(PRIVATE_UPLOAD_DIR)) {
    throw ApiError.badRequest("Invalid file path");
  }

  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound("Payment proof file is missing");
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";

  return {
    filePath,
    mimeType,
    filename: order.paymentProofImage,
  };
}

// ============================================================
// Public API — admin status transitions (Phase 1 + Phase 3)
// ============================================================

/**
 * Release stock + coupon usage for an order that is being cancelled.
 * Guarded by the atomic transition in `updateOrderStatus`.
 */
async function releaseReservations(order) {
  if (order.coupon) {
    await couponService.decrementUsage(order.coupon).catch(() => {});
  }

  for (const item of order.items) {
    if (item.type !== "product" || !item.product) continue;
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } },
    ).catch(() => {});
  }

  const giftItems = order.items.filter((i) => i.type === "gift-box");
  for (const gItem of giftItems) {
    if (!gItem.giftBox?.items) continue;
    for (const gbItem of gItem.giftBox.items) {
      // eslint-disable-next-line no-await-in-loop
      await Product.updateOne(
        { _id: gbItem.id },
        { $inc: { stock: gbItem.quantity || 1 } },
      ).catch(() => {});
    }
  }
}

function derivePaymentStatus(order, newStatus) {
  const method = order.paymentMethod;
  const current = order.paymentStatus;

  if (newStatus === ORDER_STATUSES.CANCELLED) {
    // Rejecting a pending proof → failed. Already-approved stays as-is.
    if (current === PAYMENT_STATUSES.PENDING) return PAYMENT_STATUSES.FAILED;
    return current;
  }

  if (newStatus === ORDER_STATUSES.CONFIRMED) {
    if (method === PAYMENT_METHODS.DEPOSIT) return PAYMENT_STATUSES.PARTIAL;
    if (method === PAYMENT_METHODS.FULL) return PAYMENT_STATUSES.PAID;
    return current;
  }

  if (newStatus === ORDER_STATUSES.DELIVERED) {
    if (method === PAYMENT_METHODS.DEPOSIT) return PAYMENT_STATUSES.PAID;
    return current;
  }

  return current;
}

async function updateOrderStatus(orderId, newStatus, options = {}) {
  const { reason = "", confirm = false, adminId = null } = options;

  const current = await Order.findById(orderId);
  if (!current) throw ApiError.notFound("Order not found");

  const transition = assertTransition(current.status, newStatus);

  if (transition.requiresConfirm && confirm !== true) {
    throw ApiError.badRequest(
      "Cancelling an order in processing requires explicit confirmation",
    );
  }
  if (transition.requiresReason && (!reason || !reason.trim())) {
    throw ApiError.badRequest("A reason is required to cancel an order");
  }

  const update = { status: newStatus };
  const isCancellation = newStatus === ORDER_STATUSES.CANCELLED;

  if (isCancellation) {
    update.rejectionReason = reason.trim();
  }
  if (newStatus === ORDER_STATUSES.CONFIRMED || isCancellation) {
    update.paymentReviewedAt = new Date();
    if (adminId) update.paymentReviewedBy = adminId;
  }

  const derivedPaymentStatus = derivePaymentStatus(current, newStatus);
  if (derivedPaymentStatus !== current.paymentStatus) {
    update.paymentStatus = derivedPaymentStatus;
  }

  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: current.status },
    { $set: update },
    { new: true },
  );

  if (!updated) {
    throw ApiError.conflict(
      "Order status changed by another request — please refresh",
    );
  }

  if (isCancellation) {
    await releaseReservations(updated).catch(() => {});
  }

  return withImageUrls(updated);
}

// ============================================================

module.exports = {
  quoteOrder,
  createOrder,
  listOrders,
  getOrderById,
  getOrderTracking,
  getPaymentProofFile,
  updateOrderStatus,
};
