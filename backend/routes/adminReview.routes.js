const express = require("express");
const ctrl = require("../controllers/adminReview.controller");
const {
  adminCreateReviewValidator,
  adminUpdateReviewValidator,
  adminListReviewsValidator,
  reviewIdParamValidator,
} = require("../validators/review.validator");

// Mounted in admin.routes.js at /reviews — authenticate + authorize("admin") already applied.
const router = express.Router();

router.get("/", adminListReviewsValidator, ctrl.list);
router.post("/", adminCreateReviewValidator, ctrl.create);
router.patch("/:id", adminUpdateReviewValidator, ctrl.update);
router.delete("/:id", reviewIdParamValidator, ctrl.remove);

module.exports = router;
