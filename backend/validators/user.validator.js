const { body, param, query } = require("express-validator");
const { runValidation } = require("./_common");

const userIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),
  runValidation,
];

const listUsersValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("search")
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage("search must be at most 100 characters"),
  query("status")
    .optional()
    .isIn(["all", "active", "suspended"])
    .withMessage("status must be all, active or suspended"),
  query("role")
    .optional()
    .isIn(["all", "customer", "admin"])
    .withMessage("role must be all, customer or admin"),
  runValidation,
];

// Only `isActive` is accepted: role/other fields can never be changed here.
const updateUserStatusValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),
  body("isActive").isBoolean({ strict: true }).withMessage("isActive must be a boolean"),
  runValidation,
];

module.exports = {
  userIdParamValidator,
  listUsersValidator,
  updateUserStatusValidator,
};
