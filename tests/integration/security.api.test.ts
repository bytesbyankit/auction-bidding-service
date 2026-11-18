import request from "supertest";
import { createApp } from "../../src/app";
import { initDb, closeDb } from "../../src/db/connection";
import { AuctionRepository } from "../../src/models/auction.repository";
import { BidRepository } from "../../src/models/bid.repository";

describe("Security & Scalability Enhancements Tests", () => {
  const app = createApp();
  const auctionRepo = new AuctionRepository();
  const bidRepo = new BidRepository();

  beforeAll(async () => {
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it("should paginate bid history on GET /auctions/:id", async () => {
    const auction = await auctionRepo.create({
      title: "Pagination Test Auction",
      starting_price: 10,
      ends_at: new Date(Date.now() + 60 * 1000)
    });

    // Create 5 bids
    for (let i = 1; i <= 5; i++) {
      await bidRepo.create({
        auction_id: auction.id,
        user_id: `user-${i}`,
        amount: 10 + i
      });
    }

    // Query with limit = 2
    const res = await request(app).get(`/auctions/${auction.id}?limit=2&offset=0`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("SUCCESS");
    expect(res.body.data.bids.length).toBe(2);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.total).toBe(5);
    expect(res.body.data.pagination.limit).toBe(2);
    expect(res.body.data.pagination.offset).toBe(0);

    // Query page 2 with offset = 2
    const page2 = await request(app).get(`/auctions/${auction.id}?limit=2&offset=2`);
    expect(page2.status).toBe(200);
    expect(page2.body.data.bids.length).toBe(2);
    expect(page2.body.data.pagination.offset).toBe(2);
  });

  it("should respond with security headers (Helmet)", async () => {
    const res = await request(app).get("/health");
    expect(res.header["x-dns-prefetch-control"]).toBe("off");
    expect(res.header["x-content-type-options"]).toBe("nosniff");
    expect(res.header["x-frame-options"]).toBe("SAMEORIGIN");
  });
});

