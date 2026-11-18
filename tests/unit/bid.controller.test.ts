import { Request, Response } from "express";
import { BidController } from "../../src/modules/bids/bid.controller";
import { BidService } from "../../src/modules/bids/bid.service";

describe("BidController Unit Tests", () => {
  let mockBidService: jest.Mocked<BidService>;
  let controller: BidController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockBidService = {
      placeBid: jest.fn()
    } as unknown as jest.Mocked<BidService>;

    controller = new BidController(mockBidService);

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    mockReq = {
      body: { auction_id: "auc-1", user_id: "u-1", amount: 150 }
    };
  });

  it("should return 201 with formatted data when bid is accepted", async () => {
    mockBidService.placeBid.mockResolvedValueOnce({
      success: true,
      code: "ACCEPTED",
      bid: {
        id: "bid-1",
        auction_id: "auc-1",
        user_id: "u-1",
        amount: 150,
        created_at: new Date()
      },
      auction: {
        id: "auc-1",
        title: "Test",
        starting_price: 100,
        current_top_bid: 150,
        current_top_bidder_id: "u-1",
        bid_count: 1,
        ends_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        status: "ACTIVE"
      }
    });

    await controller.handleBid(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SUCCESS",
        code: "ACCEPTED",
        data: expect.objectContaining({
          bid: expect.objectContaining({ amount: 150 }),
          auction: expect.objectContaining({ current_top_bid: 150 })
        })
      })
    );
  });

  it("should return 200 with formatted data on idempotent duplicate", async () => {
    mockBidService.placeBid.mockResolvedValueOnce({
      success: true,
      code: "IDEMPOTENT_DUPLICATE",
      bid: { id: "bid-1", auction_id: "auc-1", user_id: "u-1", amount: 150 },
      auction: {
        id: "auc-1",
        title: "Test",
        starting_price: 100,
        current_top_bid: 150,
        current_top_bidder_id: "u-1",
        bid_count: 1,
        ends_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        status: "ACTIVE"
      }
    });

    await controller.handleBid(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SUCCESS",
        code: "IDEMPOTENT_DUPLICATE"
      })
    );
  });

  it("should return 404 when auction is not found", async () => {
    mockBidService.placeBid.mockResolvedValueOnce({
      success: false,
      code: "AUCTION_NOT_FOUND",
      message: "Auction not found."
    });

    await controller.handleBid(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ERROR",
        code: "AUCTION_NOT_FOUND"
      })
    );
  });

  it("should return 409 when bid is not higher", async () => {
    mockBidService.placeBid.mockResolvedValueOnce({
      success: false,
      code: "BID_NOT_HIGHER",
      message: "Bid not higher",
      currentTopBid: 200
    });

    await controller.handleBid(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ERROR",
        code: "BID_NOT_HIGHER"
      })
    );
  });
});

