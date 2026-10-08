const { body, param } = require("express-validator");
const { runValidation } = require("./_common");
const { CONTACT_STATUS_VALUES } = require("../config/constants");

const createContactValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 80 })
    .withMessage("Name must be at most 80 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("subject")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Subject must be at most 200 characters"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 5, max: 2000 })
    .withMessage("Message must be between 5 and 2000 characters"),

  runValidation,
];

const contactIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid contact message id"),
  runValidation,
];

const updateContactStatusValidator = [
  param("id").isMongoId().withMessage("Invalid contact message id"),

  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(CONTACT_STATUS_VALUES)
    .withMessage(`Status must be one of: ${CONTACT_STATUS_VALUES.join(", ")}`),

  runValidation,
];

module.exports = {
  createContactValidator,
  contactIdParamValidator,
  updateContactStatusValidator,
};
