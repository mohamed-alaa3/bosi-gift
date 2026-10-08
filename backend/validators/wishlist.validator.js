const { body, param } = require("express-validator");
const { runValidation } = require("./_common");

const addToWishlistValidator = [
  body("productId")
    .exists()
    .withMessage("productId is required")
    .isMongoId()
    .withMessage("productId must be a valid ID"),
  runValidation,
];

const productIdParamValidator = [
  param("productId").isMongoId().withMessage("Invalid product id"),
  runValidation,
];

module.exports = {
  addToWishlistValidator,
  productIdParamValidator,
};
