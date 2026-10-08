const express = require("express");
const wishlistController = require("../controllers/wishlist.controller");
const authenticate = require("../middleware/authenticate");
const {
  addToWishlistValidator,
  productIdParamValidator,
} = require("../validators/wishlist.validator");

const router = express.Router();

// All wishlist routes require authentication
router.use(authenticate);

router.get("/", wishlistController.get);
router.post("/", addToWishlistValidator, wishlistController.add);
router.delete(
  "/:productId",
  productIdParamValidator,
  wishlistController.remove,
);

module.exports = router;
