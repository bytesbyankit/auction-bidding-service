import { createApp } from "./app";
import { initDb, closeDb } from "./db/connection";
import { env } from "./config/env";
import { SYSTEM_DEFAULTS } from "./constants";

async function bootstrap() {
  await initDb();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`Auction Bidding Service running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Ensure keepAlive exceeds reverse proxy idle timeout (e.g. AWS ALB 60s) to avoid 502 race conditions
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await closeDb();
      console.log("Database connection closed. Process terminated.");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forced termination due to shutdown timeout.");
      process.exit(1);
    }, SYSTEM_DEFAULTS.SERVER_SHUTDOWN_TIMEOUT_MS);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

