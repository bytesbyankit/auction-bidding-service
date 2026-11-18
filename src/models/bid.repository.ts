import { r } from "../db/connection";
import { Bid } from "../types";
import { DB_TABLES, PAGINATION } from "../constants";

export class BidRepository {
  private readonly table = DB_TABLES.BIDS;

  async create(data: { auction_id: string; user_id: string; amount: number }): Promise<Bid> {
    const bidRecord = {
      ...data,
      created_at: new Date()
    };

    const res = await r.table(this.table).insert(bidRecord, { returnChanges: true }).run();
    return res.changes?.[0]?.new_val as Bid;
  }

  async findByAuctionId(
    auctionId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ bids: Bid[]; total: number }> {
    const limit =
      options.limit !== undefined
        ? Math.min(Math.max(1, options.limit), PAGINATION.MAX_LIMIT)
        : PAGINATION.DEFAULT_LIMIT;
    const offset =
      options.offset !== undefined ? Math.max(0, options.offset) : PAGINATION.DEFAULT_OFFSET;

    const baseQuery = r.table(this.table).getAll(auctionId, { index: "auction_id" });

    const total = (await baseQuery.count().run()) as number;
    const bids = (await baseQuery
      .orderBy(r.desc("created_at"))
      .slice(offset, offset + limit)
      .run()) as Bid[];

    return { bids, total };
  }

  async findLatestBid(auctionId: string, userId: string, amount: number): Promise<Bid | null> {
    const bids = await r
      .table(this.table)
      .getAll([auctionId, userId, amount], { index: "auction_user_amount" })
      .limit(1)
      .run();
    return (bids[0] as Bid) || null;
  }
}

