const env = require("../config/env");
const { fail } = require("../utils/apiResponse");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose: invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier";
  }

  // Mongoose: validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  }

  // Mongo: duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = `Duplicate value for ${field}`;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired token";
  }

  // Multer file-size limit
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    message = "File is too large";
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    statusCode = 400;
    message = "Too many files uploaded";
  }

  // Log in non-test
  if (env.nodeEnv !== "test") {
    console.error(`[error] ${req.method} ${req.originalUrl} → ${message}`);
    if (env.nodeEnv === "development" && err.stack) {
      console.error(err.stack);
    }
  }

  // Never leak internal errors in production
  if (env.nodeEnv === "production" && statusCode >= 500) {
    message = "Internal Server Error";
  }

  return fail(res, message, statusCode, err.errors);
}

module.exports = errorHandler;
