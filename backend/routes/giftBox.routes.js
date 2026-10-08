const express = require("express");
const giftBoxController = require("../controllers/giftBox.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadGiftBoxImage } = require("../middleware/upload");
const {
  createGiftBoxValidator,
  updateGiftBoxValidator,
  giftBoxIdParamValidator,
} = require("../validators/giftBox.validator");

const router = express.Router();

// Public
router.get("/", giftBoxController.list);
router.get("/:id", giftBoxController.getOne);

// Admin
router.post(
  "/",
  authenticate,
  authorize("admin"),
  uploadGiftBoxImage,
  createGiftBoxValidator,
  giftBoxController.create,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  uploadGiftBoxImage,
  updateGiftBoxValidator,
  giftBoxController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  giftBoxIdParamValidator,
  giftBoxController.remove,
);

module.exports = router;
