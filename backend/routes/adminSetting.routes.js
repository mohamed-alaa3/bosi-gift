const express = require("express");
const settingController = require("../controllers/setting.controller");

// Mounted in admin.routes.js at /settings — authenticate + authorize("admin")
// are already applied there via router.use(...).
const router = express.Router();

router.get("/", settingController.getAdmin);
router.patch("/", settingController.update);

module.exports = router;
