const ApiError = require("../utils/ApiError");

/**
 * Restricts a route to one or more roles.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorize('admin'), handler);
 *   router.get('/staff', authenticate, authorize('admin', 'customer'), handler);
 */
function authorize(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          "You do not have permission to access this resource",
        ),
      );
    }

    return next();
  };
}

module.exports = authorize;
