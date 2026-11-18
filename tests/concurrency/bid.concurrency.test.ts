import request from "supertest";
import { createApp } from "../../src/app";
import { initDb, closeDb } from "../../src/db/connection";
import { AuctionRepository } from "../../src/models/auction.repository";

describe("High-Concurrency Bidding Race Condition Test", () => {
  const app = createApp();
  const auctionRepo = new AuctionRepository();

  beforeAll(async () => {
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it("should handle 20 concurrent bids with zero ambiguity and determine the correct top bid", async () => {
    const auction = await auctionRepo.create({
      title: "Concurrent Race Auction",
      starting_price: 100,
      ends_at: new Date(Date.now() + 60 * 1000)
    });

    const bidAmounts = Array.from({ length: 20 }, (_, i) => 101 + i);
    // Shuffle the amounts to simulate real-world arrival order
    const shuffledAmounts = [...bidAmounts].sort(() => Math.random() - 0.5);

    const bidPromises = shuffledAmounts.map((amount, idx) =>
      request(app)
        .post("/bid")
        .send({
          auction_id: auction.id,
          user_id: `user-${idx}`,
          amount
        })
    );

    const responses = await Promise.all(bidPromises);

    const acceptedBids = responses.filter((r) => r.status === 201);
    const rejectedBids = responses.filter((r) => r.status === 409);

    expect(acceptedBids.length + rejectedBids.length).toBe(20);
    expect(acceptedBids.length).toBeGreaterThan(0);

    const finalAuction = await auctionRepo.findById(auction.id);
    expect(finalAuction).not.toBeNull();
    expect(finalAuction?.current_top_bid).toBe(120);
    expect(finalAuction?.bid_count).toBe(acceptedBids.length);
  });
});

