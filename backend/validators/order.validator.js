const { body, param } = require("express-validator");
const { runValidation } = require("./_common");
const {
  ORDER_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PROOF_METHOD_VALUES,
} = require("../config/constants");

// ─── Shared address validators ──────────────────────────────────

const addressValidators = (required = true) => {
  const chain = (field) => (required ? body(field) : body(field).optional());

  return [
    chain("shippingAddress")
      .exists()
      .withMessage("Shipping address is required")
      .custom((v) => {
        // Multipart sends it as a JSON string; JSON requests send it as an object.
        if (typeof v === "object" && v !== null) return true;
        if (typeof v === "string") {
          try {
            const parsed = JSON.parse(v);
            return parsed && typeof parsed === "object";
          } catch {
            return false;
          }
        }
        return false;
      })
      .withMessage("Shipping address must be a valid object or JSON string")
      // Parse it early so the field rules below see the actual fields.
      .customSanitizer((v) => {
        if (typeof v === "string") {
          try {
            return JSON.parse(v);
          } catch {
            return v;
          }
        }
        return v;
      }),

    body("shippingAddress.fullName")
      .trim()
      .notEmpty()
      .withMessage("Shipping address fullName is required")
      .isLength({ max: 80 })
      .withMessage("Shipping address fullName is too long"),

    body("shippingAddress.phone")
      .trim()
      .notEmpty()
      .withMessage("Shipping address phone is required")
      .isLength({ max: 20 })
      .withMessage("Shipping address phone is too long"),

    body("shippingAddress.country")
      .trim()
      .notEmpty()
      .withMessage("Shipping address country is required"),

    body("shippingAddress.city")
      .trim()
      .notEmpty()
      .withMessage("Shipping address city is required"),

    body("shippingAddress.street")
      .trim()
      .notEmpty()
      .withMessage("Shipping address street is required"),

    body("shippingAddress.area").optional({ checkFalsy: true }).trim(),
    body("shippingAddress.building").optional({ checkFalsy: true }).trim(),
    body("shippingAddress.apartment").optional({ checkFalsy: true }).trim(),
    body("shippingAddress.postalCode").optional({ checkFalsy: true }).trim(),

    // Phase 3: governorate is required
    body("shippingAddress.governorate")
      .trim()
      .notEmpty()
      .withMessage("Please select a governorate"),
  ];
};

// ─── Shared pricing / payment validators ────────────────────────

const paymentValidators = [
  body("paymentMethod")
    .exists()
    .withMessage("Payment method is required")
    .isIn(PAYMENT_METHOD_VALUES)
    .withMessage(
      `Payment method must be one of: ${PAYMENT_METHOD_VALUES.join(", ")}`,
    ),

  body("paymentProofMethod")
    .optional({ checkFalsy: true })
    .isIn(PAYMENT_PROOF_METHOD_VALUES)
    .withMessage(
      `Payment proof method must be one of: ${PAYMENT_PROOF_METHOD_VALUES.join(", ")}`,
    ),

  body("notes")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must be at most 500 characters"),

  body("couponCode")
    .optional({ checkFalsy: true })
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9_-]{3,32}$/)
    .withMessage("Invalid coupon code"),
];

// ─── POST /api/orders/quote ─────────────────────────────────────

const quoteOrderValidator = [
  ...addressValidators(true),
  ...paymentValidators,
  runValidation,
];

// ─── POST /api/orders ───────────────────────────────────────────

const createOrderValidator = [
  ...addressValidators(true),
  ...paymentValidators,

  // Only required when the order actually needs a payment proof.
  // The service validates the "deposit/full requires proof" rule.
  body("paymentProofMethod")
    .if(body("paymentMethod").isIn(["deposit", "full"]))
    .notEmpty()
    .withMessage("Please choose which number you transferred to"),

  body("amountDueNow")
    .exists()
    .withMessage("Amount due now is required")
    .isFloat({ min: 0 })
    .withMessage("Amount due now must be zero or greater")
    .toFloat(),

  runValidation,
];

// ─── Status transitions ─────────────────────────────────────────

const updateOrderStatusValidator = [
  param("id").isMongoId().withMessage("Invalid order id"),

  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(ORDER_STATUS_VALUES)
    .withMessage(`Status must be one of: ${ORDER_STATUS_VALUES.join(", ")}`),

  body("reason")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be at most 500 characters"),

  body("confirm")
    .optional()
    .isBoolean()
    .withMessage("confirm must be a boolean"),

  runValidation,
];

const orderIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid order id"),
  runValidation,
];

module.exports = {
  quoteOrderValidator,
  createOrderValidator,
  updateOrderStatusValidator,
  orderIdParamValidator,
};
