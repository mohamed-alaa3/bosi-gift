const mongoose = require("mongoose");

const translationSchema = new mongoose.Schema(
  {
    en: { type: String, trim: true, default: "" },
    ar: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

// Snapshot of the chosen option at time of adding to cart
const selectedOptionSchema = new mongoose.Schema(
  {
    name: { type: translationSchema, required: true },
    value: { type: translationSchema, required: true },
  },
  { _id: false },
);

const cartItemSchema = new mongoose.Schema(
  {
    // Discriminator
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
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    selectedOptions: {
      type: [selectedOptionSchema],
      default: [],
    },

    // For gift boxes
    giftBox: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Expected shape (same as order item):
      // {
      //   boxId, boxName, boxPrice, boxImage, capacity,
      //   items: [{ productId, name, price, image, quantity }],
      //   wrapStyleId, wrapName, wrapPrice, wrapImage,
      //   ribbonId, ribbonName, ribbonPrice, ribbonColor, ribbonImage,
      //   note
      // }
    },
  },
  { _id: true },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  { timestamps: true },
);

cartSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
