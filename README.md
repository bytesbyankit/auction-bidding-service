# Auction Bidding Backend Service

Assignment Identifier: `v#hdf38%44`

A high-concurrency, production-grade auction bidding service built with **TypeScript**, **Node.js**, **Express**, and **RethinkDB**.

---

## 1. Quick Start

### Option A: Run via Docker Compose (Recommended)

Requires Docker and Docker Compose:

```bash
docker compose up --build
```

The service will start on `http://localhost:3000`, with RethinkDB available at port `28015` (and the RethinkDB Web Admin UI at `http://localhost:8080`).

---

### Option B: Run Locally

#### Prerequisites
- Node.js (v20+ recommended)
- RethinkDB running on `localhost:28015`

```bash
# 1. Install dependencies
npm install

# 2. Seed initial sample auctions (active, closing-soon, expired)
npm run seed

# 3. Start development server
npm run dev
```

For production build:
```bash
npm run build
npm start
```

---

## 2. Running Automated Tests

The test suite includes Unit tests (schema validation), API integration tests, and a dedicated **high-concurrency race condition test** (firing 20 simultaneous competing bids to verify atomic CAS and guarantee zero ambiguity in top bid resolution).

```bash
npm test
```

To run only the concurrency race condition test:
```bash
npm run test:concurrency
```

---

## 3. Interactive API Documentation (Swagger & OpenAPI)

- **Swagger UI**: [`http://localhost:3000/api-docs`](http://localhost:3000/api-docs) — Interactive documentation to test and explore all endpoints.
- **OpenAPI 3.0 Spec**: [`http://localhost:3000/openapi.json`](http://localhost:3000/openapi.json) — Raw OpenAPI 3.0.3 specification for Postman or API Gateways.
- **Postman Collection**: [Auction_Bidding_Service.postman_collection.json](file:///home/neosoft/projects/auction-bidding-service/Auction_Bidding_Service.postman_collection.json) — Ready-to-import Postman Collection covering all endpoints, positive/negative test cases, and live SSE streaming.

---

## 4. Real-time Architecture: RethinkDB Changefeeds (SSE)

Unlike traditional architectures where clients poll `GET /auctions/:id` every few hundred milliseconds (wasting CPU and generating database hotspots), this service leverages **native RethinkDB Changefeeds** streamed over **Server-Sent Events (SSE)**.

- **Endpoint**: `GET /auctions/:id/stream`
- **Protocol**: `text/event-stream`
- **Events**:
  - `CONNECTED`: Emitted upon connection establishment.
  - `INITIAL_STATE`: Emits the initial auction state immediately on connection.
  - `BID_UPDATE`: Emitted within milliseconds whenever any client places an accepted bid.
  - `STATUS_CHANGE`: Emitted when auction transitions to `ENDED` or `CANCELLED`.
- **Testing in terminal**:
  ```bash
  curl -N http://localhost:3000/auctions/auc-active-1/stream
  ```

---

## 5. API Reference

### 1. Place a Bid (Mandated Endpoint)
- **Method**: `POST`
- **Path**: `/bid`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "auction_id": "auc-active-1",
    "user_id": "user-42",
    "amount": 5500.00
  }
  ```

#### Response Scenarios:
- **`201 Created` (Accepted)**:
  ```json
  {
    "status": "SUCCESS",
    "code": "ACCEPTED",
    "message": "Bid accepted successfully.",
    "data": {
      "bid": {
        "id": "e458ba83-...",
        "auction_id": "auc-active-1",
        "user_id": "user-42",
        "amount": 5500.0,
        "created_at": "2026-11-18T08:20:00.000Z"
      },
      "auction": {
        "id": "auc-active-1",
        "current_top_bid": 5500.0,
        "current_top_bidder_id": "user-42",
        "bid_count": 1,
        "ends_at": "2026-11-19T08:20:00.000Z"
      }
    }
  }
  ```
- **`200 OK` (Idempotent Duplicate)**:
  Returned when the current top bidder resubmits their identical bid (e.g. client retry or double click).
- **`409 Conflict` (Outbid / Invalid Amount)**:
  Returned when the submitted amount is not strictly higher than the current top bid (`BID_NOT_HIGHER`).
- **`409 Conflict` (Auction Ended)**:
  Returned when the auction has reached or passed its closing timestamp (`AUCTION_CLOSED`).
- **`404 Not Found`**:
  Returned when the `auction_id` does not exist (`AUCTION_NOT_FOUND`).
- **`400 Bad Request`**:
  Returned when the request payload fails schema validation (negative amounts, non-numeric, or extra decimal places).

---

### Auxiliary Endpoints

- **`POST /auctions`**: Create a new auction
  ```json
  {
    "id": "vintage-watch-1",
    "title": "Rolex Submariner",
    "starting_price": 5000,
    "ends_at": "2026-12-01T12:00:00.000Z"
  }
  ```
- **`GET /auctions/:id`**: Fetch auction status, current top bid, and all recorded bids
- **`GET /health`**: Liveness and RethinkDB connection probe

---

## 4. Architectural & Design Decisions (Required Submissions)

### 1. Your data model and why you structured it that way

We implemented a **hybrid transactional data model** combining an **optimistic materialized view (`auctions`)** with an **immutable append-only audit ledger (`bids`)**:

1. **`auctions` Table**:
   - `id` (String, PK)
   - `title` (String)
   - `starting_price` (Number)
   - `current_top_bid` (Number)
   - `current_top_bidder_id` (String | null)
   - `bid_count` (Number)
   - `status` ("ACTIVE" | "ENDED" | "CANCELLED")
   - `ends_at` (ISO Datetime / RethinkDB Time)
   - `created_at`, `updated_at` (Datetime)

2. **`bids` Table**:
   - `id` (UUID, PK)
   - `auction_id` (String, Secondary Index)
   - `user_id` (String, Secondary Index)
   - `amount` (Number)
   - `created_at` (Datetime)

**Why this structure?**
In high-throughput auction systems, calculating the top bid on the fly using `MAX(amount) FROM bids` forces table scans or index contention on every incoming bid. By denormalizing `current_top_bid` and `current_top_bidder_id` directly onto the `auctions` record, RethinkDB can perform **single-document Compare-and-Swap (CAS)** operations with zero distributed locking overhead. The separate `bids` table guarantees a non-destructive, auditable financial log.

---

### 2. How you handled the auction-close boundary case

A bid arriving at the exact millisecond an auction closes presents a critical boundary condition. We resolved this with two invariants:

1. **Database-Authoritative Clock**: We evaluate time using RethinkDB's engine clock (`r.now()`), never the Node.js application process clock (`new Date()`). This eliminates risks associated with server clock drift across horizontally scaled API replicas.
2. **Strict Time Inequality**: The boundary condition is defined as:
   $$\text{timestamp} < \text{ends\_at}$$
   If a bid arrives at $t = \text{ends\_at}$ or $t > \text{ends\_at}$, it is strictly rejected. Bids must be received strictly *before* the instant of closure. The conditional CAS predicate checks `r.now().lt(auctionDoc('ends_at'))`, ensuring atomic rejection inside the query engine without intermediate race windows.

---

### 3. How you handled a request to place a new bid and why

A naive implementation follows a `read-then-write` pattern (`get` $\rightarrow$ `if amount > top` $\rightarrow$ `update`), which is vulnerable to race conditions under concurrent requests.

Instead, we use RethinkDB's atomic document-level mutation using `r.branch`:

```typescript
r.table('auctions')
 .get(auctionId)
 .update((doc: any) => {
   const condition = doc('status').eq('ACTIVE')
     .and(r.now().lt(doc('ends_at')))
     .and(r.expr(amount).gt(doc('current_top_bid')))
     .and(isAllowedBidder);

   return r.branch(
     condition,
     {
       current_top_bid: amount,
       current_top_bidder_id: userId,
       bid_count: doc('bid_count').add(1),
       updated_at: r.now()
     },
     {} // No-op if any condition fails
   );
 }, { returnChanges: true })
```

**Why this approach?**
RethinkDB serializes concurrent writes on a single document. If 50 bids arrive in the same millisecond, RethinkDB evaluates the predicate sequentially against the latest committed state. Exactly one bid wins each increment. When `res.replaced === 1`, we insert the record into `bids`. When `res.replaced === 0`, we query the document to return the exact failure reason (`BID_NOT_HIGHER`, `AUCTION_CLOSED`, or `IDEMPOTENT_DUPLICATE`) with HTTP `409 Conflict`.

---

### 4. What you decided for a user bidding on their own current top bid, and why

We decoupled this scenario into two distinct behaviors:

1. **Duplicate Identical Bid (`amount === current_top_bid` by same user)**:
   - **Decision**: Handled as an **idempotent retry** returning `200 OK` with code `IDEMPOTENT_DUPLICATE`.
   - **Why**: In mobile or unreliable network environments, clients retry timed-out requests where the packet had actually succeeded on the server. Treating this as an idempotent success prevents duplicate bid increments, charge errors, or confusing error states for the user.
2. **Higher Self-Bid (`amount > current_top_bid` by same user)**:
   - **Decision**: **Permitted by default** (configurable via `ALLOW_SELF_OUTBID=true`).
   - **Why**: Real auction platforms (eBay, Sotheby's, Christie's) permit top bidders to increase their bid (e.g. raising their maximum reserve ceiling, deterring competing snipers in the closing minutes, or meeting hidden seller reserves). If business policy requires strict prevention, setting `ALLOW_SELF_OUTBID=false` enforces immediate rejection with `409 SELF_BID_DISALLOWED`.

---

### 5. Part of this assignment that is wrong, underspecified, or problematic in production — and what to change

#### The Critical Flaw: Absence of an Idempotency Key in the API Contract

The assignment defines the endpoint contract as:
`POST /bid` accepting `(auction_id, user_id, amount)`.

**Why this causes production failures:**
In a production financial or bidding system, network latency causes client timeouts before the server response arrives. If a client retries `POST /bid` with `(auction_id: "A", user_id: "U", amount: 150)`:
- If no competing bid arrived in between, the server can infer it was a duplicate because the user is already top bidder at 150.
- **However**, if competing user `U2` managed to place a bid of 150 before the retry, the retried request will be rejected as `BID_NOT_HIGHER`.
- Worse, if a user intentionally pressed "Bid" twice to place two distinct sequential bids (e.g., in a fast-paced live English auction), the backend cannot differentiate between:
  1. A duplicate TCP packet / accidental network retry.
  2. Two distinct user actions.

**The Production Fix:**
1. Introduce an `Idempotency-Key` HTTP header (or `idempotency_key: UUID` in the request body) generated by the client per user interaction.
2. Store processed idempotency keys with their HTTP response payloads in a cache/table with a 24-hour TTL.
3. If an identical `idempotency_key` arrives, return the cached response without re-executing bidding logic.

#### Secondary Production Consideration: Anti-Sniping ("Soft Close")
Hard deadlines (`ends_at`) create predatory bot behavior (auction sniping at $t_{\text{end}} - 50\text{ms}$), leading to high database write spikes at closing seconds and leaving real buyers frustrated. Production platforms implement dynamic closing extensions: if a valid bid lands within the final 2 minutes, `ends_at` is extended by 2 minutes.

