const User = require("../models/User");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Address = require("../models/Address");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../config/constants");

// Orders in these states are still being fulfilled / paid for.
const IN_FLIGHT_ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped"];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Public-safe projection. Whitelist only — never password/OTP fields.
 */
function toAdminUser(u) {
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    role: u.role,
    isActive: u.isActive,
    isEmailVerified: u.isEmailVerified,
    createdAt: u.createdAt,
  };
}

async function listUsers(query = {}) {
  const filter = {};

  if (query.status === "active") filter.isActive = true;
  if (query.status === "suspended") filter.isActive = false;
  if (query.role === "customer" || query.role === "admin") {
    filter.role = query.role;
  }

  const search = typeof query.search === "string" ? query.search.trim() : "";
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("name email phone role isActive isEmailVerified createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map(toAdminUser),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Shared guard for suspend / reactivate / delete.
 * - Admins can't act on themselves (no accidental lock-out).
 * - Privileged (admin) accounts can't be suspended or deleted through this API.
 */
async function loadManageableUser(actor, targetId) {
  const target = await User.findById(targetId);
  if (!target) throw ApiError.notFound("User not found");

  if (target._id.toString() === actor._id.toString()) {
    throw ApiError.forbidden("You cannot change or delete your own account");
  }
  if (target.role === ROLES.ADMIN) {
    throw ApiError.forbidden("Administrator accounts cannot be modified here");
  }
  return target;
}

async function setUserStatus(actor, targetId, isActive) {
  const target = await loadManageableUser(actor, targetId);
  if (target.isActive !== isActive) {
    target.isActive = isActive;
    await target.save();
  }
  return toAdminUser(target);
}

/**
 * Delete a customer account.
 *
 * Strategy:
 *  - Orders are NEVER deleted or modified: each already carries immutable
 *    snapshots (address, names, prices), so history/financials stay intact.
 *  - Reviews are kept (public content; they already render with a null user).
 *  - Personal, non-historical data (cart, wishlist, saved addresses) is removed.
 *  - Blocked while the user has orders still in progress → suspend instead.
 */
async function deleteUser(actor, targetId) {
  const target = await loadManageableUser(actor, targetId);

  const inFlight = await Order.countDocuments({
    user: target._id,
    status: { $in: IN_FLIGHT_ORDER_STATUSES },
  });
  if (inFlight > 0) {
    throw ApiError.conflict(
      `This user has ${inFlight} order(s) still in progress. Complete or cancel them first, or suspend the account instead.`,
    );
  }

  await Promise.all([
    Cart.deleteMany({ user: target._id }),
    Wishlist.deleteMany({ user: target._id }),
    Address.deleteMany({ user: target._id }),
  ]);
  await target.deleteOne();

  return { _id: target._id.toString() };
}

module.exports = { listUsers, setUserStatus, deleteUser };
