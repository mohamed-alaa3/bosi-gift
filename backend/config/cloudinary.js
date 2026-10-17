/**
 * Cloudinary SDK configuration.
 *
 * Reads credentials from environment variables:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * If any of the three is missing, we export `null` and log a single
 * warning. The server still boots normally — this matches the
 * "optional — local disk if empty" note in .env.example. Callers that
 * actually need to upload (i.e. received a real file) should check
 * `isConfigured()` and fail loudly rather than silently dropping the file.
 *
 * Never log or expose the values of these credentials.
 */

const cloudinary = require("cloudinary").v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isConfigured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

if (isConfigured) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
} else {
  console.warn(
    "[cloudinary] credentials are not fully configured — " +
      "new public image uploads will fail until CLOUDINARY_CLOUD_NAME, " +
      "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env",
  );
}

/**
 * Canonical Cloudinary folder layout for the store.
 * Folder names are fixed — do NOT change them after launch, or existing
 * assets will become unreachable from the admin UI.
 */
const CLOUDINARY_FOLDERS = Object.freeze({
  products: "habiba/products",
  categories: "habiba/categories",
  banners: "habiba/banners",
  giftBoxes: "habiba/gift-boxes",
  wrapStyles: "habiba/wrap-styles",
  ribbons: "habiba/ribbons",
  paymentProofs: "habiba/payment-proofs",
});

module.exports = {
  cloudinary: isConfigured ? cloudinary : null,
  isConfigured,
  CLOUDINARY_FOLDERS,
};
