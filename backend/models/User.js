const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["customer", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name must be at most 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: "Role must be either customer or admin",
      },
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // --- Email verification ---
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // --- OTP state (used for both email verification and password reset) ---
    // Each purpose keeps its own hash/expiry/attempts so they don't clash.
    verifyOtpHash: {
      type: String,
      select: false,
    },
    verifyOtpExpiry: {
      type: Date,
      select: false,
    },
    verifyOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    verifyOtpLastSentAt: {
      type: Date,
      select: false,
    },

    resetOtpHash: {
      type: String,
      select: false,
    },
    resetOtpExpiry: {
      type: Date,
      select: false,
    },
    resetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    resetOtpLastSentAt: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true },
);

// Hash password before save (only if modified)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Instance method: compare password
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Hide sensitive fields in JSON responses
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.verifyOtpHash;
    delete ret.verifyOtpExpiry;
    delete ret.verifyOtpAttempts;
    delete ret.verifyOtpLastSentAt;
    delete ret.resetOtpHash;
    delete ret.resetOtpExpiry;
    delete ret.resetOtpAttempts;
    delete ret.resetOtpLastSentAt;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
