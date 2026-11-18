import { AuctionRepository } from "../../models/auction.repository";
import { BidRepository } from "../../models/bid.repository";
import { BidOutcome } from "../../types";
import { env } from "../../config/env";
import { CreateBidDto } from "./bid.schema";
import { OUTCOME_CODES, AUCTION_STATUS, ATOMIC_BID_STATUS } from "../../constants";

export class BidService {
  constructor(
    private readonly auctionRepo: AuctionRepository = new AuctionRepository(),
    private readonly bidRepo: BidRepository = new BidRepository()
  ) {}

  async placeBid(dto: CreateBidDto): Promise<BidOutcome> {
    const { auction_id, user_id, amount } = dto;

    const atomicResult = await this.auctionRepo.atomicAttemptBid(
      auction_id,
      user_id,
      amount,
      env.ALLOW_SELF_OUTBID
    );

    if (atomicResult.status === ATOMIC_BID_STATUS.SUCCESS && atomicResult.updatedAuction) {
      const recordedBid = await this.bidRepo.create({
        auction_id,
        user_id,
        amount
      });

      return {
        success: true,
        code: OUTCOME_CODES.ACCEPTED,
        bid: recordedBid,
        auction: atomicResult.updatedAuction
      };
    }

    if (atomicResult.status === ATOMIC_BID_STATUS.NOT_FOUND) {
      return {
        success: false,
        code: OUTCOME_CODES.AUCTION_NOT_FOUND,
        message: `Auction with id '${auction_id}' was not found.`
      };
    }

    const current = atomicResult.currentAuction;
    if (!current) {
      return {
        success: false,
        code: OUTCOME_CODES.AUCTION_NOT_FOUND,
        message: `Auction with id '${auction_id}' was not found.`
      };
    }

    if (current.status !== AUCTION_STATUS.ACTIVE) {
      return {
        success: false,
        code: OUTCOME_CODES.AUCTION_CLOSED,
        message: `Auction '${auction_id}' is closed (status: ${current.status}).`
      };
    }

    if (new Date() >= new Date(current.ends_at)) {
      return {
        success: false,
        code: OUTCOME_CODES.AUCTION_CLOSED,
        message: `Auction '${auction_id}' ended at ${new Date(current.ends_at).toISOString()}.`,
        closedAt: new Date(current.ends_at)
      };
    }

    if (current.current_top_bidder_id === user_id && current.current_top_bid === amount) {
      const existingBid = await this.bidRepo.findLatestBid(auction_id, user_id, amount);
      return {
        success: true,
        code: OUTCOME_CODES.IDEMPOTENT_DUPLICATE,
        bid: existingBid || { auction_id, user_id, amount },
        auction: current
      };
    }

    if (!env.ALLOW_SELF_OUTBID && current.current_top_bidder_id === user_id) {
      return {
        success: false,
        code: OUTCOME_CODES.SELF_BID_DISALLOWED,
        message: "You are already the highest bidder for this auction.",
        currentTopBid: current.current_top_bid
      };
    }

    return {
      success: false,
      code: OUTCOME_CODES.BID_NOT_HIGHER,
      message: `Bid of ${amount} is not strictly higher than current top bid of ${current.current_top_bid}.`,
      currentTopBid: current.current_top_bid
    };
  }
}

