import { r } from "rethinkdb-ts";
import { env } from "../config/env";
import { ensureSchema } from "./migrate";

export { r };

let initialized = false;

export async function initDb(): Promise<void> {
  if (initialized) return;

  await r.connectPool({
    host: env.RETHINKDB_HOST,
    port: env.RETHINKDB_PORT,
    db: env.RETHINKDB_DB,
    user: env.RETHINKDB_USER,
    password: env.RETHINKDB_PASSWORD,
    buffer: env.DB_POOL_MIN_BUFFER,
    max: env.DB_POOL_MAX_CONNECTIONS,
    silent: true
  });

  const pool = r.getPoolMaster();
  if (pool) {
    pool.on("error", () => {});
  }

  await ensureSchema();

  initialized = true;
}

export async function closeDb(): Promise<void> {
  if (initialized) {
    const pool = r.getPoolMaster();
    if (pool) {
      await pool.drain();
    }
    initialized = false;
  }
}

export async function checkDbHealth(): Promise<boolean> {
  try {
    const res = await r.expr(1).add(1).run();
    return res === 2;
  } catch {
    return false;
  }
}
