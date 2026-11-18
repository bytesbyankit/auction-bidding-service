import { Request, Response } from "express";
import { BidService } from "./bid.service";
import { BidOutcome } from "../../types";
import { OUTCOME_CODES, StatusCodes } from "../../constants";
import { ApiResponse } from "../../utils/api-response";

type BidSuccessOutcome = Extract<BidOutcome, { success: true }>;

export class BidController {
  constructor(private readonly bidService: BidService) {}

  private formatSuccessData(outcome: BidSuccessOutcome) {
    return {
      bid: outcome.bid,
      auction: {
        id: outcome.auction.id,
        current_top_bid: outcome.auction.current_top_bid,
        current_top_bidder_id: outcome.auction.current_top_bidder_id,
        bid_count: outcome.auction.bid_count,
        ends_at: outcome.auction.ends_at
      }
    };
  }

  handleBid = async (req: Request, res: Response): Promise<Response> => {
    const outcome = await this.bidService.placeBid(req.body);

    if (outcome.success) {
      const isNewAcceptance = outcome.code === OUTCOME_CODES.ACCEPTED;
      const statusCode = isNewAcceptance ? StatusCodes.CREATED : StatusCodes.OK;
      const message = isNewAcceptance
        ? "Bid accepted successfully."
        : "Duplicate request recognized: bid is already the current top bid.";

      return ApiResponse.success(res, {
        statusCode,
        code: outcome.code,
        message,
        data: this.formatSuccessData(outcome)
      });
    }

    switch (outcome.code) {
      case OUTCOME_CODES.AUCTION_NOT_FOUND:
        return ApiResponse.error(res, {
          statusCode: StatusCodes.NOT_FOUND,
          code: outcome.code,
          message: outcome.message
        });

      case OUTCOME_CODES.AUCTION_CLOSED:
      case OUTCOME_CODES.BID_NOT_HIGHER:
      case OUTCOME_CODES.SELF_BID_DISALLOWED:
        return ApiResponse.error(res, {
          statusCode: StatusCodes.CONFLICT,
          code: outcome.code,
          message: outcome.message,
          details: outcome
        });

      default:
        return ApiResponse.error(res, {
          statusCode: StatusCodes.BAD_REQUEST,
          code: OUTCOME_CODES.INVALID_BID,
          message: "Unable to process bid."
        });
    }
  };
}
