const { body, param } = require("express-validator");
const { runValidation } = require("./_common");

const subscribeValidator = [
  body("email")
    .exists()
    .withMessage("Email is required")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  runValidation,
];

const subscriberIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid subscriber id"),
  runValidation,
];

const updateSubscriberValidator = [
  param("id").isMongoId().withMessage("Invalid subscriber id"),
  body("isActive")
    .exists()
    .withMessage("isActive is required")
    .custom((v) => v === true || v === false || v === "true" || v === "false")
    .withMessage("isActive must be a boolean")
    .customSanitizer((v) => v === true || v === "true"),
  runValidation,
];

module.exports = {
  subscribeValidator,
  subscriberIdParamValidator,
  updateSubscriberValidator,
};
