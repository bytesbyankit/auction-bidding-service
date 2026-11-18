import { initDb, closeDb } from "../db/connection";
import { AuctionRepository } from "../models/auction.repository";
import { AUCTION_STATUS } from "../constants";

async function seed() {
  await initDb();
  const auctionRepo = new AuctionRepository();

  console.log("Seeding test auctions...");

  const now = Date.now();

  const activeAuction = await auctionRepo.create({
    id: "auc-active-1",
    title: "1968 Vintage Rolex Submariner",
    starting_price: 5000.0,
    ends_at: new Date(now + 24 * 60 * 60 * 1000)
  });
  console.log("Created active auction:", activeAuction.id, "ends in 24 hours");

  const soonAuction = await auctionRepo.create({
    id: "auc-closing-soon",
    title: "Rare First-Edition Comic Book",
    starting_price: 150.0,
    ends_at: new Date(now + 5 * 1000)
  });
  console.log("Created closing-soon auction:", soonAuction.id, "ends in 5 seconds");

  const closedAuction = await auctionRepo.create({
    id: "auc-closed-1",
    title: "Antique Victorian Pocket Watch",
    starting_price: 300.0,
    ends_at: new Date(now - 60 * 1000),
    status: AUCTION_STATUS.ENDED
  });
  console.log("Created already closed auction:", closedAuction.id);

  console.log("Seeding completed successfully.");
  await closeDb();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

