const express = require("express");
const productController = require("../controllers/product.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadProductImages } = require("../middleware/upload");
const {
  createProductValidator,
  updateProductValidator,
} = require("../validators/product.validator");

const router = express.Router();
const reviewRoutes = require("./review.routes");
// Public
router.get("/", productController.list);
router.get("/:id/related", productController.related);
router.use("/:productId/reviews", reviewRoutes);
router.get("/:id", productController.getOne);

// Admin only
router.post(
  "/",
  authenticate,
  authorize("admin"),
  uploadProductImages,
  createProductValidator,
  productController.create,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  uploadProductImages,
  updateProductValidator,
  productController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  productController.remove,
);

module.exports = router;
