import request from "supertest";
import { createApp } from "../../src/app";
import { initDb, closeDb } from "../../src/db/connection";
import { AuctionRepository } from "../../src/models/auction.repository";

describe("POST /bid API Integration Tests", () => {
  const app = createApp();
  const auctionRepo = new AuctionRepository();

  beforeAll(async () => {
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it("should accept a strictly higher bid on an active auction", async () => {
    const auction = await auctionRepo.create({
      title: "Active Auction Test",
      starting_price: 100,
      ends_at: new Date(Date.now() + 60 * 1000)
    });

    const res = await request(app)
      .post("/bid")
      .send({
        auction_id: auction.id,
        user_id: "user-alpha",
        amount: 120
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("SUCCESS");
    expect(res.body.code).toBe("ACCEPTED");
    expect(res.body.data.auction.current_top_bid).toBe(120);
    expect(res.body.data.auction.current_top_bidder_id).toBe("user-alpha");
    expect(res.body.data.auction.bid_count).toBe(1);
  });

  it("should reject a bid lower than or equal to current top bid", async () => {
    const auction = await auctionRepo.create({
      title: "Outbid Test",
      starting_price: 100,
      ends_at: new Date(Date.now() + 60 * 1000)
    });

    await request(app).post("/bid").send({
      auction_id: auction.id,
      user_id: "user-alpha",
      amount: 150
    });

    // Attempt equal bid
    const resEqual = await request(app)
      .post("/bid")
      .send({
        auction_id: auction.id,
        user_id: "user-beta",
        amount: 150
      });

    expect(resEqual.status).toBe(409);
    expect(resEqual.body.code).toBe("BID_NOT_HIGHER");

    // Attempt lower bid
    const resLower = await request(app)
      .post("/bid")
      .send({
        auction_id: auction.id,
        user_id: "user-gamma",
        amount: 140
      });

    expect(resLower.status).toBe(409);
    expect(resLower.body.code).toBe("BID_NOT_HIGHER");
  });

  it("should return 404 for non-existent auction", async () => {
    const res = await request(app)
      .post("/bid")
      .send({
        auction_id: "non-existent-id",
        user_id: "user-alpha",
        amount: 200
      });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("AUCTION_NOT_FOUND");
  });

  it("should reject bids on an expired auction", async () => {
    const auction = await auctionRepo.create({
      title: "Expired Auction Test",
      starting_price: 100,
      ends_at: new Date(Date.now() - 10 * 1000)
    });

    const res = await request(app)
      .post("/bid")
      .send({
        auction_id: auction.id,
        user_id: "user-alpha",
        amount: 200
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("AUCTION_CLOSED");
  });

  it("should handle duplicate bid idempotently when sent twice by current top bidder", async () => {
    const auction = await auctionRepo.create({
      title: "Idempotency Test",
      starting_price: 100,
      ends_at: new Date(Date.now() + 60 * 1000)
    });

    const first = await request(app)
      .post("/bid")
      .send({
        auction_id: auction.id,
        user_id: "user-alpha",
        amount: 130
      });
    expect(first.status).toBe(201);

    // Duplicate submission
    const duplicate = await request(app)
      .post("/bid")
      .send({
        auction_id: auction.id,
        user_id: "user-alpha",
        amount: 130
      });

    expect(duplicate.status).toBe(200);
    expect(duplicate.body.code).toBe("IDEMPOTENT_DUPLICATE");
    expect(duplicate.body.data.auction.bid_count).toBe(1);
  });
});

