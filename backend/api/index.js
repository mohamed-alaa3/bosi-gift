const mongoose = require("mongoose");
const app = require("../app");
const connectDB = require("../config/db");

let initializationPromise;

async function initialize() {
  await connectDB();

  // Run the review index migration once per server instance.
  try {
    await require("../services/review.service").migrateReviewIndexes();
  } catch (err) {
    console.error("[db] Review migration failed:", err.message);
  }
}

module.exports = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!initializationPromise) {
        initializationPromise = initialize().catch((err) => {
          initializationPromise = null;
          throw err;
        });
      }

      await initializationPromise;
    }

    return app(req, res);
  } catch (err) {
    console.error("[api] Initialization failed:", err.message);

    return res.status(503).json({
      success: false,
      message: "Service temporarily unavailable",
    });
  }
};
