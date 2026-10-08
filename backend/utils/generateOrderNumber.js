const crypto = require("crypto");

/**
 * Generate a human-friendly, unique order number.
 * Format: HB-<8 hex chars uppercase> — e.g. HB-3F9A2C1D
 * Collisions are astronomically unlikely (32-bit space) and would be
 * caught by the unique index on Order.orderNumber if they happened.
 */
function generateOrderNumber() {
  const hex = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `HB-${hex}`;
}

module.exports = generateOrderNumber;
