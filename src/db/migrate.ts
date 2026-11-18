import { r } from "rethinkdb-ts";
import { env } from "../config/env";
import { DB_TABLES } from "../constants";

/**
 * Ensures required database, tables, and secondary indexes exist in RethinkDB.
 * Separated from connection management to follow Single Responsibility Principle.
 */
export async function ensureSchema(): Promise<void> {
  const dbs = await r.dbList().run();
  if (!dbs.includes(env.RETHINKDB_DB)) {
    await r.dbCreate(env.RETHINKDB_DB).run();
  }

  const tables = await r.db(env.RETHINKDB_DB).tableList().run();
  if (!tables.includes(DB_TABLES.AUCTIONS)) {
    await r.db(env.RETHINKDB_DB).tableCreate(DB_TABLES.AUCTIONS).run();
  }

  if (!tables.includes(DB_TABLES.BIDS)) {
    await r.db(env.RETHINKDB_DB).tableCreate(DB_TABLES.BIDS).run();
  }

  const auctionsTable = r.db(env.RETHINKDB_DB).table(DB_TABLES.AUCTIONS);
  const auctionIndexes = (await auctionsTable.indexList().run()) as string[];
  if (!auctionIndexes.includes("ends_at")) {
    await auctionsTable.indexCreate("ends_at").run();
  }
  if (!auctionIndexes.includes("status")) {
    await auctionsTable.indexCreate("status").run();
  }

  const bidsTable = r.db(env.RETHINKDB_DB).table(DB_TABLES.BIDS);
  const bidsIndexes = (await bidsTable.indexList().run()) as string[];
  if (!bidsIndexes.includes("auction_id")) {
    await bidsTable.indexCreate("auction_id").run();
  }
  if (!bidsIndexes.includes("user_id")) {
    await bidsTable.indexCreate("user_id").run();
  }
  if (!bidsIndexes.includes("auction_user_amount")) {
    await bidsTable
      .indexCreate("auction_user_amount", [r.row("auction_id"), r.row("user_id"), r.row("amount")])
      .run();
  }

  await auctionsTable.indexWait().run();
  await bidsTable.indexWait().run();
}

