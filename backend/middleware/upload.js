const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const env = require("../config/env");
const { UPLOAD } = require("../config/constants");
const ApiError = require("../utils/ApiError");

// ─────────────────────────────────────────────────────────────
// Public uploads (Cloudinary — kept in memory as Buffers)
// ─────────────────────────────────────────────────────────────
// Normal store images no longer touch the local disk. Multer hands us
// in-memory Buffers which the controllers forward to Cloudinary.
//
// The legacy `backend/uploads/` folder is NOT deleted — old images
// stored there are still served statically and deleted by the existing
// `deleteUploadedFile` utility. See `buildImageUrl` / `deleteFile`.

// Canonical folder names, kept here so controllers can map a resource
// to its Cloudinary folder via the exported `UPLOAD_SUBFOLDERS`.
const UPLOAD_SUBFOLDERS = Object.freeze({
  products: "products",
  categories: "categories",
  banners: "banners",
  giftBoxes: "gift-boxes",
  wrapStyles: "wrap-styles",
  ribbons: "ribbons",
});

// ─────────────────────────────────────────────────────────────
// Private uploads (payment proofs — still on local disk)
// ─────────────────────────────────────────────────────────────
// Stored outside of the static /uploads folder and served only
// through an authenticated endpoint. This path is intentionally NOT
// migrated to Cloudinary — payment proofs may contain sensitive data
// and must not be exposed as public URLs.
const PRIVATE_UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "private",
  "payment-proofs",
);
if (!fs.existsSync(PRIVATE_UPLOAD_DIR)) {
  fs.mkdirSync(PRIVATE_UPLOAD_DIR, { recursive: true });
}

/**
 * Build a multer disk storage for a given absolute folder.
 * Used ONLY by the private payment-proof uploader.
 */
function makeStorage(absoluteDir, prefix) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, absoluteDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = crypto.randomBytes(8).toString("hex");
      cb(null, `${prefix}-${Date.now()}-${unique}${ext}`);
    },
  });
}

/**
 * Reject anything that is not an allowed image type.
 * Applied to both memory (public) and disk (private) uploaders.
 */
function fileFilter(req, file, cb) {
  if (!UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      ApiError.badRequest(
        `Invalid file type. Allowed: ${UPLOAD.ALLOWED_EXTENSIONS.join(", ")}`,
      ),
    );
  }
  return cb(null, true);
}

/**
 * Create a multer instance that keeps files in memory.
 * The controller receives `req.file.buffer` / `req.files[i].buffer`
 * and forwards them to Cloudinary.
 *
 * Limits are identical to the previous disk-based uploader:
 *   - fileSize: env.upload.maxFileSizeMB
 *   - files:    maxFiles
 */
function createUploader(maxFiles) {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: env.upload.maxFileSizeMB * 1024 * 1024,
      files: maxFiles,
    },
  });
}

// ============================================
// Public uploaders (memory storage)
// ============================================

const uploadProductImages = createUploader(env.upload.maxFilesPerProduct).array(
  "images",
  env.upload.maxFilesPerProduct,
);

const uploadCategoryImage = createUploader(1).single("image");
const uploadBannerImage = createUploader(1).single("image");
const uploadGiftBoxImage = createUploader(1).single("image");
const uploadWrapStyleImage = createUploader(1).single("image");
const uploadRibbonImage = createUploader(1).single("image");

// ============================================
// Private uploader — payment proof (disk storage)
// ============================================
// Unchanged: single image, 5 MB max, saved to
// `backend/private/payment-proofs/` with a `proof-<timestamp>-<random>.<ext>` filename.

const uploadPaymentProof = multer({
  storage: makeStorage(PRIVATE_UPLOAD_DIR, "proof"),
  fileFilter,
  limits: {
    fileSize: env.upload.maxFileSizeMB * 1024 * 1024,
    files: 1,
  },
}).single("paymentProof");

module.exports = {
  // Public (memory) — controllers must read `.buffer`
  uploadProductImages,
  uploadCategoryImage,
  uploadBannerImage,
  uploadGiftBoxImage,
  uploadWrapStyleImage,
  uploadRibbonImage,

  // Private (disk) — unchanged
  uploadPaymentProof,

  // Exported for the payment-proof download endpoint in the controller
  PRIVATE_UPLOAD_DIR,

  // Map a resource name to its Cloudinary folder name.
  // The controllers combine this with CLOUDINARY_FOLDERS from
  // `config/cloudinary.js` (which prefixes every name with `habiba/`).
  UPLOAD_SUBFOLDERS,
};
