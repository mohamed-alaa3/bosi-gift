const express = require("express");
const bannerController = require("../controllers/banner.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const optionalAuthenticate = require("../middleware/optionalAuthenticate");
const { uploadBannerImage } = require("../middleware/upload");
const {
  createBannerValidator,
  updateBannerValidator,
  bannerIdParamValidator,
} = require("../validators/banner.validator");

const router = express.Router();

// Public list (active only). Admins sending a token may pass includeInactive=true.
router.get("/", optionalAuthenticate, bannerController.list);

// Admin only
router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  bannerIdParamValidator,
  bannerController.getOne,
);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  uploadBannerImage,
  createBannerValidator,
  bannerController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  uploadBannerImage,
  updateBannerValidator,
  bannerController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  bannerIdParamValidator,
  bannerController.remove,
);

module.exports = router;
