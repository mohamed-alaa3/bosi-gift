const express = require("express");
const settingController = require("../controllers/setting.controller");

const router = express.Router();

// Public, read-only
router.get("/public", settingController.getPublic);

module.exports = router;
