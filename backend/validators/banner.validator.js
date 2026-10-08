const { body, param } = require("express-validator");
const { runValidation } = require("./_common");
const { BANNER_POSITION_VALUES } = require("../config/constants");

const createBannerValidator = [
  body("title").exists().withMessage("title is required"),

  body("title.en")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage("title.en must be at most 120 characters"),

  body("title.ar")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage("title.ar must be at most 120 characters"),

  body("title").custom((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("Banner title is required");
    }
    if (!value.en && !value.ar) {
      throw new Error("Banner title must include English or Arabic");
    }
    return true;
  }),

  body("subtitle.en")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage("subtitle.en must be at most 300 characters"),

  body("subtitle.ar")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage("subtitle.ar must be at most 300 characters"),

  body("buttonText.en")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 40 })
    .withMessage("buttonText.en must be at most 40 characters"),

  body("buttonText.ar")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 40 })
    .withMessage("buttonText.ar must be at most 40 characters"),

  body("buttonLink")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage("buttonLink must be at most 300 characters"),

  body("position")
    .exists()
    .withMessage("position is required")
    .isIn(BANNER_POSITION_VALUES)
    .withMessage(
      `position must be one of: ${BANNER_POSITION_VALUES.join(", ")}`,
    ),

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

const updateBannerValidator = [
  param("id").isMongoId().withMessage("Invalid banner id"),

  body("title")
    .optional()
    .custom((value) => {
      if (value === undefined) return true;
      if (!value || typeof value !== "object") {
        throw new Error("title must be an object with en/ar keys");
      }
      if (!value.en && !value.ar) {
        throw new Error("Banner title must include English or Arabic");
      }
      return true;
    }),

  body("title.en").optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body("title.ar").optional({ checkFalsy: true }).trim().isLength({ max: 120 }),

  body("subtitle.en")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 }),
  body("subtitle.ar")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 }),

  body("buttonText.en")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 40 }),
  body("buttonText.ar")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 40 }),

  body("buttonLink")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 }),

  body("position")
    .optional()
    .isIn(BANNER_POSITION_VALUES)
    .withMessage(
      `position must be one of: ${BANNER_POSITION_VALUES.join(", ")}`,
    ),

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

const bannerIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid banner id"),
  runValidation,
];

module.exports = {
  createBannerValidator,
  updateBannerValidator,
  bannerIdParamValidator,
};
