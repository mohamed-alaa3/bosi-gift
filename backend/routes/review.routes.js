const express = require("express");
const reviewController = require("../controllers/review.controller");
const authenticate = require("../middleware/authenticate");
const {
  createReviewValidator,
  listProductReviewsValidator,
} = require("../validators/review.validator");

const router = express.Router({ mergeParams: true });

// Public
router.get("/", listProductReviewsValidator, reviewController.listByProduct);

// Protected
router.post("/", authenticate, createReviewValidator, reviewController.create);

module.exports = router;
