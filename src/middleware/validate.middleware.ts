import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { OUTCOME_CODES, StatusCodes } from "../constants";
import { ApiResponse } from "../utils/api-response";

export interface RequestValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (schemas: RequestValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        ApiResponse.error(res, {
          statusCode: StatusCodes.BAD_REQUEST,
          code: OUTCOME_CODES.VALIDATION_ERROR,
          message: "Invalid request payload",
          errors: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};

export const validateBody = (schema: ZodSchema) => validateRequest({ body: schema });
export const validateQuery = (schema: ZodSchema) => validateRequest({ query: schema });
export const validateParams = (schema: ZodSchema) => validateRequest({ params: schema });
