const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/authenticate");
const { authLimiter } = require("../middleware/rateLimit");
const {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  updateMeValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  verifyResetOtpValidator,
  resetPasswordValidator,
} = require("../validators/auth.validator");

const router = express.Router();

// ─── Public ────────────────────────────────────────────────
router.post(
  "/register",
  authLimiter,
  registerValidator,
  authController.register,
);

router.post("/login", authLimiter, loginValidator, authController.login);

// Email verification (public — user is not logged in yet)
router.post(
  "/verify-email",
  authLimiter,
  verifyEmailValidator,
  authController.verifyEmail,
);
router.post(
  "/resend-verification",
  authLimiter,
  resendVerificationValidator,
  authController.resendVerification,
);

// Password reset (OTP flow) — public
router.post(
  "/forgot-password",
  authLimiter,
  forgotPasswordValidator,
  authController.forgotPassword,
);
router.post(
  "/verify-reset-otp",
  authLimiter,
  verifyResetOtpValidator,
  authController.verifyResetOtp,
);
router.post(
  "/reset-password",
  authLimiter,
  resetPasswordValidator,
  authController.resetPassword,
);

// ─── Protected ─────────────────────────────────────────────
router.get("/me", authenticate, authController.me);
router.patch("/me", authenticate, updateMeValidator, authController.updateMe);
router.patch(
  "/change-password",
  authenticate,
  authLimiter,
  changePasswordValidator,
  authController.changePassword,
);

module.exports = router;
