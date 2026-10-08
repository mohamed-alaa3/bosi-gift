const fs = require("fs").promises;
const path = require("path");

/**
 * Delete a file that lives under the /uploads directory.
 * Safe: refuses to delete outside of the uploads root.
 *
 * @param {string} relativePath - e.g. "/uploads/products/foo.webp"
 * @returns {Promise<boolean>} true if deleted, false if it did not exist
 */
async function deleteUploadedFile(relativePath) {
  if (!relativePath || typeof relativePath !== "string") return false;

  // Normalize: strip leading "/uploads/" or "uploads/"
  const cleaned = relativePath.replace(/^\/?uploads\//, "");

  const uploadsRoot = path.join(__dirname, "..", "uploads");
  const absolute = path.resolve(uploadsRoot, cleaned);

  // Guard: refuse paths that escape the uploads folder
  if (!absolute.startsWith(uploadsRoot)) {
    return false;
  }

  try {
    await fs.unlink(absolute);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

module.exports = deleteUploadedFile;
