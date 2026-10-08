const dotenv = require("dotenv");
dotenv.config();

const required = ["MONGO_URI", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[env] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  apiBaseUrl:
    process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:4200",
  upload: {
    maxFileSizeMB: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 5),
    maxFilesPerProduct: Number(process.env.UPLOAD_MAX_FILES_PER_PRODUCT || 5),
  },
  taxRate: Number(process.env.TAX_RATE || 0),
  shippingFee: Number(process.env.SHIPPING_FEE || 0),
};
