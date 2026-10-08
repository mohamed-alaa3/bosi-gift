const express = require("express");
const categoryController = require("../controllers/category.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadCategoryImage } = require("../middleware/upload");
const {
  createCategoryValidator,
  updateCategoryValidator,
} = require("../validators/category.validator");

const router = express.Router();

// Public
router.get("/", categoryController.list);
router.get("/:id", categoryController.getOne);

// Admin only
router.post(
  "/",
  authenticate,
  authorize("admin"),
  uploadCategoryImage,
  createCategoryValidator,
  categoryController.create,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  uploadCategoryImage,
  updateCategoryValidator,
  categoryController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  categoryController.remove,
);

module.exports = router;
