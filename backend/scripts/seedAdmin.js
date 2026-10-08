/* eslint-disable no-console */
const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const User = require("../models/User");
const env = require("../config/env");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@habiba.test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin12345";

async function seedAdmin() {
  try {
    await mongoose.connect(env.mongoUri);

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`[seed] Admin already exists: ${ADMIN_EMAIL}`);
      await mongoose.disconnect();
      return;
    }

    await User.create({
      name: "Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
    });

    console.log(`[seed] Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error("[seed] Failed:", err.message);
    process.exit(1);
  }
}

seedAdmin();
