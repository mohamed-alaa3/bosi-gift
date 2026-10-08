const mongoose = require("mongoose");
const { COUPON_TYPE_VALUES } = require("../config/constants");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: COUPON_TYPE_VALUES,
        message: "Invalid coupon type",
      },
      required: [true, "Coupon type is required"],
    },
    // percentage: 1–100 | fixed: amount in EGP
    value: {
      type: Number,
      required: [true, "Coupon value is required"],
      min: [0, "Coupon value cannot be negative"],
    },
    // Minimum cart subtotal required to use the coupon
    minOrderAmount: {
      type: Number,
      min: [0, "Minimum order amount cannot be negative"],
      default: null,
    },
    // Cap for percentage coupons
    maxDiscountAmount: {
      type: Number,
      min: [0, "Maximum discount cannot be negative"],
      default: null,
    },
    // Total redemptions allowed across all users (null = unlimited)
    usageLimit: {
      type: Number,
      min: [1, "Usage limit must be at least 1"],
      default: null,
    },
    usedCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Redemptions allowed per user (cancelled orders do not count)
    perUserLimit: {
      type: Number,
      min: [1, "Per-user limit must be at least 1"],
      default: 1,
    },
    validFrom: {
      type: Date,
      default: null,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Empty arrays = coupon applies to the whole cart.
    // If either array has values, only matching product lines are discounted.
    applicableCategories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      default: [],
    },
    applicableProducts: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
  },
  { timestamps: true },
);

couponSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
