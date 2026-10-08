const { body, param } = require("express-validator");
const { runValidation } = require("./_common");

const addToCartValidator = [
  body("productId")
    .exists()
    .withMessage("productId is required")
    .isMongoId()
    .withMessage("productId must be a valid ID"),

  body("quantity")
    .optional()
    .custom((value) => {
      const n = Number(value);
      return !isNaN(n) && n > 0 && Number.isInteger(n);
    })
    .withMessage("Quantity must be a positive integer")
    .customSanitizer((value) => Number(value)),

  body("selectedOptions")
    .optional()
    .custom((value) => {
      if (value === undefined || value === null || value === "") return true;
      // Accept array or JSON string
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    })
    .withMessage("selectedOptions must be an array or JSON string"),

  runValidation,
];

const updateCartItemValidator = [
  param("itemId").isMongoId().withMessage("Invalid cart item id"),

  body("quantity")
    .exists()
    .withMessage("Quantity is required")
    .custom((value) => {
      const n = Number(value);
      return !isNaN(n) && n > 0 && Number.isInteger(n);
    })
    .withMessage("Quantity must be a positive integer")
    .customSanitizer((value) => Number(value)),

  runValidation,
];

const removeCartItemValidator = [
  param("itemId").isMongoId().withMessage("Invalid cart item id"),
  runValidation,
];

module.exports = {
  addToCartValidator,
  updateCartItemValidator,
  removeCartItemValidator,
};
