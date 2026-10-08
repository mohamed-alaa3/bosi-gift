const mongoose = require("mongoose");

const CONTACT_STATUSES = ["new", "read", "replied"];

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name must be at most 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [200, "Subject must be at most 200 characters"],
      default: "",
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [2000, "Message must be at most 2000 characters"],
    },
    status: {
      type: String,
      enum: {
        values: CONTACT_STATUSES,
        message: "Invalid contact message status",
      },
      default: "new",
      index: true,
    },
  },
  { timestamps: true },
);

contactMessageSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);

module.exports = ContactMessage;
module.exports.CONTACT_STATUSES = CONTACT_STATUSES;
