import { z } from "zod";
import { currencyAmountSchema } from "../../types/common.schema";

export const createBidSchema = z.object({
  auction_id: z
    .string({
      required_error: "auction_id is required"
    })
    .min(1, "auction_id cannot be empty"),
  user_id: z
    .string({
      required_error: "user_id is required"
    })
    .min(1, "user_id cannot be empty"),
  amount: currencyAmountSchema
});

export type CreateBidDto = z.infer<typeof createBidSchema>;
