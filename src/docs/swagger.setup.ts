import { Application, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { openapiSpec } from "./openapi";
import { env } from "../config/env";

export function setupSwagger(app: Application): void {
  if (!env.ENABLE_SWAGGER) return;

  app.get(["/openapi.json", "/api-docs/openapi.json"], (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.json(openapiSpec);
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customSiteTitle: "Auction Bidding API Documentation",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true
      }
    })
  );
}

