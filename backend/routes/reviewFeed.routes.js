const express = require("express");
const reviewController = require("../controllers/review.controller");
const authenticate = require("../middleware/authenticate");
const {
  createServiceReviewValidator,
  updateOwnReviewValidator,
  orderIdParamValidator,
} = require("../validators/review.validator");

// Mounted at /api/reviews
const router = express.Router();

// Public
router.get("/featured", reviewController.listFeatured);
router.get("/service", reviewController.listService);

// Customer (own data only — identity always comes from the auth token)
router.get("/mine", authenticate, reviewController.listMine);
router.get("/order/:orderId", authenticate, orderIdParamValidator, reviewController.orderState);
router.post("/service", authenticate, createServiceReviewValidator, reviewController.createService);
router.patch("/:id", authenticate, updateOwnReviewValidator, reviewController.updateOwn);

module.exports = router;
