import request from "supertest";
import http from "http";
import { createApp } from "../../src/app";
import { initDb, closeDb } from "../../src/db/connection";
import { AuctionRepository } from "../../src/models/auction.repository";

describe("Real-time Auction Changefeed SSE Stream Tests", () => {
  const app = createApp();
  let server: http.Server;
  let port: number;
  const auctionRepo = new AuctionRepository();

  beforeAll(async () => {
    await initDb();
    server = app.listen(0);
    port = (server.address() as any).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDb();
  });

  it("should stream live INITIAL_STATE and real-time BID_UPDATE events when bids occur", async () => {
    const auction = await auctionRepo.create({
      title: "Live Stream Test Item",
      starting_price: 100,
      ends_at: new Date(Date.now() + 60 * 1000)
    });

    const receivedChunks: string[] = [];

    // Connect via native http client for perfect SSE stream control
    const req = http.get(`http://127.0.0.1:${port}/auctions/${auction.id}/stream`, (res) => {
      res.on("data", (chunk: Buffer) => {
        receivedChunks.push(chunk.toString());
      });
    });

    // Wait for connection and INITIAL_STATE
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Place a new top bid
    await request(app)
      .post("/bid")
      .send({
        auction_id: auction.id,
        user_id: "stream-tester",
        amount: 150
      });

    // Wait for RethinkDB changefeed to detect and push the BID_UPDATE event
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Close the client connection cleanly
    req.destroy();

    const fullOutput = receivedChunks.join("");

    expect(fullOutput).toContain("event: CONNECTED");
    expect(fullOutput).toContain("event: INITIAL_STATE");
    expect(fullOutput).toContain('"current_top_bid":100');
    expect(fullOutput).toContain("event: BID_UPDATE");
    expect(fullOutput).toContain('"current_top_bid":150');
    expect(fullOutput).toContain('"current_top_bidder_id":"stream-tester"');
  });

  it("should broadcast to multiple concurrent subscribers using single fan-out changefeed", async () => {
    const auction = await auctionRepo.create({
      title: "Multi-subscriber Test Item",
      starting_price: 200,
      ends_at: new Date(Date.now() + 60 * 1000)
    });

    const sub1Chunks: string[] = [];
    const sub2Chunks: string[] = [];

    const req1 = http.get(`http://127.0.0.1:${port}/auctions/${auction.id}/stream`, (res) => {
      res.on("data", (chunk: Buffer) => sub1Chunks.push(chunk.toString()));
    });

    // Connect second subscriber slightly after
    await new Promise((resolve) => setTimeout(resolve, 150));

    const req2 = http.get(`http://127.0.0.1:${port}/auctions/${auction.id}/stream`, (res) => {
      res.on("data", (chunk: Buffer) => sub2Chunks.push(chunk.toString()));
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Place a bid
    await request(app)
      .post("/bid")
      .send({
        auction_id: auction.id,
        user_id: "multi-bidder",
        amount: 250
      });

    await new Promise((resolve) => setTimeout(resolve, 400));

    req1.destroy();
    req2.destroy();

    const output1 = sub1Chunks.join("");
    const output2 = sub2Chunks.join("");

    expect(output1).toContain("event: INITIAL_STATE");
    expect(output1).toContain("event: BID_UPDATE");
    expect(output1).toContain('"current_top_bid":250');

    expect(output2).toContain("event: INITIAL_STATE");
    expect(output2).toContain("event: BID_UPDATE");
    expect(output2).toContain('"current_top_bid":250');
  });

  it("should return 404 JSON if streaming non-existent auction", async () => {
    const res = await request(app).get("/auctions/non-existent-id/stream");
    expect(res.status).toBe(404);
    expect(res.body.status).toBe("ERROR");
    expect(res.body.code).toBe("AUCTION_NOT_FOUND");
  });
});
