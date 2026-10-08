const mongoose = require("mongoose");
const {
  ORDER_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PROOF_METHOD_VALUES,
} = require("../config/constants");

const translationSchema = new mongoose.Schema(
  {
    en: { type: String, trim: true, default: "" },
    ar: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const selectedOptionSchema = new mongoose.Schema(
  {
    name: { type: translationSchema, required: true },
    value: { type: translationSchema, required: true },
  },
  { _id: false },
);

// Snapshot of product info at purchase time
const orderItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["product", "gift-box"],
      default: "product",
    },

    // For products
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: function () {
        return this.type === "product";
      },
    },
    nameSnapshot: {
      type: translationSchema,
      required: true,
    },
    imageSnapshot: {
      type: String,
      default: "",
    },
    priceAtPurchase: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    selectedOptions: {
      type: [selectedOptionSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    // For gift-box items
    giftBox: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false },
);

// Snapshot of shipping address at purchase time
const addressSnapshotSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, default: "" },
    street: { type: String, required: true },
    building: { type: String, default: "" },
    apartment: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    // Phase 3: governorate selected at checkout
    governorate: { type: String, default: "" },
    governorateName: {
      type: translationSchema,
      default: () => ({ en: "", ar: "" }),
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Order must have at least one item",
      },
    },
    shippingAddress: {
      type: addressSnapshotSchema,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Absolute coupon discount
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Full-payment discount (Phase 3). Kept separate from `discount` so
    // the admin can tell the two apart.
    paymentDiscount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Coupon applied to this order. The discount amount itself lives in `discount`.
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
      index: true,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    // Amount the customer must transfer now (deposit or full total).
    // Zero for COD.
    amountDueNow: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Amount collected on delivery (total - amountDueNow). Zero for full payment.
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ORDER_STATUS_VALUES,
        message: "Invalid order status",
      },
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: PAYMENT_STATUS_VALUES,
        message: "Invalid payment status",
      },
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHOD_VALUES,
        message: "Invalid payment method",
      },
      default: "cod",
    },

    // --- Phase 3: payment proof ---
    // Path to the uploaded screenshot (relative to backend/private/payment-proofs).
    // Empty for COD orders (no proof required).
    paymentProofImage: {
      type: String,
      default: "",
    },
    // Which number the customer transferred to: 'vodafone' | 'instapay'
    paymentProofMethod: {
      type: String,
      enum: {
        values: [...PAYMENT_PROOF_METHOD_VALUES, ""],
        message: "Invalid payment proof method",
      },
      default: "",
    },
    paymentProofUploadedAt: {
      type: Date,
      default: null,
    },

    // --- Phase 1: cancellation & payment review audit ---
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason must be at most 500 characters"],
      default: "",
    },
    paymentReviewedAt: {
      type: Date,
      default: null,
    },
    paymentReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes must be at most 500 characters"],
      default: "",
    },
  },
  { timestamps: true },
);

orderSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
module.exports.ORDER_STATUS_VALUES = ORDER_STATUS_VALUES;
module.exports.PAYMENT_STATUS_VALUES = PAYMENT_STATUS_VALUES;
module.exports.PAYMENT_METHOD_VALUES = PAYMENT_METHOD_VALUES;
