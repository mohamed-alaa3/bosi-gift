const express = require("express");
const cartController = require("../controllers/cart.controller");
const authenticate = require("../middleware/authenticate");
const {
  addToCartValidator,
  updateCartItemValidator,
  removeCartItemValidator,
} = require("../validators/cart.validator");

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

router.get("/", cartController.get);
router.post("/", addToCartValidator, cartController.add);
router.patch("/:itemId", updateCartItemValidator, cartController.update);
router.delete("/", cartController.clear);
router.delete("/:itemId", removeCartItemValidator, cartController.remove);
router.post("/gift-box", cartController.addGiftBox);
module.exports = router;
