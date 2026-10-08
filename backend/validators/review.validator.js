const { body, param, query } = require("express-validator");
const { runValidation } = require("./_common");

const star = (n) => Number.isInteger(n) && n >= 1 && n <= 5;
const toNum = (v) => (v === null || v === "" ? null : Number(v));

const ratingField = (field = "rating", { optional = false } = {}) => {
  const chain = body(field);
  return (optional ? chain.optional({ nullable: true, checkFalsy: true }) : chain.exists().withMessage(`${field} is required`))
    .custom((v) => star(Number(v)))
    .withMessage(`${field} must be an integer between 1 and 5`)
    .customSanitizer(toNum);
};

// Customer-written text: required, 3–1000 chars.
const requiredComment = body("comment")
  .exists({ checkNull: true })
  .withMessage("Comment is required")
  .bail()
  .isString()
  .withMessage("Comment must be text")
  .bail()
  .trim()
  .isLength({ min: 3, max: 1000 })
  .withMessage("Comment must be between 3 and 1000 characters");

const optionalComment = body("comment")
  .optional()
  .isString()
  .withMessage("Comment must be text")
  .bail()
  .trim()
  .isLength({ min: 3, max: 1000 })
  .withMessage("Comment must be between 3 and 1000 characters");

const serviceRatings = [
  ratingField("customerServiceRating", { optional: true }),
  ratingField("deliveryRating", { optional: true }),
  ratingField("packagingRating", { optional: true }),
];

const idParam = (name) => param(name).isMongoId().withMessage(`Invalid ${name}`);

// POST /products/:productId/reviews  (rating + comment only — everything else is derived server-side)
const createReviewValidator = [idParam("productId"), ratingField(), requiredComment, runValidation];

const listProductReviewsValidator = [idParam("productId"), runValidation];

// POST /reviews/service
const createServiceReviewValidator = [
  body("orderId").isMongoId().withMessage("Invalid orderId"),
  ratingField(),
  requiredComment,
  ...serviceRatings,
  runValidation,
];

// PATCH /reviews/:id  (customer, own review)
const updateOwnReviewValidator = [
  idParam("id"),
  ratingField("rating", { optional: true }),
  optionalComment,
  ...serviceRatings,
  runValidation,
];

const orderIdParamValidator = [idParam("orderId"), runValidation];
const reviewIdParamValidator = [idParam("id"), runValidation];

// ---- Admin ----
const statusField = (optional) => {
  const c = body("status");
  return (optional ? c.optional() : c.optional())
    .isIn(["pending", "approved", "rejected"])
    .withMessage("status must be pending, approved or rejected");
};

const adminCreateReviewValidator = [
  body("type").isIn(["product", "service"]).withMessage("type must be product or service"),
  body("displayName").isString().trim().isLength({ min: 2, max: 80 }).withMessage("displayName must be 2–80 characters"),
  body("product")
    .if(body("type").equals("product"))
    .isMongoId()
    .withMessage("A product is required for product reviews"),
  ratingField(),
  requiredComment,
  ...serviceRatings,
  statusField(false),
  body("createdAt")
    .optional({ checkFalsy: true })
    .custom((v) => !isNaN(Date.parse(v)) && new Date(v) <= new Date(Date.now() + 60_000))
    .withMessage("createdAt must be a valid date that is not in the future")
    .customSanitizer((v) => new Date(v)),
  runValidation,
];

const adminUpdateReviewValidator = [
  idParam("id"),
  statusField(true),
  ratingField("rating", { optional: true }),
  optionalComment,
  body("displayName").optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage("displayName must be 2–80 characters"),
  ...serviceRatings,
  body("createdAt")
    .optional({ checkFalsy: true })
    .custom((v) => !isNaN(Date.parse(v)) && new Date(v) <= new Date(Date.now() + 60_000))
    .withMessage("createdAt must be a valid date that is not in the future")
    .customSanitizer((v) => new Date(v)),
  runValidation,
];

const adminListReviewsValidator = [
  query("type").optional().isIn(["product", "service"]),
  query("status").optional().isIn(["pending", "approved", "rejected"]),
  runValidation,
];

module.exports = {
  createReviewValidator,
  listProductReviewsValidator,
  createServiceReviewValidator,
  updateOwnReviewValidator,
  orderIdParamValidator,
  reviewIdParamValidator,
  adminCreateReviewValidator,
  adminUpdateReviewValidator,
  adminListReviewsValidator,
};
