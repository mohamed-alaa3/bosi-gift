const mongoose = require("mongoose");

const translationSchema = new mongoose.Schema(
  {
    en: { type: String, trim: true, default: "" },
    ar: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const giftBoxSchema = new mongoose.Schema(
  {
    name: {
      type: translationSchema,
      required: true,
      validate: {
        validator: (v) => v && (v.en || v.ar),
        message: "Gift box name must include English or Arabic",
      },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: translationSchema,
      default: () => ({}),
    },
    image: {
      type: String,
      default: "",
    },
    // Cloudinary public_id. Empty for legacy /uploads images.
    imagePublicId: {
      type: String,
      default: "",
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Base price cannot be negative"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [50, "Capacity cannot exceed 50"],
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be an integer",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

giftBoxSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const GiftBox = mongoose.model("GiftBox", giftBoxSchema);

module.exports = GiftBox;
