import { Router } from "express";
import { BidController } from "./bid.controller";
import { BidService } from "./bid.service";
import { createBidSchema } from "./bid.schema";
import { validateBody } from "../../middleware/validate.middleware";
import { bidLimiter } from "../../middleware/rate-limit.middleware";

export function createBidRouter(
  bidController: BidController = new BidController(new BidService())
): Router {
  const router = Router();

  router.post("/", bidLimiter, validateBody(createBidSchema), bidController.handleBid);

  return router;
}
