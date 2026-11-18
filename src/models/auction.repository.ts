import { r } from "../db/connection";
import { Auction } from "../types";
import { DB_TABLES, AUCTION_STATUS, AuctionStatus, ATOMIC_BID_STATUS, AtomicBidStatus } from "../constants";

export interface AtomicBidResult {
  status: AtomicBidStatus;
  updatedAuction?: Auction;
  currentAuction?: Auction;
}

export class AuctionRepository {
  private readonly table = DB_TABLES.AUCTIONS;

  async findById(id: string): Promise<Auction | null> {
    const auction = await r.table(this.table).get(id).run();
    return (auction as Auction) || null;
  }

  async create(data: {
    id?: string;
    title: string;
    starting_price: number;
    ends_at: Date | string;
    status?: AuctionStatus;
  }): Promise<Auction> {
    const now = new Date();
    const endsAt = typeof data.ends_at === "string" ? new Date(data.ends_at) : data.ends_at;

    const auctionData = {
      id: data.id,
      title: data.title,
      starting_price: data.starting_price,
      current_top_bid: data.starting_price,
      current_top_bidder_id: null,
      bid_count: 0,
      ends_at: endsAt,
      status: data.status || AUCTION_STATUS.ACTIVE,
      created_at: now,
      updated_at: now
    };

    const res = await r.table(this.table).insert(auctionData, { conflict: "replace", returnChanges: true }).run();
    return (res.changes?.[0]?.new_val as Auction) || ((await this.findById(data.id || "")) as Auction);
  }

  async atomicAttemptBid(
    auctionId: string,
    userId: string,
    amount: number,
    allowSelfOutbid: boolean
  ): Promise<AtomicBidResult> {
    const res = await r
      .table(this.table)
      .get(auctionId)
      .update(
        (doc: any) => {
          const isActive = doc("status").eq(AUCTION_STATUS.ACTIVE);
          const isNotExpired = r.now().lt(doc("ends_at"));
          const isHigher = r.expr(amount).gt(doc("current_top_bid"));
          const isAllowedBidder = allowSelfOutbid
            ? r.expr(true)
            : doc("current_top_bidder_id").default(null).ne(userId);

          const canBid = isActive
            .and(isNotExpired)
            .and(isHigher)
            .and(isAllowedBidder);

          return r.branch(
            canBid,
            {
              current_top_bid: amount,
              current_top_bidder_id: userId,
              bid_count: doc("bid_count").add(1),
              updated_at: r.now()
            },
            {}
          );
        },
        { returnChanges: true }
      )
      .run();

    if (res.skipped === 1) {
      return { status: ATOMIC_BID_STATUS.NOT_FOUND };
    }

    if (res.replaced === 1 && res.changes?.[0]?.new_val) {
      return {
        status: ATOMIC_BID_STATUS.SUCCESS,
        updatedAuction: res.changes[0].new_val as Auction
      };
    }

    const currentDoc = await this.findById(auctionId);
    return {
      status: ATOMIC_BID_STATUS.CONDITION_FAILED,
      currentAuction: currentDoc || undefined
    };
  }

  private static readonly streamChannels = new Map<
    string,
    {
      subscribers: Set<{
        onChange: (change: { old_val: Auction | null; new_val: Auction | null }) => void;
        onError?: (err: Error) => void;
      }>;
      cursor: any | null;
      cursorPromise: Promise<any>;
      lastVal: Auction | null;
      closed: boolean;
    }
  >();

  async subscribeToAuctionChanges(
    auctionId: string,
    onChange: (change: { old_val: Auction | null; new_val: Auction | null }) => void,
    onError?: (err: Error) => void
  ): Promise<() => Promise<void>> {
    const subscriber = { onChange, onError };
    let channel = AuctionRepository.streamChannels.get(auctionId);

    if (!channel) {
      const subscribers = new Set([subscriber]);
      const channelState = {
        subscribers,
        cursor: null as any,
        cursorPromise: null as any,
        lastVal: null as Auction | null,
        closed: false
      };

      channelState.cursorPromise = (async () => {
        try {
          const cursor = await r
            .table(this.table)
            .get(auctionId)
            .changes({ includeInitial: true })
            .run();

          channelState.cursor = cursor;

          cursor.each((err: any, change: any) => {
            if (channelState.closed) return;
            if (err) {
              for (const sub of channelState.subscribers) {
                sub.onError?.(err);
              }
              return;
            }

            if (change?.new_val) {
              channelState.lastVal = change.new_val as Auction;
            }

            for (const sub of channelState.subscribers) {
              sub.onChange(change);
            }
          });
        } catch (err: any) {
          AuctionRepository.streamChannels.delete(auctionId);
          throw err;
        }
      })();

      AuctionRepository.streamChannels.set(auctionId, channelState);
      await channelState.cursorPromise;
    } else {
      channel.subscribers.add(subscriber);
      await channel.cursorPromise;

      if (channel.lastVal) {
        onChange({ old_val: null, new_val: channel.lastVal });
      }
    }

    return async () => {
      const activeChannel = AuctionRepository.streamChannels.get(auctionId);
      if (!activeChannel) return;

      activeChannel.subscribers.delete(subscriber);
      if (activeChannel.subscribers.size === 0) {
        activeChannel.closed = true;
        AuctionRepository.streamChannels.delete(auctionId);
        if (activeChannel.cursor) {
          try {
            await activeChannel.cursor.close();
          } catch {
            // Safe ignore on drain
          }
        }
      }
    };
  }
}

