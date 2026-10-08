const mongoose = require("mongoose");

const translationSchema = new mongoose.Schema(
  {
    en: { type: String, trim: true, default: "" },
    ar: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const wrapStyleSchema = new mongoose.Schema(
  {
    name: {
      type: translationSchema,
      required: true,
      validate: {
        validator: (v) => v && (v.en || v.ar),
        message: "Wrap style name must include English or Arabic",
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

wrapStyleSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const WrapStyle = mongoose.model("WrapStyle", wrapStyleSchema);

module.exports = WrapStyle;
