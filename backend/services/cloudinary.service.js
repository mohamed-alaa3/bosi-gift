const {
  cloudinary,
  isConfigured,
  CLOUDINARY_FOLDERS,
} = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");

function isCloudinaryConfigured() {
  return isConfigured;
}

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
          format: result.format,
        });
      },
    );

    stream.end(buffer);
  });
}

/**
 * Generate a short-lived download URL for a private/authenticated asset.
 * Call this only after verifying the requesting user's authorization.
 */
async function getAuthenticatedDownloadUrl(publicId) {
  if (!isConfigured || !cloudinary) {
    throw ApiError.internal("Cloudinary is not configured");
  }

  if (!publicId || typeof publicId !== "string") {
    throw ApiError.badRequest("Invalid Cloudinary asset ID");
  }

  const resource = await cloudinary.api.resource(publicId, {
    resource_type: "image",
    type: "authenticated",
  });

  if (!resource || !resource.format) {
    throw ApiError.notFound("Payment proof is unavailable");
  }

  const downloadUrl = cloudinary.utils.private_download_url(
    publicId,
    resource.format,
    {
      resource_type: "image",
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 60,
    },
  );

  return {
    downloadUrl,
    format: resource.format,
  };
}

/**
 * Delete an asset. Existing callers continue to delete public assets;
 * private callers can pass { type: "authenticated" }.
 */
async function deleteAsset(publicId, options = {}) {
  if (!publicId || typeof publicId !== "string") return false;
  if (!isConfigured || !cloudinary) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      type: options.type || "upload",
      invalidate: true,
    });

    return result && (result.result === "ok" || result.result === "not found");
  } catch {
    return false;
  }
}

module.exports = {
  isCloudinaryConfigured,
  uploadBuffer,
  getAuthenticatedDownloadUrl,
  deleteAsset,
  CLOUDINARY_FOLDERS,
};
