const fs = require("fs");

const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/apiResponse");
const ApiError = require("../utils/ApiError");
const orderService = require("../services/order.service");
// (removed — the service handles private file paths)

/**
 * POST /api/orders/quote
 * Preview the order total without creating it. Re-checks stock.
 */
const quote = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode, paymentProofMethod } =
    req.body;

  const data = await orderService.quoteOrder(req.user._id, {
    shippingAddress,
    paymentMethod,
    couponCode,
    paymentProofMethod,
  });

  return ok(res, data);
});

/**
 * POST /api/orders
 * Creates the order with an optional payment-proof upload (multipart).
 *
 * Body fields:
 *   - shippingAddress (JSON string when multipart)
 *   - paymentMethod
 *   - couponCode?
 *   - paymentProofMethod?
 *   - amountDueNow (number)
 *   - notes?
 * File:
 *   - paymentProof (image, required for deposit/full)
 */
const create = asyncHandler(async (req, res) => {
  // When the request is multipart, non-file fields arrive as strings.
  const raw = req.body || {};
  let shippingAddress = raw.shippingAddress;
  if (typeof shippingAddress === "string") {
    try {
      shippingAddress = JSON.parse(shippingAddress);
    } catch {
      throw ApiError.badRequest("Invalid shippingAddress");
    }
  }

  const amountDueNow = Number(raw.amountDueNow);
  if (!Number.isFinite(amountDueNow) || amountDueNow < 0) {
    throw ApiError.badRequest("Invalid amountDueNow");
  }

  const data = await orderService.createOrder(req.user._id, {
    shippingAddress,
    notes: raw.notes,
    couponCode: raw.couponCode,
    paymentMethod: raw.paymentMethod,
    paymentProofMethod: raw.paymentProofMethod || "",
    amountDueNow,
    paymentProofFile: req.file || null,
  });

  return ok(res, data, undefined, 201);
});

/**
 * GET /api/orders/:id/payment-proof
 * Streams the private proof image. Owner or admin only.
 */
const getPaymentProof = asyncHandler(async (req, res) => {
  const { filePath, mimeType, filename } =
    await orderService.getPaymentProofFile(req.user, req.params.id);

  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${filename || "proof"}"`,
  );
  res.setHeader("Cache-Control", "private, no-store");

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Could not read file" });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
});

/**
 * GET /api/orders
 */
const list = asyncHandler(async (req, res) => {
  const { items, meta } = await orderService.listOrders(req.user, req.query);
  return ok(res, items, meta);
});

/**
 * GET /api/orders/:id
 */
const getOne = asyncHandler(async (req, res) => {
  const data = await orderService.getOrderById(req.user, req.params.id);
  return ok(res, data);
});

/**
 * GET /api/orders/:id/tracking
 */
const tracking = asyncHandler(async (req, res) => {
  const data = await orderService.getOrderTracking(req.user, req.params.id);
  return ok(res, data);
});

/**
 * PATCH /api/orders/:id/status  (admin)
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { status, reason, confirm } = req.body;
  const data = await orderService.updateOrderStatus(req.params.id, status, {
    reason,
    confirm,
    adminId: req.user._id,
  });
  return ok(res, data);
});

module.exports = {
  quote,
  create,
  getPaymentProof,
  list,
  getOne,
  tracking,
  updateStatus,
};
