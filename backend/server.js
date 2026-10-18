const http = require("http");
const app = require("./app");
const env = require("./config/env");
const connectDB = require("./config/db");

async function start() {
  await connectDB();

  // Idempotent, non-destructive review-system migration (see review.service)
  try {
    await require("./services/review.service").migrateReviewIndexes();
  } catch (err) {
    console.error("[db] Review migration failed:", err.message);
  }

  const server = http.createServer(app);

  server.listen(env.port, () => {
    console.log(
      `[server] Bosi Gift API running on ${env.apiBaseUrl} (${env.nodeEnv})`,
    );
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received — shutting down`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
