import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env";
import { Request, Response } from "express";
import { OUTCOME_CODES, StatusCodes } from "../constants";
import { ApiResponse } from "../utils/api-response";

const isTest = env.NODE_ENV === "test";

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: (_req: Request, res: Response) => {
    ApiResponse.error(res, {
      statusCode: StatusCodes.TOO_MANY_REQUESTS,
      code: OUTCOME_CODES.TOO_MANY_REQUESTS,
      message: "Too many requests. Please slow down and try again later."
    });
  }
});

export const bidLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.BID_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  keyGenerator: (req: Request) => {
    const userId = req.body?.user_id;
    return userId ? `user:${userId}` : ipKeyGenerator(req.ip || "127.0.0.1");
  },
  handler: (_req: Request, res: Response) => {
    ApiResponse.error(res, {
      statusCode: StatusCodes.TOO_MANY_REQUESTS,
      code: OUTCOME_CODES.TOO_MANY_REQUESTS,
      message: "Bid rate limit exceeded. Please wait before placing another bid."
    });
  }
});
