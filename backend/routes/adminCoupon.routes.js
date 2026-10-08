const express = require("express");
const adminCouponController = require("../controllers/adminCoupon.controller");
const {
  createCouponValidator,
  updateCouponValidator,
  couponIdParamValidator,
} = require("../validators/coupon.validator");

// Mounted in admin.routes.js at /coupons — authenticate + authorize("admin")
// are already applied there via router.use(...).
const router = express.Router();

router.get("/", adminCouponController.list);
router.get("/:id", couponIdParamValidator, adminCouponController.getOne);
router.post("/", createCouponValidator, adminCouponController.create);
router.patch("/:id", updateCouponValidator, adminCouponController.update);
router.delete("/:id", couponIdParamValidator, adminCouponController.remove);

module.exports = router;
