const { body, param } = require("express-validator");
const { runValidation } = require("./_common");

const createGiftBoxValidator = [
  body("name").exists().withMessage("Name is required"),

  body("name.en")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 })
    .withMessage("English name must be at most 80 characters"),

  body("name.ar")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 })
    .withMessage("Arabic name must be at most 80 characters"),

  body("name").custom((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("Gift box name is required");
    }
    if (!value.en && !value.ar) {
      throw new Error("Gift box name must include English or Arabic");
    }
    return true;
  }),

  body("description.en")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("English description must be at most 500 characters"),

  body("description.ar")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Arabic description must be at most 500 characters"),

  body("basePrice")
    .exists()
    .withMessage("Base price is required")
    .custom((v) => !isNaN(Number(v)) && Number(v) >= 0)
    .withMessage("Base price must be a non-negative number")
    .customSanitizer((v) => Number(v)),

  body("capacity")
    .exists()
    .withMessage("Capacity is required")
    .custom((v) => {
      const n = Number(v);
      return !isNaN(n) && Number.isInteger(n) && n >= 1 && n <= 50;
    })
    .withMessage("Capacity must be an integer between 1 and 50")
    .customSanitizer((v) => Number(v)),

  body("isActive")
    .optional()
    .custom((v) => v === true || v === false || v === "true" || v === "false")
    .withMessage("isActive must be a boolean")
    .customSanitizer((v) => v === true || v === "true"),

  body("sortOrder")
    .optional()
    .custom((v) => !isNaN(Number(v)) && Number.isInteger(Number(v)))
    .withMessage("sortOrder must be an integer")
    .customSanitizer((v) => Number(v)),

  runValidation,
];

const updateGiftBoxValidator = [
  param("id").isMongoId().withMessage("Invalid gift box id"),

  body("name")
    .optional()
    .custom((value) => {
      if (value === undefined) return true;
      if (!value || typeof value !== "object") {
        throw new Error("Name must be an object with en/ar keys");
      }
      if (!value.en && !value.ar) {
        throw new Error("Gift box name must include English or Arabic");
      }
      return true;
    }),

  body("name.en").optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body("name.ar").optional({ checkFalsy: true }).trim().isLength({ max: 80 }),

  body("description.en")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),
  body("description.ar")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),

  body("basePrice")
    .optional()
    .custom((v) => !isNaN(Number(v)) && Number(v) >= 0)
    .withMessage("Base price must be a non-negative number")
    .customSanitizer((v) => Number(v)),

  body("capacity")
    .optional()
    .custom((v) => {
      const n = Number(v);
      return !isNaN(n) && Number.isInteger(n) && n >= 1 && n <= 50;
    })
    .withMessage("Capacity must be an integer between 1 and 50")
    .customSanitizer((v) => Number(v)),

  body("isActive")
    .optional()
    .custom((v) => v === true || v === false || v === "true" || v === "false")
    .withMessage("isActive must be a boolean")
    .customSanitizer((v) => v === true || v === "true"),

  body("sortOrder")
    .optional()
    .custom((v) => !isNaN(Number(v)) && Number.isInteger(Number(v)))
    .withMessage("sortOrder must be an integer")
    .customSanitizer((v) => Number(v)),

  runValidation,
];

const giftBoxIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid gift box id"),
  runValidation,
];

module.exports = {
  createGiftBoxValidator,
  updateGiftBoxValidator,
  giftBoxIdParamValidator,
};
