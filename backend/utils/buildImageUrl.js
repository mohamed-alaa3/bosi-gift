const env = require("../config/env");

/**
 * Build a full URL for a stored image path.
 * Input:  "/uploads/products/foo.webp"  OR  "uploads/products/foo.webp"
 * Output: "http://localhost:5000/uploads/products/foo.webp"
 *
 * If the input is already an absolute URL (http/https), returns it as-is.
 * If the input is empty, returns an empty string.
 */
function buildImageUrl(relativePath) {
  if (!relativePath) return "";

  // Already absolute
  if (/^https?:\/\//i.test(relativePath)) {
    return relativePath;
  }

  const base = env.apiBaseUrl.replace(/\/$/, "");
  const clean = relativePath.startsWith("/")
    ? relativePath
    : `/${relativePath}`;

  return `${base}${clean}`;
}

/**
 * Map an array of relative paths to full URLs.
 */
function buildImageUrls(paths) {
  if (!Array.isArray(paths)) return [];
  return paths.map(buildImageUrl);
}

module.exports = { buildImageUrl, buildImageUrls };
