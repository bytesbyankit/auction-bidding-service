import { Router } from "express";
import { AuctionController } from "./auction.controller";
import { AuctionService } from "./auction.service";
import { AuctionRepository } from "../../models/auction.repository";
import { BidRepository } from "../../models/bid.repository";
import {
  createAuctionSchema,
  getAuctionParamsSchema,
  getAuctionQuerySchema
} from "./auction.schema";
import { validateBody, validateRequest } from "../../middleware/validate.middleware";

export function createAuctionRouter(
  auctionController: AuctionController = new AuctionController(
    new AuctionService(new AuctionRepository(), new BidRepository())
  )
): Router {
  const router = Router();

  router.post("/", validateBody(createAuctionSchema), auctionController.createAuction);

  router.get(
    "/:id",
    validateRequest({
      params: getAuctionParamsSchema,
      query: getAuctionQuerySchema
    }),
    auctionController.getAuction
  );

  router.get(
    "/:id/stream",
    validateRequest({
      params: getAuctionParamsSchema
    }),
    auctionController.streamAuction
  );

  return router;
}
