const mongoose = require("mongoose");

const REVIEW_TYPES = ["product", "service"];
const REVIEW_SOURCES = ["customer", "admin"];

const starField = (label, required = false) => ({
  type: Number,
  min: [1, `${label} must be at least 1`],
  max: [5, `${label} must be at most 5`],
  ...(required ? { required: [true, `${label} is required`] } : { default: null }),
});

/**
 * One collection for BOTH review kinds:
 *  - type "product": about a product (product required)
 *  - type "service": about the overall Bosi Gift experience (no product)
 *
 * source "customer" = written by a real user through the order flow
 *   (user + order set, isVerifiedPurchase true — verified server-side).
 * source "admin"    = testimonial entered manually by an admin
 *   (no user, never "verified purchase").
 *
 * Legacy documents (before this feature) have no type/source; the startup
 * migration (review.service.migrateReviewIndexes) backfills them.
 */
const reviewSchema = new mongoose.Schema(
  {
    type: { type: String, enum: REVIEW_TYPES, default: "product", index: true },
    source: { type: String, enum: REVIEW_SOURCES, default: "customer" },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
      required: [
        function () {
          return this.source !== "admin";
        },
        "User is required",
      ],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
      required: [
        function () {
          return this.type === "product";
        },
        "Product is required for product reviews",
      ],
    },
    // Delivered order that makes this a verified purchase
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    isVerifiedPurchase: { type: Boolean, default: false },

    // Shown publicly for admin-entered testimonials (customers use their account name)
    displayName: { type: String, trim: true, maxlength: 80, default: "" },

    rating: starField("Rating", true),
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, "Comment must be at most 1000 characters"],
      default: "",
    },

    // Optional structured ratings (service reviews)
    customerServiceRating: starField("Customer service rating"),
    deliveryRating: starField("Delivery rating"),
    packagingRating: starField("Packaging rating"),

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

// One product review per customer per product; one service review per customer
// per order. Partial indexes keep admin testimonials and legacy docs out of it.
// (Created by migrateReviewIndexes in production, where autoIndex is off.)
reviewSchema.index(
  { user: 1, product: 1 },
  {
    unique: true,
    name: "uniq_user_product_review",
    partialFilterExpression: {
      type: "product",
      user: { $type: "objectId" },
      product: { $type: "objectId" },
    },
  },
);
reviewSchema.index(
  { user: 1, order: 1 },
  {
    unique: true,
    name: "uniq_user_order_service_review",
    partialFilterExpression: {
      type: "service",
      user: { $type: "objectId" },
      order: { $type: "objectId" },
    },
  },
);
reviewSchema.index({ status: 1, type: 1, createdAt: -1 });

reviewSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Review = mongoose.model("Review", reviewSchema);

Review.REVIEW_TYPES = REVIEW_TYPES;
module.exports = Review;
