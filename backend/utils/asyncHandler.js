/**
 * Wraps an async route handler so thrown errors are forwarded
 * to Express's error middleware — no try/catch in every controller.
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
