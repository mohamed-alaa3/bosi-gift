const mongoose = require("mongoose");

const translationSchema = new mongoose.Schema(
  {
    en: { type: String, trim: true, default: "" },
    ar: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const BANNER_POSITIONS = ["hero", "promo", "home-mid"];

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: translationSchema,
      required: true,
      validate: {
        validator: (v) => v && (v.en || v.ar),
        message: "Banner title must include English or Arabic",
      },
    },
    subtitle: {
      type: translationSchema,
      default: () => ({}),
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },
    // Cloudinary public_id. Empty for legacy /uploads images.
    imagePublicId: {
      type: String,
      default: "",
    },
    buttonText: {
      type: translationSchema,
      default: () => ({}),
    },
    buttonLink: {
      type: String,
      trim: true,
      default: "",
    },
    position: {
      type: String,
      enum: {
        values: BANNER_POSITIONS,
        message: "Invalid banner position",
      },
      required: true,
      index: true,
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

bannerSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;
module.exports.POSITIONS = BANNER_POSITIONS;
