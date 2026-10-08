const { body } = require("express-validator");
const { runValidation } = require("./_common");
const { OTP } = require("../config/constants");

// ─── Password strength helper ──────────────────────────────────
// Server-side check. Frontend shows the live checklist, but the
// backend is still authoritative.
const PASSWORD_MIN_LENGTH = 8;
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).+$/;

const passwordRules = (field = "password") =>
  body(field)
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage("Password must be at least 8 characters")
    .matches(STRONG_PASSWORD_REGEX)
    .withMessage(
      "Password must contain uppercase, lowercase, number, and special character",
    );

// ─── Register ──────────────────────────────────────────────────
const registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  passwordRules("password"),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must be at most 20 characters"),

  runValidation,
];

// ─── Login ─────────────────────────────────────────────────────
const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),

  runValidation,
];

// ─── Email verification ────────────────────────────────────────
const verifyEmailValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("Code is required")
    .isLength({ min: OTP.LENGTH, max: OTP.LENGTH })
    .withMessage(`Code must be ${OTP.LENGTH} digits`)
    .isNumeric()
    .withMessage("Code must be numeric"),

  runValidation,
];

const resendVerificationValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  runValidation,
];

// ─── Profile ───────────────────────────────────────────────────
const updateMeValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters"),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must be at most 20 characters"),

  runValidation,
];

const changePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  passwordRules("newPassword"),

  runValidation,
];

// ─── Password reset ────────────────────────────────────────────
const forgotPasswordValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  runValidation,
];

const verifyResetOtpValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("Code is required")
    .isLength({ min: OTP.LENGTH, max: OTP.LENGTH })
    .withMessage(`Code must be ${OTP.LENGTH} digits`)
    .isNumeric()
    .withMessage("Code must be numeric"),

  runValidation,
];

const resetPasswordValidator = [
  body("resetToken").notEmpty().withMessage("Reset token is required"),

  passwordRules("newPassword"),

  runValidation,
];

module.exports = {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  updateMeValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  verifyResetOtpValidator,
  resetPasswordValidator,
};
