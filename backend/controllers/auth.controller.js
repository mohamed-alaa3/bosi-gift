const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const authService = require("../services/auth.service");

/**
 * POST /api/auth/register
 * Creates an unverified account and sends a verification OTP.
 * No session token is issued until the email is verified.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const result = await authService.registerUser({
    name,
    email,
    password,
    phone,
  });
  return ok(res, result, undefined, 201);
});

/**
 * POST /api/auth/verify-email
 * Verifies the email OTP and returns a session token.
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyEmailOtp({ email, otp });
  return ok(res, result);
});

/**
 * POST /api/auth/resend-verification
 * Resends the verification OTP (with cooldown).
 */
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendVerificationOtp({ email });
  return ok(res, result);
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password });
  return ok(res, result);
});

/**
 * GET /api/auth/me  (protected)
 */
const me = asyncHandler(async (req, res) => {
  const user = authService.getCurrentUser(req.user);
  return ok(res, user);
});

/**
 * PATCH /api/auth/me  (protected)
 */
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await authService.updateProfile(req.user._id, { name, phone });
  return ok(res, user);
});

/**
 * PATCH /api/auth/change-password  (protected)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, {
    currentPassword,
    newPassword,
  });
  return ok(res, { message: "Password updated successfully" });
});

// ─────────────────────────────────────────────────────────────
// Password reset (public)
// ─────────────────────────────────────────────────────────────

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.requestPasswordReset({ email });
  return ok(res, result);
});

const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyResetOtp({ email, otp });
  return ok(res, result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  const result = await authService.resetPassword({ resetToken, newPassword });
  return ok(res, result);
});

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  me,
  updateMe,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
