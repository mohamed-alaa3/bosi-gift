const express = require("express");
const addressController = require("../controllers/address.controller");
const authenticate = require("../middleware/authenticate");
const {
  createAddressValidator,
  updateAddressValidator,
  addressIdParamValidator,
} = require("../validators/address.validator");

const router = express.Router();

// All address routes require authentication
router.use(authenticate);

router.get("/", addressController.list);
router.post("/", createAddressValidator, addressController.create);
router.get("/:id", addressIdParamValidator, addressController.getOne);
router.patch("/:id", updateAddressValidator, addressController.update);
router.delete("/:id", addressIdParamValidator, addressController.remove);
router.patch(
  "/:id/default",
  addressIdParamValidator,
  addressController.setDefault,
);

module.exports = router;
