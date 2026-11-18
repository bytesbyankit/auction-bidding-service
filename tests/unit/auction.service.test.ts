import { AuctionService } from "../../src/modules/auctions/auction.service";
import { AuctionRepository } from "../../src/models/auction.repository";
import { BidRepository } from "../../src/models/bid.repository";

describe("AuctionService Unit Tests", () => {
  let auctionService: AuctionService;
  let mockAuctionRepo: jest.Mocked<AuctionRepository>;
  let mockBidRepo: jest.Mocked<BidRepository>;

  beforeEach(() => {
    mockAuctionRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      atomicAttemptBid: jest.fn()
    } as unknown as jest.Mocked<AuctionRepository>;

    mockBidRepo = {
      create: jest.fn(),
      findByAuctionId: jest.fn(),
      findLatestBid: jest.fn()
    } as unknown as jest.Mocked<BidRepository>;

    auctionService = new AuctionService(mockAuctionRepo, mockBidRepo);
  });

  it("should create an auction successfully", async () => {
    const mockAuction = {
      id: "auc-1",
      title: "Test Watch",
      starting_price: 500,
      current_top_bid: 500,
      current_top_bidder_id: null,
      bid_count: 0,
      ends_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      status: "ACTIVE" as const
    };

    mockAuctionRepo.create.mockResolvedValueOnce(mockAuction);

    const result = await auctionService.createAuction({
      title: "Test Watch",
      starting_price: 500,
      ends_at: new Date().toISOString()
    });

    expect(result).toEqual(mockAuction);
    expect(mockAuctionRepo.create).toHaveBeenCalledTimes(1);
  });

  it("should return null if auction is not found when getting auction with bids", async () => {
    mockAuctionRepo.findById.mockResolvedValueOnce(null);

    const result = await auctionService.getAuctionWithBids("auc-non-existent", {
      limit: 10,
      offset: 0
    });

    expect(result).toBeNull();
    expect(mockBidRepo.findByAuctionId).not.toHaveBeenCalled();
  });

  it("should return auction with paginated bids when auction exists", async () => {
    const mockAuction = {
      id: "auc-1",
      title: "Test Watch",
      starting_price: 500,
      current_top_bid: 600,
      current_top_bidder_id: "user-1",
      bid_count: 1,
      ends_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      status: "ACTIVE" as const
    };

    const mockBids = [
      {
        id: "bid-1",
        auction_id: "auc-1",
        user_id: "user-1",
        amount: 600,
        created_at: new Date()
      }
    ];

    mockAuctionRepo.findById.mockResolvedValueOnce(mockAuction);
    mockBidRepo.findByAuctionId.mockResolvedValueOnce({
      bids: mockBids,
      total: 1
    });

    const result = await auctionService.getAuctionWithBids("auc-1", {
      limit: 10,
      offset: 0
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("auc-1");
    expect(result?.bids).toEqual(mockBids);
    expect(result?.pagination).toEqual({ total: 1, limit: 10, offset: 0 });
  });
});

