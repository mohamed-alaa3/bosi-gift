const { fail } = require("../utils/apiResponse");

function notFound(req, res) {
  return fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = notFound;
