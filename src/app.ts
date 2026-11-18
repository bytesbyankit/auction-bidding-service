import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { createBidRouter } from "./modules/bids/bid.routes";
import { createAuctionRouter } from "./modules/auctions/auction.routes";
import { createHealthRouter } from "./modules/system/health.routes";
import { errorHandler } from "./middleware/error.middleware";
import { setupSwagger } from "./docs/swagger.setup";
import { env } from "./config/env";
import { apiLimiter } from "./middleware/rate-limit.middleware";
import { OUTCOME_CODES, StatusCodes, SYSTEM_DEFAULTS } from "./constants";
import { ApiResponse } from "./utils/api-response";

export function createApp(): Application {
  const app = express();

  // Trust first proxy hop (load balancer, ingress, Cloudflare, etc.)
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"]
        }
      }
    })
  );

  const allowedOrigins =
    env.CORS_ORIGIN === "*"
      ? "*"
      : env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  );
  app.use(express.json({ limit: SYSTEM_DEFAULTS.MAX_PAYLOAD_SIZE }));

  app.use(apiLimiter);

  // Mount API Documentation
  setupSwagger(app);

  // Mount System & Domain feature routers
  app.use("/health", createHealthRouter());

  const bidRouter = createBidRouter();
  app.use("/bid", bidRouter);
  app.use("/bids", bidRouter);

  const auctionRouter = createAuctionRouter();
  app.use("/auctions", auctionRouter);

  // Fallback 404 handler
  app.use((_req: Request, res: Response) => {
    ApiResponse.error(res, {
      statusCode: StatusCodes.NOT_FOUND,
      code: OUTCOME_CODES.ROUTE_NOT_FOUND,
      message: "The requested route does not exist."
    });
  });

  app.use(errorHandler);

  return app;
}
