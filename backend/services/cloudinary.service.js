/**
 * Thin wrapper around the Cloudinary SDK.
 *
 * Responsibilities:
 *   - uploadBuffer(buffer, folder, options) → { secure_url, public_id }
 *   - deleteAsset(publicId)                  → boolean
 *   - isConfigured()                         → boolean
 *
 * Design notes:
 *   - uploadBuffer throws when Cloudinary is not configured, because by the
 *     time it is called the caller has already accepted a real file. Failing
 *     silently would lose the upload with no trace.
 *   - deleteAsset is best-effort and never throws — matches the existing
 *     `deleteUploadedFile(...).catch(() => {})` convention in the services.
 *   - Uses `cloudinary.uploader.upload_stream` with an in-memory Buffer.
 *     No multer-storage-cloudinary dependency.
 */

const {
  cloudinary,
  isConfigured,
  CLOUDINARY_FOLDERS,
} = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");

/**
 * Whether the Cloudinary SDK has been configured with credentials.
 */
function isCloudinaryConfigured() {
  return isConfigured;
}

/**
 * Upload an in-memory file Buffer to Cloudinary.
 *
 * @param {Buffer} buffer            - File contents (from multer memoryStorage).
 * @param {string} folder            - Target folder, e.g. CLOUDINARY_FOLDERS.products.
 * @param {object} [options]         - Extra Cloudinary upload options.
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
function uploadBuffer(buffer, folder, options = {}) {
  if (!isConfigured) {
    return Promise.reject(
      ApiError.internal(
        "Cloudinary is not configured on this server. Image uploads are unavailable.",
      ),
    );
  }

  if (!buffer || !Buffer.isBuffer(buffer)) {
    return Promise.reject(ApiError.badRequest("Invalid file buffer"));
  }

  if (!folder || typeof folder !== "string") {
    return Promise.reject(ApiError.badRequest("Cloudinary folder is required"));
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: "image",
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (err, result) => {
        if (err) {
          return reject(
            ApiError.internal(err.message || "Cloudinary upload failed"),
          );
        }
        if (!result || !result.secure_url || !result.public_id) {
          return reject(
            ApiError.internal("Cloudinary returned an unexpected response"),
          );
        }
        return resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );

    stream.end(buffer);
  });
}

/**
 * Delete a Cloudinary asset by public_id.
 * Best-effort: never throws. Returns true when the asset was deleted
 * (or did not exist), false when Cloudinary is not configured or the
 * call failed.
 *
 * @param {string} publicId
 * @returns {Promise<boolean>}
 */
async function deleteAsset(publicId) {
  if (!publicId || typeof publicId !== "string") return false;
  if (!isConfigured) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
    // Cloudinary returns { result: "ok" } on success,
    // or { result: "not found" } when the asset doesn't exist.
    return result && (result.result === "ok" || result.result === "not found");
  } catch {
    return false;
  }
}

module.exports = {
  isCloudinaryConfigured,
  uploadBuffer,
  deleteAsset,
  CLOUDINARY_FOLDERS,
};
