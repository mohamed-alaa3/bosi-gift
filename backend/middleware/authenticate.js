const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken } = require("../utils/generateToken");
const User = require("../models/User");

/**
 * Verifies the Bearer token, loads the user, and attaches
 * `req.user` for downstream handlers.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Authentication required");
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw ApiError.unauthorized("Authentication required");
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    throw ApiError.unauthorized("Invalid or expired token");
  }

  const user = await User.findById(decoded.id).select("-password");
  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("Account is disabled");
  }

  req.user = user;
  next();
});

module.exports = authenticate;
