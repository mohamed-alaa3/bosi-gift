/**
 * Gift discovery taxonomy — single source of truth for the optional
 * product metadata used by the storefront (recipient / occasion filters).
 * The frontend mirrors these slugs in core/constants/gift-taxonomy.ts.
 */
const RECIPIENTS = ["men", "girls", "kids"];

const OCCASIONS = [
  "birthday",
  "wedding",
  "graduation",
  "new-baby",
  "mothers-day",
  "valentines",
  "anniversary",
  "engagement",
  "ramadan",
  "eid",
  "seasonal",
];

// "Trending" = best-selling products (non-cancelled orders) in this window.
const TRENDING_WINDOW_DAYS = 60;
const TRENDING_MAX_PRODUCTS = 50;

module.exports = {
  RECIPIENTS,
  OCCASIONS,
  TRENDING_WINDOW_DAYS,
  TRENDING_MAX_PRODUCTS,
};
