import { StatusCodes } from "http-status-codes";

export { StatusCodes };

/**
 * Centralized Application Constants and System Constraints
 * Single source of truth for event names, outcome codes, table names, status values, and system limits.
 */

export const STREAM_EVENTS = {
  CONNECTED: "CONNECTED",
  INITIAL_STATE: "INITIAL_STATE",
  BID_UPDATE: "BID_UPDATE",
  STATUS_CHANGE: "STATUS_CHANGE",
  ERROR: "ERROR"
} as const;

export type StreamEventType = (typeof STREAM_EVENTS)[keyof typeof STREAM_EVENTS];

export const DB_TABLES = {
  AUCTIONS: "auctions",
  BIDS: "bids"
} as const;

export type DbTable = (typeof DB_TABLES)[keyof typeof DB_TABLES];

export const AUCTION_STATUS = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
  CANCELLED: "CANCELLED"
} as const;

export type AuctionStatus = (typeof AUCTION_STATUS)[keyof typeof AUCTION_STATUS];

export const ATOMIC_BID_STATUS = {
  SUCCESS: "SUCCESS",
  NOT_FOUND: "NOT_FOUND",
  CONDITION_FAILED: "CONDITION_FAILED"
} as const;

export type AtomicBidStatus = (typeof ATOMIC_BID_STATUS)[keyof typeof ATOMIC_BID_STATUS];

export const API_RESPONSE_STATUS = {
  SUCCESS: "SUCCESS",
  ERROR: "ERROR"
} as const;

export type ApiResponseStatus = (typeof API_RESPONSE_STATUS)[keyof typeof API_RESPONSE_STATUS];

export const HEALTH_STATUS = {
  HEALTHY: "HEALTHY",
  DEGRADED: "DEGRADED"
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];

export const DB_CONNECTION_STATUS = {
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED"
} as const;

export type DbConnectionStatus = (typeof DB_CONNECTION_STATUS)[keyof typeof DB_CONNECTION_STATUS];

export const OUTCOME_CODES = {
  ACCEPTED: "ACCEPTED",
  IDEMPOTENT_DUPLICATE: "IDEMPOTENT_DUPLICATE",
  AUCTION_NOT_FOUND: "AUCTION_NOT_FOUND",
  AUCTION_CLOSED: "AUCTION_CLOSED",
  BID_NOT_HIGHER: "BID_NOT_HIGHER",
  SELF_BID_DISALLOWED: "SELF_BID_DISALLOWED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  INVALID_BID: "INVALID_BID"
} as const;

export type OutcomeCode = (typeof OUTCOME_CODES)[keyof typeof OUTCOME_CODES];

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0
} as const;

export const SYSTEM_DEFAULTS = {
  SERVER_SHUTDOWN_TIMEOUT_MS: 10_000,
  SSE_HEARTBEAT_INTERVAL_MS: 25_000,
  MAX_PAYLOAD_SIZE: "100kb",
  CURRENCY_MAX_DECIMALS: 2,
  DB_POOL: {
    MIN_BUFFER: 5,
    MAX_CONNECTIONS: 50
  }
} as const;
