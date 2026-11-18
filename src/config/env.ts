import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RETHINKDB_HOST: z.string().default("localhost"),
  RETHINKDB_PORT: z.coerce.number().default(28015),
  RETHINKDB_DB: z.string().default("auction_db"),
  RETHINKDB_USER: z.string().default("admin"),
  RETHINKDB_PASSWORD: z.string().default(""),
  ALLOW_SELF_OUTBID: z
    .string()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
  ENABLE_SWAGGER: z
    .string()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
  CORS_ORIGIN: z.string().default("*"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  BID_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(60),
  DB_POOL_MIN_BUFFER: z.coerce.number().default(10),
  DB_POOL_MAX_CONNECTIONS: z.coerce.number().default(100)
});

export const env = envSchema.parse(process.env);

