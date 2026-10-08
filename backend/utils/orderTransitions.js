const ApiError = require("./ApiError");
const { ORDER_TRANSITIONS, ORDER_STATUSES } = require("../config/constants");

/**
 * Checks whether a transition between two order statuses is allowed.
 *
 * Rules:
 * - Same-status "transitions" are not allowed (except when it's a no-op the
 *   caller has already filtered out; here we treat them as invalid).
 * - Every move must be one step in ORDER_TRANSITIONS.
 * - `cancelled` and `delivered` are terminal.
 */
function canTransition(from, to) {
  if (!from || !to) return false;
  if (from === to) return false;
  const allowed = ORDER_TRANSITIONS[from];
  if (!Array.isArray(allowed)) return false;
  return allowed.includes(to);
}

/**
 * Throws an ApiError (409) when the transition isn't allowed.
 * Returns the transition metadata the caller may need.
 */
function assertTransition(from, to) {
  if (
    !ORDER_STATUSES[from?.toUpperCase?.()] &&
    !Object.values(ORDER_STATUSES).includes(from)
  ) {
    throw ApiError.badRequest(`Unknown current status: ${from}`);
  }
  if (!Object.values(ORDER_STATUSES).includes(to)) {
    throw ApiError.badRequest(`Unknown target status: ${to}`);
  }
  if (from === to) {
    throw ApiError.badRequest(`Order is already "${to}"`);
  }
  if (!canTransition(from, to)) {
    throw ApiError.conflict(`Cannot move order from "${from}" to "${to}"`);
  }
  return {
    from,
    to,
    // Whether cancelling here should require an explicit `confirm: true`
    requiresConfirm:
      from === ORDER_STATUSES.PROCESSING && to === ORDER_STATUSES.CANCELLED,
    // Whether a reason is mandatory for this transition
    requiresReason: to === ORDER_STATUSES.CANCELLED,
  };
}

module.exports = {
  canTransition,
  assertTransition,
};
