const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { generateToken } = require("../utils/generateToken");
const { ROLES, OTP } = require("../config/constants");
const emailService = require("./email.service");

/**
 * Generates a numeric OTP of the configured length.
 */
function generateOtp() {
  const max = 10 ** OTP.LENGTH;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(OTP.LENGTH, "0");
}

// ─────────────────────────────────────────────────────────────
// Register + Email verification
// ─────────────────────────────────────────────────────────────

/**
 * Creates a new customer account (unverified).
 * Sends a verification OTP. Does NOT issue a session token yet.
 */
async function registerUser({ name, email, password, phone }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone: phone || "",
    role: ROLES.CUSTOMER,
    isEmailVerified: false,
  });

  // Generate + send verification OTP
  const otp = generateOtp();
  const hash = await bcrypt.hash(otp, 10);

  user.verifyOtpHash = hash;
  user.verifyOtpExpiry = new Date(Date.now() + OTP.EXPIRY_MINUTES * 60 * 1000);
  user.verifyOtpAttempts = 0;
  user.verifyOtpLastSentAt = new Date();
  await user.save();

  await emailService.sendEmailVerificationOtp({
    to: user.email,
    name: user.name,
    otp,
  });

  // NOTE: no token returned here — user must verify first.
  return {
    user: user.toJSON(),
    message:
      "Account created. Please check your email for the verification code.",
  };
}

/**
 * Verifies the email OTP and issues a session token.
 */
async function verifyEmailOtp({ email, otp }) {
  const user = await User.findOne({ email }).select(
    "+verifyOtpHash +verifyOtpExpiry +verifyOtpAttempts",
  );

  if (!user) throw ApiError.badRequest("Invalid or expired code.");

  if (user.isEmailVerified) {
    // Already verified — idempotent: just return a fresh token.
    const token = generateToken({ id: user._id.toString(), role: user.role });
    return { user: user.toJSON(), token };
  }

  if (!user.verifyOtpHash || !user.verifyOtpExpiry) {
    throw ApiError.badRequest("Invalid or expired code.");
  }

  if (user.verifyOtpExpiry.getTime() < Date.now()) {
    throw ApiError.badRequest("Code has expired. Please request a new one.");
  }

  if (user.verifyOtpAttempts >= OTP.MAX_ATTEMPTS) {
    throw ApiError.badRequest(
      "Too many incorrect attempts. Please request a new code.",
    );
  }

  const matches = await bcrypt.compare(otp, user.verifyOtpHash);
  if (!matches) {
    user.verifyOtpAttempts += 1;
    await user.save();
    const remaining = OTP.MAX_ATTEMPTS - user.verifyOtpAttempts;
    throw ApiError.badRequest(
      remaining > 0
        ? `Incorrect code. ${remaining} attempts remaining.`
        : "Too many incorrect attempts. Please request a new code.",
    );
  }

  // Success — verify + clear OTP state
  user.isEmailVerified = true;
  user.verifyOtpHash = undefined;
  user.verifyOtpExpiry = undefined;
  user.verifyOtpAttempts = 0;
  await user.save();

  const token = generateToken({ id: user._id.toString(), role: user.role });
  return { user: user.toJSON(), token };
}

/**
 * Resends the email verification OTP (with cooldown).
 */
async function resendVerificationOtp({ email }) {
  const user = await User.findOne({ email }).select(
    "+verifyOtpLastSentAt +verifyOtpHash +verifyOtpExpiry +verifyOtpAttempts",
  );

  // Don't reveal whether the email exists / is verified.
  const genericResponse = {
    message:
      "If that email exists and isn't verified yet, a new code has been sent.",
  };

  if (!user || user.isEmailVerified || !user.isActive) {
    return genericResponse;
  }

  if (user.verifyOtpLastSentAt) {
    const elapsed = (Date.now() - user.verifyOtpLastSentAt.getTime()) / 1000;
    if (elapsed < OTP.RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(OTP.RESEND_COOLDOWN_SECONDS - elapsed);
      throw ApiError.badRequest(
        `Please wait ${wait} seconds before requesting a new code.`,
      );
    }
  }

  const otp = generateOtp();
  const hash = await bcrypt.hash(otp, 10);

  user.verifyOtpHash = hash;
  user.verifyOtpExpiry = new Date(Date.now() + OTP.EXPIRY_MINUTES * 60 * 1000);
  user.verifyOtpAttempts = 0;
  user.verifyOtpLastSentAt = new Date();
  await user.save();

  await emailService.sendEmailVerificationOtp({
    to: user.email,
    name: user.name,
    otp,
  });

  return genericResponse;
}

// ─────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────

/**
 * Authenticates email + password.
 * Blocks login until the email is verified.
 */
async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("Account is disabled");
  }

  const match = await user.comparePassword(password);
  if (!match) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Email verification gate
  if (!user.isEmailVerified) {
    throw ApiError.forbidden(
      "Please verify your email first. Check your inbox for the verification code.",
    );
  }

  const token = generateToken({ id: user._id.toString(), role: user.role });
  const safeUser = user.toJSON();

  return { user: safeUser, token };
}

// ─────────────────────────────────────────────────────────────
// Profile + password (authenticated)
// ─────────────────────────────────────────────────────────────

function getCurrentUser(user) {
  return user.toJSON();
}

async function updateProfile(userId, { name, phone }) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;

  await user.save();
  return user.toJSON();
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select("+password");
  if (!user) throw ApiError.notFound("User not found");

  const match = await user.comparePassword(currentPassword);
  if (!match) throw ApiError.badRequest("Current password is incorrect");

  user.password = newPassword;
  await user.save();
}

// ─────────────────────────────────────────────────────────────
// Password reset (OTP flow)
// ─────────────────────────────────────────────────────────────

async function requestPasswordReset({ email }) {
  const user = await User.findOne({ email }).select(
    "+resetOtpHash +resetOtpExpiry +resetOtpAttempts +resetOtpLastSentAt",
  );

  if (!user || !user.isActive) {
    return { message: "If that email exists, a code has been sent." };
  }

  if (user.resetOtpLastSentAt) {
    const elapsed = (Date.now() - user.resetOtpLastSentAt.getTime()) / 1000;
    if (elapsed < OTP.RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(OTP.RESEND_COOLDOWN_SECONDS - elapsed);
      throw ApiError.badRequest(
        `Please wait ${wait} seconds before requesting a new code.`,
      );
    }
  }

  const otp = generateOtp();
  const hash = await bcrypt.hash(otp, 10);

  user.resetOtpHash = hash;
  user.resetOtpExpiry = new Date(Date.now() + OTP.EXPIRY_MINUTES * 60 * 1000);
  user.resetOtpAttempts = 0;
  user.resetOtpLastSentAt = new Date();
  await user.save();

  await emailService.sendPasswordResetOtp({
    to: user.email,
    name: user.name,
    otp,
  });

  return { message: "If that email exists, a code has been sent." };
}

async function verifyResetOtp({ email, otp }) {
  const user = await User.findOne({ email }).select(
    "+resetOtpHash +resetOtpExpiry +resetOtpAttempts",
  );

  if (!user) throw ApiError.badRequest("Invalid or expired code.");

  if (!user.resetOtpHash || !user.resetOtpExpiry) {
    throw ApiError.badRequest("Invalid or expired code.");
  }

  if (user.resetOtpExpiry.getTime() < Date.now()) {
    throw ApiError.badRequest("Code has expired. Please request a new one.");
  }

  if (user.resetOtpAttempts >= OTP.MAX_ATTEMPTS) {
    throw ApiError.badRequest(
      "Too many incorrect attempts. Please request a new code.",
    );
  }

  const matches = await bcrypt.compare(otp, user.resetOtpHash);
  if (!matches) {
    user.resetOtpAttempts += 1;
    await user.save();
    const remaining = OTP.MAX_ATTEMPTS - user.resetOtpAttempts;
    throw ApiError.badRequest(
      remaining > 0
        ? `Incorrect code. ${remaining} attempts remaining.`
        : "Too many incorrect attempts. Please request a new code.",
    );
  }

  user.resetOtpHash = undefined;
  user.resetOtpExpiry = undefined;
  user.resetOtpAttempts = 0;
  await user.save();

  const resetToken = jwt.sign(
    { id: user._id.toString(), purpose: OTP.PURPOSES.PASSWORD_RESET },
    process.env.JWT_SECRET,
    { expiresIn: OTP.RESET_TOKEN_EXPIRES_IN },
  );

  return { resetToken };
}

async function resetPassword({ resetToken, newPassword }) {
  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    throw ApiError.badRequest("Reset session expired. Please start over.");
  }

  if (payload.purpose !== OTP.PURPOSES.PASSWORD_RESET) {
    throw ApiError.badRequest("Invalid reset token.");
  }

  const user = await User.findById(payload.id).select("+password");
  if (!user) throw ApiError.notFound("User not found");

  user.password = newPassword;
  await user.save();

  emailService
    .sendPasswordChangedConfirmation({ to: user.email, name: user.name })
    .catch((err) => console.error("Confirmation email failed:", err.message));

  return { message: "Password updated successfully." };
}

module.exports = {
  registerUser,
  verifyEmailOtp,
  resendVerificationOtp,
  loginUser,
  getCurrentUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
};
