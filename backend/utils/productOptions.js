const ApiError = require("./ApiError");

/**
 * Validates client-submitted option selections against the product's own
 * options and returns a canonical snapshot built from the PRODUCT's data
 * (never the client's), so persisted selections are always trustworthy.
 *
 * A client option matches a product option group/value when its `en` or `ar`
 * text equals the product's (trimmed). Rules:
 *  - every selection must reference a real option group and one of its values
 *  - at most one value per group
 *  - when the product defines options, one value per group is required
 *  - products without options accept no selections
 *
 * @param {object} product   Product document/object (needs `options`, `name`)
 * @param {Array}  selected  Raw selections: [{ name:{en,ar}, value:{en,ar} }]
 * @returns {Array<{name:{en,ar}, value:{en,ar}}>}
 */
function resolveSelectedOptions(product, selected) {
  const groups = Array.isArray(product.options) ? product.options : [];
  const raw = Array.isArray(selected) ? selected : [];
  const label = product.name?.en || product.name?.ar || "product";

  if (groups.length === 0) {
    if (raw.length > 0) {
      throw ApiError.badRequest(`"${label}" does not have selectable options`);
    }
    return [];
  }

  const same = (a, b) => {
    const norm = (v) => (typeof v === "string" ? v.trim() : "");
    const [aEn, aAr, bEn, bAr] = [
      norm(a?.en),
      norm(a?.ar),
      norm(b?.en),
      norm(b?.ar),
    ];
    return (aEn && aEn === bEn) || (aAr && aAr === bAr);
  };

  const resolved = new Map(); // group index -> canonical option

  for (const sel of raw) {
    const gi = groups.findIndex((g) => same(g.name, sel?.name));
    if (gi === -1) {
      throw ApiError.badRequest(`Invalid option selected for "${label}"`);
    }
    const group = groups[gi];
    const value = (group.values || []).find((v) => same(v.name, sel?.value));
    if (!value) {
      throw ApiError.badRequest(
        `Invalid value for option "${group.name?.en || group.name?.ar}" on "${label}"`,
      );
    }
    if (resolved.has(gi)) {
      throw ApiError.badRequest(
        `Only one value can be selected for "${group.name?.en || group.name?.ar}"`,
      );
    }
    resolved.set(gi, {
      name: { en: group.name?.en || "", ar: group.name?.ar || "" },
      value: { en: value.name?.en || "", ar: value.name?.ar || "" },
    });
  }

  const missing = groups.filter((_, i) => !resolved.has(i));
  if (missing.length > 0) {
    const names = missing
      .map((g) => g.name?.en || g.name?.ar)
      .filter(Boolean)
      .join(", ");
    throw ApiError.badRequest(
      `Please select: ${names} (for "${label}")`,
      [{ field: "selectedOptions", message: "OPTIONS_REQUIRED" }],
    );
  }

  // Keep the product's group order for stable display/merge keys.
  return groups.map((_, i) => resolved.get(i));
}

module.exports = { resolveSelectedOptions };
