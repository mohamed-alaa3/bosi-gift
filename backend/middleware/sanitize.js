const mongoSanitize = require("express-mongo-sanitize");

/**
 * Sanitize strings against XSS by escaping HTML entities.
 * We only sanitize `req.body` string fields (deep), leaving numbers/booleans intact.
 * Applied BEFORE validation so validators see safe input.
 */
function deepSanitize(value) {
  if (Array.isArray(value)) return value.map(deepSanitize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = deepSanitize(value[key]);
    }
    return out;
  }
  if (typeof value === "string") {
    // Escape the dangerous characters only
    return value
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }
  return value;
}

/**
 * Deep-sanitize req.body for XSS.
 * (Query and params usually aren't rendered as HTML, but we sanitize query too.)
 */
function xssSanitizer(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }
  if (req.query && typeof req.query === "object") {
    // Only sanitize string values
    for (const k of Object.keys(req.query)) {
      if (typeof req.query[k] === "string") {
        req.query[k] = deepSanitize(req.query[k]);
      }
    }
  }
  next();
}

/**
 * Combined: strip `$` and `.` from keys to protect against NoSQL injection,
 * then XSS-escape string values.
 */
function sanitizeRequest(req, res, next) {
  // mongo-sanitize mutates req.body/query/params in place
  mongoSanitize.sanitize(req.body || {});
  mongoSanitize.sanitize(req.query || {});
  mongoSanitize.sanitize(req.params || {});
  return xssSanitizer(req, res, next);
}

module.exports = sanitizeRequest;
