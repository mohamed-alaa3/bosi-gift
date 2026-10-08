const mongoose = require("mongoose");

const translationSchema = new mongoose.Schema(
  {
    en: { type: String, trim: true, default: "" },
    ar: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const ribbonSchema = new mongoose.Schema(
  {
    name: {
      type: translationSchema,
      required: true,
      validate: {
        validator: (v) => v && (v.en || v.ar),
        message: "Ribbon name must include English or Arabic",
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
    color: {
      type: String,
      required: [true, "Color is required"],
      trim: true,
      match: [
        /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/,
        "Color must be a valid hex code (e.g. #FF5733)",
      ],
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
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
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

ribbonSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Ribbon = mongoose.model("Ribbon", ribbonSchema);

module.exports = Ribbon;
