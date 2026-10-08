const { body, param } = require("express-validator");
const { runValidation } = require("./_common");
const { COUPON_TYPE_VALUES } = require("../config/constants");

const CODE_REGEX = /^[A-Z0-9_-]{3,32}$/;

/**
 * Shared field rules. On create the core fields are required;
 * on update everything is optional (PATCH semantics).
 */
function couponFieldRules(isCreate) {
  const required = (chain, message) =>
    isCreate ? chain.exists({ checkNull: true }).withMessage(message) : chain.optional();

  return [
    required(body("code"), "Coupon code is required")
      .trim()
      .toUpperCase()
      .matches(CODE_REGEX)
      .withMessage(
        "Coupon code must be 3-32 characters: letters, numbers, dash or underscore",
      ),

    required(body("type"), "Coupon type is required")
      .isIn(COUPON_TYPE_VALUES)
      .withMessage(`Type must be one of: ${COUPON_TYPE_VALUES.join(", ")}`),

    required(body("value"), "Coupon value is required")
      .isFloat({ gt: 0 })
      .withMessage("Value must be greater than 0")
      .toFloat(),

    // Nullable = sending null clears the field
    body("minOrderAmount")
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage("Minimum order amount must be 0 or more")
      .toFloat(),

    body("maxDiscountAmount")
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage("Maximum discount must be 0 or more")
      .toFloat(),

    body("usageLimit")
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage("Usage limit must be a whole number of at least 1")
      .toInt(),

    body("perUserLimit")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Per-user limit must be a whole number of at least 1")
      .toInt(),

    body("validFrom")
      .optional({ nullable: true })
      .isISO8601()
      .withMessage("validFrom must be a valid date")
      .toDate(),

    body("validUntil")
      .optional({ nullable: true })
      .isISO8601()
      .withMessage("validUntil must be a valid date")
      .toDate(),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean")
      .toBoolean(),

    body("applicableCategories")
      .optional()
      .isArray({ max: 100 })
      .withMessage("applicableCategories must be an array"),
    body("applicableCategories.*")
      .isMongoId()
      .withMessage("Invalid category id"),

    body("applicableProducts")
      .optional()
      .isArray({ max: 200 })
      .withMessage("applicableProducts must be an array"),
    body("applicableProducts.*")
      .isMongoId()
      .withMessage("Invalid product id"),

    runValidation,
  ];
}

const createCouponValidator = couponFieldRules(true);
const updateCouponValidator = [
  param("id").isMongoId().withMessage("Invalid coupon id"),
  ...couponFieldRules(false),
];

const couponIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid coupon id"),
  runValidation,
];

const validateCouponValidator = [
  body("code")
    .exists()
    .withMessage("Coupon code is required")
    .bail()
    .isString()
    .withMessage("Coupon code must be a string")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ max: 32 })
    .withMessage("Coupon code is too long"),
  runValidation,
];

module.exports = {
  createCouponValidator,
  updateCouponValidator,
  couponIdParamValidator,
  validateCouponValidator,
};
