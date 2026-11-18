import { AuctionStatus, OUTCOME_CODES } from "../constants";

export { AuctionStatus };

export interface Auction {
  id: string;
  title: string;
  starting_price: number;
  current_top_bid: number;
  current_top_bidder_id: string | null;
  bid_count: number;
  ends_at: Date;
  created_at: Date;
  updated_at: Date;
  status: AuctionStatus;
}

export interface Bid {
  id?: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at?: Date;
}

export type BidOutcome =
  | { success: true; code: typeof OUTCOME_CODES.ACCEPTED; bid: Bid; auction: Auction }
  | { success: true; code: typeof OUTCOME_CODES.IDEMPOTENT_DUPLICATE; bid: Bid; auction: Auction }
  | { success: false; code: typeof OUTCOME_CODES.AUCTION_NOT_FOUND; message: string }
  | { success: false; code: typeof OUTCOME_CODES.AUCTION_CLOSED; message: string; closedAt?: Date }
  | { success: false; code: typeof OUTCOME_CODES.BID_NOT_HIGHER; message: string; currentTopBid: number }
  | { success: false; code: typeof OUTCOME_CODES.SELF_BID_DISALLOWED; message: string; currentTopBid: number };
