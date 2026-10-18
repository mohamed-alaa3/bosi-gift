// Runs the REAL Express app (routes, auth middleware, validators, services)
// with the Mongoose model statics patched, so no database is needed.
const test = require("node:test");
const assert = require("node:assert/strict");
const { thenableQuery, makeUser, installUserStore } = require("./helpers");

const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Address = require("../models/Address");
const Banner = require("../models/Banner");
const { generateToken } = require("../utils/generateToken");

const admin = makeUser({ name: "Boss", role: "admin" });
const otherAdmin = makeUser({ name: "Other Admin", role: "admin" });
const customer = makeUser({ name: "Mona", role: "customer", phone: "0100" });
const customer2 = makeUser({ name: "Sara", role: "customer" });
const suspended = makeUser({ name: "Gone", role: "customer", isActive: false });
const users = installUserStore([admin, otherAdmin, customer, customer2, suspended]);

const tok = (u) => generateToken({ id: u._id.toString(), role: u.role });
let server, base;
test.before(async () => {
  await new Promise((r) => (server = app.listen(0, r)));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = (method, path, { user, body } = {}) =>
  fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${tok(user)}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

// ───────── Banners ─────────
const fakeBanner = (over = {}) =>
  new Banner({
    title: { en: "Eid Sale", ar: "عيد" },
    image: "https://res.cloudinary.com/x/image/upload/v1/habiba/banners/a.jpg",
    position: "hero",
    isActive: true,
    ...over,
  });

test("GET /api/banners is public, returns active banners with imageUrl", async () => {
  let seenFilter;
  Banner.find = (filter) => {
    seenFilter = filter;
    return { sort: async () => [fakeBanner(), fakeBanner({ image: "/uploads/banners/b.webp" })] };
  };
  const r = await call("GET", "/api/banners?position=hero");
  assert.equal(r.status, 200);
  assert.deepEqual(seenFilter, { isActive: true, position: "hero" });
  assert.equal(r.json.data.length, 2);
  assert.match(r.json.data[0].imageUrl, /^https:\/\/res\.cloudinary\.com/);
  assert.match(r.json.data[1].imageUrl, /^http:\/\/.+\/uploads\/banners\/b\.webp$/);
});

test("includeInactive is honoured for admins only (public + customers stay filtered)", async () => {
  const filters = [];
  Banner.find = (f) => (filters.push(f), { sort: async () => [] });
  await call("GET", "/api/banners?includeInactive=true");
  await call("GET", "/api/banners?includeInactive=true", { user: customer });
  await call("GET", "/api/banners?includeInactive=true", { user: suspended });
  await call("GET", "/api/banners?includeInactive=true", { user: admin });
  assert.deepEqual(filters.map((f) => f.isActive), [true, true, true, undefined]);
});

test("garbage bearer token on the public banner list is treated as anonymous (200)", async () => {
  Banner.find = () => ({ sort: async () => [] });
  const r = await fetch(base + "/api/banners", { headers: { Authorization: "Bearer nope" } });
  assert.equal(r.status, 200);
});

// ───────── User management: authorization ─────────
test("user endpoints: 401 anonymous, 403 customer", async () => {
  assert.equal((await call("GET", "/api/admin/users")).status, 401);
  assert.equal((await call("GET", "/api/admin/users", { user: customer })).status, 403);
  assert.equal((await call("PATCH", `/api/admin/users/${customer2._id}/status`, { user: customer, body: { isActive: false } })).status, 403);
  assert.equal((await call("DELETE", `/api/admin/users/${customer2._id}`, { user: customer })).status, 403);
});

test("list: no secrets leak, pagination meta + search/status filters build the right query", async () => {
  let filter;
  User.find = (f) => {
    filter = f;
    const q = { select: () => q, sort: () => q, skip: () => q, limit: () => q, lean: async () => [{ ...customer.toObject(), createdAt: new Date() }] };
    return q;
  };
  User.countDocuments = async () => 41;
  const r = await call("GET", "/api/admin/users?page=2&limit=20&search=mo.na&status=suspended&role=customer", { user: admin });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.meta, { page: 2, limit: 20, total: 41, totalPages: 3 });
  assert.equal(filter.isActive, false);
  assert.equal(filter.role, "customer");
  assert.equal(filter.$or.length, 3);
  assert.equal(filter.$or[0].name.source, "mo\\.na"); // regex-escaped
  const row = r.json.data[0];
  assert.deepEqual(Object.keys(row).sort(), ["_id", "createdAt", "email", "isActive", "isEmailVerified", "name", "phone", "role"]);
  assert.ok(!/password|otp/i.test(JSON.stringify(r.json)));
});

test("list validates query params (400)", async () => {
  assert.equal((await call("GET", "/api/admin/users?limit=9999", { user: admin })).status, 400);
  assert.equal((await call("GET", "/api/admin/users?status=weird", { user: admin })).status, 400);
});

// ───────── Suspension / reactivation ─────────
test("suspend + reactivate a customer", async () => {
  let r = await call("PATCH", `/api/admin/users/${customer._id}/status`, { user: admin, body: { isActive: false } });
  assert.equal(r.status, 200);
  assert.equal(r.json.data.isActive, false);
  assert.equal(customer.saved, 1);
  r = await call("PATCH", `/api/admin/users/${customer._id}/status`, { user: admin, body: { isActive: true } });
  assert.equal(r.json.data.isActive, true);
  assert.equal(customer.saved, 2);
});

test("status endpoint rejects bad bodies and cannot change role", async () => {
  assert.equal((await call("PATCH", `/api/admin/users/${customer2._id}/status`, { user: admin, body: { isActive: "false" } })).status, 400);
  assert.equal((await call("PATCH", `/api/admin/users/${customer2._id}/status`, { user: admin, body: {} })).status, 400);
  assert.equal((await call("PATCH", "/api/admin/users/not-an-id/status", { user: admin, body: { isActive: false } })).status, 400);
  const r = await call("PATCH", `/api/admin/users/${customer2._id}/status`, { user: admin, body: { isActive: false, role: "admin" } });
  assert.equal(r.status, 200);
  assert.equal(customer2.role, "customer");
  customer2.isActive = true;
});

test("admins cannot suspend/delete themselves or other admins", async () => {
  for (const [m, p, b] of [
    ["PATCH", `/api/admin/users/${admin._id}/status`, { isActive: false }],
    ["DELETE", `/api/admin/users/${admin._id}`],
    ["PATCH", `/api/admin/users/${otherAdmin._id}/status`, { isActive: false }],
    ["DELETE", `/api/admin/users/${otherAdmin._id}`],
  ]) {
    const r = await call(m, p, { user: admin, body: b });
    assert.equal(r.status, 403, `${m} ${p}`);
  }
  assert.equal(admin.deleted + otherAdmin.deleted, 0);
});

test("unknown user → 404", async () => {
  const r = await call("DELETE", `/api/admin/users/${new mongoose.Types.ObjectId()}`, { user: admin });
  assert.equal(r.status, 404);
});

// ───────── Existing sessions: suspension is enforced per request ─────────
test("a suspended user's still-valid JWT is rejected on protected routes (403)", async () => {
  const r = await call("GET", "/api/cart", { user: suspended });
  assert.equal(r.status, 403);
  assert.match(r.json.message, /disabled/i);
});

test("a user suspended AFTER login loses access immediately with the same token", async () => {
  Cart.findOne = async () => null; // not reached when blocked
  customer.isActive = true;
  const token = tok(customer);
  const hit = () => fetch(base + "/api/cart", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.status);
  Cart.findOne = async () => ({ items: [], populate: async function () { return this; }, toObject() { return this; } });
  customer.isActive = false; // admin suspends
  assert.equal(await hit(), 403);
});

// ───────── Deletion ─────────
test("delete is blocked while orders are in progress (409) and nothing is removed", async () => {
  const calls = [];
  Order.countDocuments = async (f) => (calls.push(f), 2);
  Cart.deleteMany = Wishlist.deleteMany = Address.deleteMany = async () => assert.fail("must not cascade");
  const r = await call("DELETE", `/api/admin/users/${customer2._id}`, { user: admin });
  assert.equal(r.status, 409);
  assert.deepEqual(calls[0].status.$in.sort(), ["confirmed", "pending", "processing", "shipped"]);
  assert.equal(customer2.deleted, 0);
});

test("delete removes personal data but never touches orders", async () => {
  const removed = [];
  Order.countDocuments = async () => 0;
  Order.deleteMany = Order.updateMany = Order.deleteOne = async () => assert.fail("orders must be preserved");
  Cart.deleteMany = async (f) => removed.push(["cart", String(f.user)]);
  Wishlist.deleteMany = async (f) => removed.push(["wishlist", String(f.user)]);
  Address.deleteMany = async (f) => removed.push(["address", String(f.user)]);
  const r = await call("DELETE", `/api/admin/users/${customer2._id}`, { user: admin });
  assert.equal(r.status, 200);
  assert.equal(customer2.deleted, 1);
  assert.deepEqual(removed.map((x) => x[0]).sort(), ["address", "cart", "wishlist"]);
  assert.ok(removed.every((x) => x[1] === String(customer2._id)));
});
