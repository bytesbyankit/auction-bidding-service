import { AuctionRepository } from "../../models/auction.repository";
import { BidRepository } from "../../models/bid.repository";
import { Auction, Bid } from "../../types";
import { CreateAuctionDto } from "./auction.schema";
import { STREAM_EVENTS } from "../../constants";

export interface AuctionWithBids extends Auction {
  bids: Bid[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export class AuctionService {
  constructor(
    private readonly auctionRepo: AuctionRepository,
    private readonly bidRepo: BidRepository
  ) {}

  async createAuction(dto: CreateAuctionDto): Promise<Auction> {
    return this.auctionRepo.create(dto);
  }

  async getAuctionById(id: string): Promise<Auction | null> {
    return this.auctionRepo.findById(id);
  }

  async getAuctionWithBids(
    id: string,
    options: { limit: number; offset: number }
  ): Promise<AuctionWithBids | null> {
    const auction = await this.auctionRepo.findById(id);
    if (!auction) {
      return null;
    }

    const { bids, total } = await this.bidRepo.findByAuctionId(id, options);

    return {
      ...auction,
      bids,
      pagination: {
        total,
        limit: options.limit,
        offset: options.offset
      }
    };
  }

  async subscribeToLiveAuction(
    auctionId: string,
    onEvent: (event: { type: string; data: any }) => void,
    onError?: (err: Error) => void
  ): Promise<(() => Promise<void>) | null> {
    const auction = await this.auctionRepo.findById(auctionId);
    if (!auction) {
      return null;
    }

    return this.auctionRepo.subscribeToAuctionChanges(
      auctionId,
      (change) => {
        if (!change.new_val) return;

        if (!change.old_val) {
          onEvent({
            type: STREAM_EVENTS.INITIAL_STATE,
            data: {
              id: change.new_val.id,
              title: change.new_val.title,
              current_top_bid: change.new_val.current_top_bid,
              current_top_bidder_id: change.new_val.current_top_bidder_id,
              bid_count: change.new_val.bid_count,
              ends_at: change.new_val.ends_at,
              status: change.new_val.status
            }
          });
          return;
        }

        const isNewBid =
          change.new_val.current_top_bid !== change.old_val.current_top_bid ||
          change.new_val.bid_count !== change.old_val.bid_count;

        if (isNewBid) {
          onEvent({
            type: STREAM_EVENTS.BID_UPDATE,
            data: {
              auction_id: change.new_val.id,
              current_top_bid: change.new_val.current_top_bid,
              current_top_bidder_id: change.new_val.current_top_bidder_id,
              previous_top_bid: change.old_val.current_top_bid,
              previous_top_bidder_id: change.old_val.current_top_bidder_id,
              bid_count: change.new_val.bid_count,
              updated_at: change.new_val.updated_at
            }
          });
        }

        if (change.new_val.status !== change.old_val.status) {
          onEvent({
            type: STREAM_EVENTS.STATUS_CHANGE,
            data: {
              auction_id: change.new_val.id,
              status: change.new_val.status,
              winner_id: change.new_val.current_top_bidder_id,
              final_price: change.new_val.current_top_bid
            }
          });
        }
      },
      onError
    );
  }
}

