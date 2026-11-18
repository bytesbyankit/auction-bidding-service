import { Router, Request, Response } from "express";
import { checkDbHealth } from "../../db/connection";
import { StatusCodes, HEALTH_STATUS, DB_CONNECTION_STATUS } from "../../constants";

export function createHealthRouter(): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    const dbOk = await checkDbHealth();
    const statusCode = dbOk ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json({
      status: dbOk ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
      database: dbOk ? DB_CONNECTION_STATUS.CONNECTED : DB_CONNECTION_STATUS.DISCONNECTED,
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
