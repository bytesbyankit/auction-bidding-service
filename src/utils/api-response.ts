import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { API_RESPONSE_STATUS, OutcomeCode } from "../constants";

export interface SuccessResponseOptions<T> {
  statusCode?: number;
  code?: string;
  message?: string;
  data?: T;
}

export interface ErrorResponseOptions {
  statusCode?: number;
  code?: OutcomeCode | string;
  message?: string;
  details?: unknown;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Standardized API Response Helper
 * Provides reusable success and error envelope builders for all controllers and middleware.
 */
export class ApiResponse {
  static success<T>(res: Response, options: SuccessResponseOptions<T> = {}): Response {
    const { statusCode = StatusCodes.OK, code, message, data } = options;

    const body: Record<string, any> = {
      status: API_RESPONSE_STATUS.SUCCESS
    };

    if (code !== undefined) body.code = code;
    if (message !== undefined) body.message = message;
    if (data !== undefined) body.data = data;

    return res.status(statusCode).json(body);
  }

  static error(res: Response, options: ErrorResponseOptions): Response {
    const {
      statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
      code,
      message = "An error occurred",
      details,
      errors
    } = options;

    const body: Record<string, any> = {
      status: API_RESPONSE_STATUS.ERROR
    };

    if (code !== undefined) body.code = code;
    body.message = message;
    if (details !== undefined) body.details = details;
    if (errors !== undefined) body.errors = errors;

    return res.status(statusCode).json(body);
  }
}

