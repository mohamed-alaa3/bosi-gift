const mongoose = require("mongoose");
const connectDB = require("./config/db");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const hpp = require("hpp");
const path = require("path");

const env = require("./config/env");
const sanitizeRequest = require("./middleware/sanitize");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimit");
const giftBoxRoutes = require("./routes/giftBox.routes");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const addressRoutes = require("./routes/address.routes");
const bannerRoutes = require("./routes/banner.routes");
const newsletterRoutes = require("./routes/newsletter.routes");
const contactRoutes = require("./routes/contact.routes");
const adminRoutes = require("./routes/admin.routes");
const couponRoutes = require("./routes/coupon.routes");
const settingRoutes = require("./routes/setting.routes");
const wrapStyleRoutes = require("./routes/wrapStyle.routes");
const ribbonRoutes = require("./routes/ribbon.routes");
const reviewFeedRoutes = require("./routes/reviewFeed.routes");
const app = express();
///////
// Cache the MongoDB connection across requests
let dbConnectionPromise;

app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!dbConnectionPromise) {
        dbConnectionPromise = connectDB().catch((err) => {
          dbConnectionPromise = null;
          throw err;
        });
      }

      await dbConnectionPromise;
    }

    next();
  } catch (err) {
    next(err);
  }
});
// Don't advertise Express
app.disable("x-powered-by");

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsers (with size limits)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// HTTP Parameter Pollution guard
app.use(hpp());

// Sanitize against NoSQL injection + XSS
app.use(sanitizeRequest);

// Compression
app.use(compression());

// Request logging (dev only)
if (env.nodeEnv === "development") {
  app.use(morgan("dev"));
}

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Global rate limit (soft)
app.use("/api", generalLimiter);

// Health check BEFORE rate limit if desired — leave as is
app.get("/", (req, res) => {
  res.json({ success: true, message: "Habiba Store API" });
});

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/gift-boxes", giftBoxRoutes);
app.use("/api/wrap-styles", wrapStyleRoutes);
app.use("/api/ribbons", ribbonRoutes);
app.use("/api/reviews", reviewFeedRoutes);
// 404 + error
app.use(notFound);
app.use(errorHandler);

module.exports = app;
