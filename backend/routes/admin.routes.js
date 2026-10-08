const express = require("express");
const adminController = require("../controllers/admin.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const adminCouponRoutes = require("./adminCoupon.routes");
const adminSettingRoutes = require("./adminSetting.routes");
const adminReviewRoutes = require("./adminReview.routes");

const router = express.Router();

// All admin routes require admin role
router.use(authenticate, authorize("admin"));

router.get("/stats/overview", adminController.overview);
router.get("/stats/revenue", adminController.revenueSeries);
router.get("/products/low-stock", adminController.lowStock);
router.get("/products/top", adminController.topProducts);
router.get("/orders/recent", adminController.recentOrders);

// Coupons CRUD → /api/admin/coupons
router.use("/coupons", adminCouponRoutes);

// Reviews moderation + manual testimonials → /api/admin/reviews
router.use("/reviews", adminReviewRoutes);

// Store settings → /api/admin/settings
router.use("/settings", adminSettingRoutes);

module.exports = router;
