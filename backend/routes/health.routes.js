const express = require("express");
const mongoose = require("mongoose");
const { ok } = require("../utils/apiResponse");

const router = express.Router();

router.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];

  return ok(res, {
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: dbStates[dbState] || "unknown",
  });
});

module.exports = router;
