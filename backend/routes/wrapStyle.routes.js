const express = require("express");
const wrapStyleController = require("../controllers/wrapStyle.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadWrapStyleImage } = require("../middleware/upload");
const {
  createWrapStyleValidator,
  updateWrapStyleValidator,
  wrapStyleIdParamValidator,
} = require("../validators/wrapStyle.validator");

const router = express.Router();

// Public
router.get("/", wrapStyleController.list);
router.get("/:id", wrapStyleController.getOne);

// Admin
router.post(
  "/",
  authenticate,
  authorize("admin"),
  uploadWrapStyleImage,
  createWrapStyleValidator,
  wrapStyleController.create,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  uploadWrapStyleImage,
  updateWrapStyleValidator,
  wrapStyleController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  wrapStyleIdParamValidator,
  wrapStyleController.remove,
);

module.exports = router;
