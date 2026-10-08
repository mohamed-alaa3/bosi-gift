/**
 * Convert a string into a URL-friendly slug.
 * Handles English characters, numbers, and basic Arabic transliteration fallback.
 * If the input is Arabic and can't be transliterated, uses a random suffix.
 */
function slugify(input, fallbackPrefix = "item") {
  if (!input || typeof input !== "string") {
    return `${fallbackPrefix}-${Date.now().toString(36)}`;
  }

  // Normalize: remove diacritics, trim, lowercase
  const base = input
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  // Keep ASCII alphanumeric + spaces/dashes
  const ascii = base
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (ascii) return ascii;

  // If nothing usable (e.g. pure Arabic), generate a fallback
  return `${fallbackPrefix}-${Date.now().toString(36)}`;
}

module.exports = slugify;
