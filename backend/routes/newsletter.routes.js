const express = require("express");
const newsletterController = require("../controllers/newsletter.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { authLimiter } = require("../middleware/rateLimit");
const {
  subscribeValidator,
  subscriberIdParamValidator,
  updateSubscriberValidator,
} = require("../validators/newsletter.validator");

const router = express.Router();

// Public — rate-limited
router.post(
  "/subscribe",
  authLimiter,
  subscribeValidator,
  newsletterController.subscribe,
);

// Admin
router.get("/", authenticate, authorize("admin"), newsletterController.list);
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  updateSubscriberValidator,
  newsletterController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  subscriberIdParamValidator,
  newsletterController.remove,
);

module.exports = router;
