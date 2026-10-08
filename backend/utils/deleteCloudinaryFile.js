/**
 * Dispatcher that deletes an image regardless of where it lives.
 *
 * Three input shapes are supported:
 *
 *   1. A full Cloudinary URL  → "https://res.cloudinary.com/.../image.jpg"
 *      → extract the public_id from the URL, then delete the asset.
 *
 *   2. A raw Cloudinary public_id → "habiba/products/abc123"
 *      (i.e. not starting with "/" and not starting with "http")
 *      → delete the asset directly.
 *
 *   3. A legacy local path → "/uploads/products/old-image.jpg" or
 *      "uploads/products/old-image.jpg"
 *      → delegate to the existing deleteUploadedFile utility, so the
 *        behaviour for old images is byte-for-byte identical.
 *
 * Always best-effort: never throws. Callers should wrap with
 * `.catch(() => {})` for consistency with the existing services.
 */

const cloudinaryService = require("../services/cloudinary.service");
const deleteUploadedFile = require("./deleteFile");

/**
 * Extract the Cloudinary public_id from a delivery URL.
 * Cloudinary URLs look like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1234567/habiba/products/abc.jpg
 * The public_id is everything after the version segment, without the extension.
 *
 * @param {string} url
 * @returns {string|null}
 */
function extractPublicIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;

  // Match ".../upload/v<digits>/<public_id>.<ext>"
  // Some URLs may omit the version segment, so allow it to be optional.
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  if (!match || !match[1]) return null;

  return match[1];
}

/**
 * Delete an image identified by URL, public_id, or legacy local path.
 *
 * @param {string} input
 * @returns {Promise<boolean>} true when a deletion was attempted
 *                             successfully, false otherwise.
 */
async function deleteCloudinaryFile(input) {
  if (!input || typeof input !== "string") return false;

  const value = input.trim();
  if (!value) return false;

  // ── 1. Cloudinary URL ─────────────────────────────────────
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(value)) {
    const publicId = extractPublicIdFromUrl(value);
    if (!publicId) return false;
    return cloudinaryService.deleteAsset(publicId);
  }

  // ── 2. Legacy local path (must be checked BEFORE raw public_id) ──
  // Anything that starts with "/uploads/" or "uploads/" is a local path.
  if (value.startsWith("/uploads/") || value.startsWith("uploads/")) {
    return deleteUploadedFile(value).catch(() => false);
  }

  // ── 3. Anything else that looks like an absolute path → not ours ──
  if (value.startsWith("/")) return false;

  // ── 4. Raw Cloudinary public_id ───────────────────────────
  // e.g. "habiba/products/abc123" — no scheme, no leading slash.
  if (/^https?:\/\//i.test(value)) {
    // Any other absolute URL — we don't own it, don't touch it.
    return false;
  }

  return cloudinaryService.deleteAsset(value);
}

module.exports = deleteCloudinaryFile;
