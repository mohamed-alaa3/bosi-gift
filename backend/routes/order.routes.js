const express = require("express");
const orderController = require("../controllers/order.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadPaymentProof } = require("../middleware/upload");
const {
  quoteOrderValidator,
  createOrderValidator,
  updateOrderStatusValidator,
  orderIdParamValidator,
} = require("../validators/order.validator");

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// ─── Order creation ────────────────────────────────────────
router.post("/quote", quoteOrderValidator, orderController.quote);

// Create order — multipart because of the optional payment proof.
// Multer parses the file; we parse the JSON shippingAddress BEFORE
// the validator runs, so `body("shippingAddress.fullName")` sees it.
router.post(
  "/",
  uploadPaymentProof,
  (req, res, next) => {
    if (req.body && typeof req.body.shippingAddress === "string") {
      try {
        req.body.shippingAddress = JSON.parse(req.body.shippingAddress);
      } catch {
        // Leave it as a string; the validator will report the error.
      }
    }
    next();
  },
  createOrderValidator,
  orderController.create,
);

// ─── Order reads ───────────────────────────────────────────
router.get("/", orderController.list);

// Private payment proof — must come BEFORE the generic `/:id` GET.
router.get(
  "/:id/payment-proof",
  orderIdParamValidator,
  orderController.getPaymentProof,
);

router.get("/:id/tracking", orderIdParamValidator, orderController.tracking);
router.get("/:id", orderIdParamValidator, orderController.getOne);

// ─── Admin ─────────────────────────────────────────────────
router.patch(
  "/:id/status",
  authorize("admin"),
  updateOrderStatusValidator,
  orderController.updateStatus,
);

module.exports = router;
