const multer = require("multer");

const env = require("../config/env");
const { UPLOAD } = require("../config/constants");
const ApiError = require("../utils/ApiError");

const UPLOAD_SUBFOLDERS = Object.freeze({
  products: "products",
  categories: "categories",
  banners: "banners",
  giftBoxes: "gift-boxes",
  wrapStyles: "wrap-styles",
  ribbons: "ribbons",
});

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

const uploadProductImages = createUploader(env.upload.maxFilesPerProduct).array(
  "images",
  env.upload.maxFilesPerProduct,
);

const uploadCategoryImage = createUploader(1).single("image");
const uploadBannerImage = createUploader(1).single("image");
const uploadGiftBoxImage = createUploader(1).single("image");
const uploadWrapStyleImage = createUploader(1).single("image");
const uploadRibbonImage = createUploader(1).single("image");

// Payment proofs are kept in memory and uploaded to private Cloudinary storage.
const uploadPaymentProof = createUploader(1).single("paymentProof");

module.exports = {
  uploadProductImages,
  uploadCategoryImage,
  uploadBannerImage,
  uploadGiftBoxImage,
  uploadWrapStyleImage,
  uploadRibbonImage,
  uploadPaymentProof,
  UPLOAD_SUBFOLDERS,
};
