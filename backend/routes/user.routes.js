const express = require("express");
const userController = require("../controllers/user.controller");
const {
  listUsersValidator,
  updateUserStatusValidator,
  userIdParamValidator,
} = require("../validators/user.validator");

// Mounted at /api/admin/users — admin.routes already applies
// authenticate + authorize("admin") to everything under it.
const router = express.Router();

router.get("/", listUsersValidator, userController.list);
router.patch("/:id/status", updateUserStatusValidator, userController.setStatus);
router.delete("/:id", userIdParamValidator, userController.remove);

module.exports = router;
