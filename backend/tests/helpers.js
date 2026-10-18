// Shared helpers for DB-free tests: dummy env + a tiny fake "users" store
// that patches Mongoose model statics, so the real routes/middleware run.
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.NODE_ENV = "test";

const mongoose = require("mongoose");

function thenableQuery(value) {
  const q = Promise.resolve(value);
  q.select = () => thenableQuery(value);
  q.lean = () => thenableQuery(value);
  return q;
}

function makeUser(overrides = {}) {
  const User = require("../models/User");
  const doc = new User({
    name: "Test User",
    email: `u${new mongoose.Types.ObjectId()}@test.dev`,
    password: "x".repeat(12),
    role: "customer",
    isActive: true,
    isEmailVerified: true,
    ...overrides,
  });
  doc.saved = 0;
  doc.deleted = 0;
  doc.save = async function () {
    this.saved += 1;
    return this;
  };
  doc.deleteOne = async function () {
    this.deleted += 1;
    return this;
  };
  return doc;
}

/** Patch User.findById to look inside `users` (array of docs). */
function installUserStore(users) {
  const User = require("../models/User");
  User.findById = (id) =>
    thenableQuery(users.find((u) => u._id.toString() === String(id)) || null);
  return users;
}

module.exports = { thenableQuery, makeUser, installUserStore };
