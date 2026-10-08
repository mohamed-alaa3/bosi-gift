const { body, param } = require("express-validator");
const { runValidation } = require("./_common");

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

const createRibbonValidator = [
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
      throw new Error("Ribbon name is required");
    }
    if (!value.en && !value.ar) {
      throw new Error("Ribbon name must include English or Arabic");
    }
    return true;
  }),

  body("color")
    .exists()
    .withMessage("Color is required")
    .trim()
    .matches(HEX_COLOR_REGEX)
    .withMessage("Color must be a valid hex code (e.g. #FF5733)"),

  body("price")
    .exists()
    .withMessage("Price is required")
    .custom((v) => !isNaN(Number(v)) && Number(v) >= 0)
    .withMessage("Price must be a non-negative number")
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

const updateRibbonValidator = [
  param("id").isMongoId().withMessage("Invalid ribbon id"),

  body("name")
    .optional()
    .custom((value) => {
      if (value === undefined) return true;
      if (!value || typeof value !== "object") {
        throw new Error("Name must be an object with en/ar keys");
      }
      if (!value.en && !value.ar) {
        throw new Error("Ribbon name must include English or Arabic");
      }
      return true;
    }),

  body("name.en").optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body("name.ar").optional({ checkFalsy: true }).trim().isLength({ max: 80 }),

  body("color")
    .optional()
    .trim()
    .matches(HEX_COLOR_REGEX)
    .withMessage("Color must be a valid hex code (e.g. #FF5733)"),

  body("price")
    .optional()
    .custom((v) => !isNaN(Number(v)) && Number(v) >= 0)
    .withMessage("Price must be a non-negative number")
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

const ribbonIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid ribbon id"),
  runValidation,
];

module.exports = {
  createRibbonValidator,
  updateRibbonValidator,
  ribbonIdParamValidator,
};