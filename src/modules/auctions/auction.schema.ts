import { z } from "zod";
import { currencyAmountSchema } from "../../types/common.schema";
import { PAGINATION } from "../../constants";

export const createAuctionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "title is required"),
  starting_price: currencyAmountSchema,
  ends_at: z.string().datetime("ends_at must be an ISO 8601 datetime string")
});

export const getAuctionParamsSchema = z.object({
  id: z.string().min(1, "Auction ID is required")
});

export const getAuctionQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(PAGINATION.DEFAULT_OFFSET).default(PAGINATION.DEFAULT_OFFSET)
});

export type CreateAuctionDto = z.infer<typeof createAuctionSchema>;
export type GetAuctionParamsDto = z.infer<typeof getAuctionParamsSchema>;
export type GetAuctionQueryDto = z.infer<typeof getAuctionQuerySchema>;
