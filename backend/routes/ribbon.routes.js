const express = require("express");
const ribbonController = require("../controllers/ribbon.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadRibbonImage } = require("../middleware/upload");
const {
  createRibbonValidator,
  updateRibbonValidator,
  ribbonIdParamValidator,
} = require("../validators/ribbon.validator");

const router = express.Router();

// Public
router.get("/", ribbonController.list);
router.get("/:id", ribbonController.getOne);

// Admin
router.post(
  "/",
  authenticate,
  authorize("admin"),
  uploadRibbonImage,
  createRibbonValidator,
  ribbonController.create,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  uploadRibbonImage,
  updateRibbonValidator,
  ribbonController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  ribbonIdParamValidator,
  ribbonController.remove,
);

module.exports = router;
