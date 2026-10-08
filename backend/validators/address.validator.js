const { body, param } = require("express-validator");
const { runValidation } = require("./_common");

const createAddressValidator = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("fullName is required")
    .isLength({ max: 80 })
    .withMessage("fullName must be at most 80 characters"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("phone is required")
    .isLength({ max: 20 })
    .withMessage("phone must be at most 20 characters"),

  body("country").trim().notEmpty().withMessage("country is required"),

  body("city").trim().notEmpty().withMessage("city is required"),

  body("street").trim().notEmpty().withMessage("street is required"),

  body("area").optional({ checkFalsy: true }).trim(),
  body("building").optional({ checkFalsy: true }).trim(),
  body("apartment").optional({ checkFalsy: true }).trim(),
  body("postalCode").optional({ checkFalsy: true }).trim(),

  body("isDefault")
    .optional()
    .custom((v) => v === true || v === false || v === "true" || v === "false")
    .withMessage("isDefault must be a boolean")
    .customSanitizer((v) => v === true || v === "true"),

  runValidation,
];

const updateAddressValidator = [
  param("id").isMongoId().withMessage("Invalid address id"),

  body("fullName")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 })
    .withMessage("fullName must be at most 80 characters"),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage("phone must be at most 20 characters"),

  body("country").optional({ checkFalsy: true }).trim(),
  body("city").optional({ checkFalsy: true }).trim(),
  body("street").optional({ checkFalsy: true }).trim(),
  body("area").optional({ checkFalsy: true }).trim(),
  body("building").optional({ checkFalsy: true }).trim(),
  body("apartment").optional({ checkFalsy: true }).trim(),
  body("postalCode").optional({ checkFalsy: true }).trim(),

  body("isDefault")
    .optional()
    .custom((v) => v === true || v === false || v === "true" || v === "false")
    .withMessage("isDefault must be a boolean")
    .customSanitizer((v) => v === true || v === "true"),

  runValidation,
];

const addressIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid address id"),
  runValidation,
];

module.exports = {
  createAddressValidator,
  updateAddressValidator,
  addressIdParamValidator,
};
