const express = require("express");
const contactController = require("../controllers/contact.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { authLimiter } = require("../middleware/rateLimit");
const {
  createContactValidator,
  contactIdParamValidator,
  updateContactStatusValidator,
} = require("../validators/contact.validator");

const router = express.Router();

// Public — rate-limited
router.post("/", authLimiter, createContactValidator, contactController.create);

// Admin
router.get("/", authenticate, authorize("admin"), contactController.list);
router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  contactIdParamValidator,
  contactController.getOne,
);
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  updateContactStatusValidator,
  contactController.updateStatus,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  contactIdParamValidator,
  contactController.remove,
);

module.exports = router;
