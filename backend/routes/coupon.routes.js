const express = require("express");
const couponController = require("../controllers/coupon.controller");
const authenticate = require("../middleware/authenticate");
const { couponLimiter } = require("../middleware/rateLimit");
const { validateCouponValidator } = require("../validators/coupon.validator");

const router = express.Router();

// Any authenticated user can validate a code against their own cart
router.post(
  "/validate",
  authenticate,
  couponLimiter,
  validateCouponValidator,
  couponController.validate,
);

module.exports = router;
