const mongoose = require("mongoose");

const SETTINGS_KEY = "global";

/**
 * Only the editable part of a governorate is stored.
 * Names / regions come from config/governorates.js.
 */
const governorateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

/**
 * Store-wide settings — a SINGLE document (key: "global").
 */
const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: SETTINGS_KEY,
    },

    governorates: { type: [governorateSchema], default: [] },

    payment: {
      // Amount (EGP) the customer transfers now with the "deposit" option
      depositAmount: { type: Number, min: 1, default: 100 },
      // Discount (%) on the merchandise for the "pay in full" option
      fullPaymentDiscountPercent: { type: Number, min: 0, max: 100, default: 3 },
      // Numbers customers transfer money to (empty = method not offered)
      vodafoneCashNumber: { type: String, trim: true, default: "" },
      instapayNumber: { type: String, trim: true, default: "" },
    },

    store: {
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const Setting = mongoose.model("Setting", settingSchema);

module.exports = Setting;
module.exports.SETTINGS_KEY = SETTINGS_KEY;
