const { body } = require("express-validator");
const { runValidation } = require("./_common");
const { RECIPIENTS, OCCASIONS } = require("../config/giftTaxonomy");

const toBool = (value) => value === true || value === "true";
const isBoolLike = (value) =>
  value === true || value === false || value === "true" || value === "false";

// Optional list of allowed slugs. multipart sends a repeated field (array),
// a single value (string) or "" (= clear the list).
function slugListField(field, allowed) {
  return body(field)
    .optional()
    .custom((value) => {
      const list = Array.isArray(value) ? value : [value];
      const bad = list.find((v) => v !== "" && !allowed.includes(String(v)));
      if (bad !== undefined) throw new Error(`${field}: invalid value "${bad}"`);
      return true;
    })
    .customSanitizer((value) => {
      const list = Array.isArray(value) ? value : [value];
      return [...new Set(list.filter((v) => v !== "").map(String))];
    });
}

function optionalDateField(field) {
  return body(field)
    .optional()
    .customSanitizer((value) => (value === "" ? null : value))
    .custom((value) => value === null || !isNaN(Date.parse(value)))
    .withMessage(`${field} must be a valid date`)
    .customSanitizer((value) => (value === null ? null : new Date(value)));
}

function boolField(field) {
  return body(field)
    .optional()
    .custom(isBoolLike)
    .withMessage(`${field} must be a boolean`)
    .customSanitizer(toBool);
}

// Gift discovery metadata — shared by create + update.
const giftMetaValidators = [
  slugListField("recipients", RECIPIENTS),
  slugListField("occasions", OCCASIONS),
  boolField("isReadyGiftBox"),
  boolField("isDailyOffer"),
  optionalDateField("dailyOfferStart"),
  optionalDateField("dailyOfferEnd"),
];

// Reusable: nested translation fields
function translationFields(field, { required = false, max = 500 } = {}) {
  const rules = [];

  if (required) {
    rules.push(body(field).exists().withMessage(`${field} is required`));
  }

  rules.push(
    body(`${field}.en`)
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max })
      .withMessage(`${field}.en must be at most ${max} characters`),
    body(`${field}.ar`)
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max })
      .withMessage(`${field}.ar must be at most ${max} characters`),
  );

  return rules;
}

// --- CREATE ---

const createProductValidator = [
  ...translationFields("name", { required: true, max: 120 }),

  body("name").custom((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("Product name is required");
    }
    if (!value.en && !value.ar) {
      throw new Error("Product name must include English or Arabic");
    }
    return true;
  }),

  ...translationFields("description", { required: true, max: 3000 }),

  body("description").custom((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("Product description is required");
    }
    if (!value.en && !value.ar) {
      throw new Error("Product description must include English or Arabic");
    }
    return true;
  }),

  ...translationFields("shortDescription", { max: 300 }),

  body("price")
    .exists()
    .withMessage("Price is required")
    .custom((value) => !isNaN(Number(value)) && Number(value) >= 0)
    .withMessage("Price must be a non-negative number")
    .customSanitizer((value) => Number(value)),

  body("discountPrice")
    .optional({ checkFalsy: true })
    .custom((value) => !isNaN(Number(value)) && Number(value) >= 0)
    .withMessage("Discount price must be a non-negative number")
    .customSanitizer((value) => Number(value)),

  body("category")
    .exists()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Category must be a valid ID"),

  body("stock")
    .optional()
    .custom(
      (value) =>
        !isNaN(Number(value)) &&
        Number(value) >= 0 &&
        Number.isInteger(Number(value)),
    )
    .withMessage("Stock must be a non-negative integer")
    .customSanitizer((value) => Number(value)),

  body("sku")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 60 })
    .withMessage("SKU must be at most 60 characters"),

  body("isFeatured")
    .optional()
    .custom(
      (value) =>
        value === true ||
        value === false ||
        value === "true" ||
        value === "false",
    )
    .withMessage("isFeatured must be a boolean")
    .customSanitizer((value) => value === true || value === "true"),

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

  ...giftMetaValidators,

  runValidation,
];

// --- UPDATE ---

const updateProductValidator = [
  ...translationFields("name", { max: 120 }),
  ...translationFields("description", { max: 3000 }),
  ...translationFields("shortDescription", { max: 300 }),

  body("name")
    .optional()
    .custom((value) => {
      if (value === undefined) return true;
      if (!value || typeof value !== "object") {
        throw new Error("Product name must be an object with en/ar keys");
      }
      if (!value.en && !value.ar) {
        throw new Error("Product name must include English or Arabic");
      }
      return true;
    }),

  body("description")
    .optional()
    .custom((value) => {
      if (value === undefined) return true;
      if (!value || typeof value !== "object") {
        throw new Error(
          "Product description must be an object with en/ar keys",
        );
      }
      if (!value.en && !value.ar) {
        throw new Error("Product description must include English or Arabic");
      }
      return true;
    }),

  body("price")
    .optional()
    .custom((value) => !isNaN(Number(value)) && Number(value) >= 0)
    .withMessage("Price must be a non-negative number")
    .customSanitizer((value) => Number(value)),

  body("discountPrice")
    .optional({ checkFalsy: true })
    .custom((value) => !isNaN(Number(value)) && Number(value) >= 0)
    .withMessage("Discount price must be a non-negative number")
    .customSanitizer((value) => Number(value)),

  body("category")
    .optional()
    .isMongoId()
    .withMessage("Category must be a valid ID"),

  body("stock")
    .optional()
    .custom(
      (value) =>
        !isNaN(Number(value)) &&
        Number(value) >= 0 &&
        Number.isInteger(Number(value)),
    )
    .withMessage("Stock must be a non-negative integer")
    .customSanitizer((value) => Number(value)),

  body("sku")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 60 })
    .withMessage("SKU must be at most 60 characters"),

  body("isFeatured")
    .optional()
    .custom(
      (value) =>
        value === true ||
        value === false ||
        value === "true" ||
        value === "false",
    )
    .withMessage("isFeatured must be a boolean")
    .customSanitizer((value) => value === true || value === "true"),

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

  ...giftMetaValidators,

  runValidation,
];

module.exports = {
  createProductValidator,
  updateProductValidator,
};
