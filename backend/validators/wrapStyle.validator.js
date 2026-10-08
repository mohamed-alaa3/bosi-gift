const { body, param } = require("express-validator");
const { runValidation } = require("./_common");

const createWrapStyleValidator = [
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
      throw new Error("Wrap style name is required");
    }
    if (!value.en && !value.ar) {
      throw new Error("Wrap style name must include English or Arabic");
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

const updateWrapStyleValidator = [
  param("id").isMongoId().withMessage("Invalid wrap style id"),

  body("name")
    .optional()
    .custom((value) => {
      if (value === undefined) return true;
      if (!value || typeof value !== "object") {
        throw new Error("Name must be an object with en/ar keys");
      }
      if (!value.en && !value.ar) {
        throw new Error("Wrap style name must include English or Arabic");
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

const wrapStyleIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid wrap style id"),
  runValidation,
];

module.exports = {
  createWrapStyleValidator,
  updateWrapStyleValidator,
  wrapStyleIdParamValidator,
};
