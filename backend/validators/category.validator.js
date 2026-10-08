const { body } = require("express-validator");
const { runValidation } = require("./_common");

const createCategoryValidator = [
  body("name").exists().withMessage("Category name is required"),

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
      throw new Error("Category name is required");
    }
    if (!value.en && !value.ar) {
      throw new Error("Category name must include English or Arabic");
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

  body("isActive")
    .optional()
    .custom(
      (value) =>
        value === true ||
        value === false ||
        value === "true" ||
        value === "false",
    )
    .withMessage("isActive must be a boolean")
    .customSanitizer((value) => value === true || value === "true"),

  body("sortOrder")
    .optional()
    .custom((value) => !isNaN(Number(value)) && Number(value) >= 0)
    .withMessage("sortOrder must be a non-negative integer")
    .customSanitizer((value) => Number(value)),

  runValidation,
];

const updateCategoryValidator = [
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

  body("name")
    .optional()
    .custom((value) => {
      if (value === undefined) return true;
      if (!value || typeof value !== "object") {
        throw new Error("Category name must be an object with en/ar keys");
      }
      if (!value.en && !value.ar) {
        throw new Error("Category name must include English or Arabic");
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

  body("isActive")
    .optional()
    .custom(
      (value) =>
        value === true ||
        value === false ||
        value === "true" ||
        value === "false",
    )
    .withMessage("isActive must be a boolean")
    .customSanitizer((value) => value === true || value === "true"),

  body("sortOrder")
    .optional()
    .custom((value) => !isNaN(Number(value)) && Number(value) >= 0)
    .withMessage("sortOrder must be a non-negative integer")
    .customSanitizer((value) => Number(value)),

  runValidation,
];

module.exports = {
  createCategoryValidator,
  updateCategoryValidator,
};
