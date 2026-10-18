const asyncHandler = require("../utils/asyncHandler");
const { verifyToken } = require("../utils/generateToken");
const User = require("../models/User");

/**
 * Like `authenticate`, but never rejects: if a valid Bearer token for an
 * active user is present, `req.user` is set; otherwise the request continues
 * anonymously. Used on public endpoints that expose extra data to admins.
 */
const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();

  const token = header.slice(7).trim();
  if (!token) return next();

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("-password");
    if (user && user.isActive) req.user = user;
  } catch {
    // Invalid/expired token on a public endpoint → treat as anonymous.
  }
  return next();
});

module.exports = optionalAuthenticate;
