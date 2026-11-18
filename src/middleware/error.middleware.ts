import { Request, Response, NextFunction } from "express";
import { OUTCOME_CODES, StatusCodes } from "../constants";
import { ApiResponse } from "../utils/api-response";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  console.error("Unhandled Error:", err);

  return ApiResponse.error(res, {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: OUTCOME_CODES.INTERNAL_SERVER_ERROR,
    message: "An unexpected error occurred while processing the request."
  });
};
