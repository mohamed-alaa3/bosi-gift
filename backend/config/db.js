const mongoose = require("mongoose");
const env = require("./env");

async function connectDB() {
  try {
    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(env.mongoUri, {
      autoIndex: env.nodeEnv !== "production",
    });

    console.log(
      `[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`,
    );

    mongoose.connection.on("error", (err) => {
      console.error("[db] MongoDB runtime error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[db] MongoDB disconnected");
    });

    return conn;
  } catch (err) {
    console.error("[db] MongoDB initial connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
