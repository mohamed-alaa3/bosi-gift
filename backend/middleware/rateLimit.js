const rateLimit = require("express-rate-limit");

/**
 * Strict limiter for auth endpoints (login/register/change-password).
 * Goal: block credential-stuffing and brute-force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Softer general limiter — can be applied globally later if desired.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

/**
 * Coupon validation limiter — makes guessing codes impractical.
 * Generous enough for normal cart edits (the storefront re-validates
 * whenever the cart subtotal changes).
 */
const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many coupon attempts. Please try again later.",
  },
});

module.exports = { authLimiter, generalLimiter, couponLimiter };
