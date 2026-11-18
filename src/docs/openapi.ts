export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Auction Bidding Service API",
    version: "1.0.0",
    description:
      "Production-grade, high-concurrency auction bidding service powered by Express, TypeScript, and RethinkDB. Implements atomic race-condition-free bidding and idempotent requests."
  },
  servers: [
    {
      url: "/",
      description: "Current environment"
    }
  ],
  tags: [
    {
      name: "Auctions",
      description: "Endpoints for creating and retrieving auctions"
    },
    {
      name: "Bids",
      description: "High-concurrency bidding endpoints with atomic outbid logic"
    },
    {
      name: "System",
      description: "Health and observability endpoints"
    }
  ],
  paths: {
    "/health": {
      get: {
        summary: "Service and database health check",
        description: "Returns health status of the API instance and its connection to RethinkDB.",
        tags: ["System"],
        responses: {
          "200": {
            description: "Service is healthy and database is connected",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" }
              }
            }
          },
          "503": {
            description: "Service is degraded or database is unreachable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" }
              }
            }
          }
        }
      }
    },
    "/bid": {
      post: {
        summary: "Place a bid on an active auction",
        description:
          "Atomically places a bid on an active auction. Resolves concurrent competing bids safely with atomic condition checks. Returns 201 when accepted, 200 if idempotent duplicate, 409 if outbid, 410 if expired, or 404 if not found.",
        tags: ["Bids"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBidRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Bid successfully accepted as the new top bid",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BidAcceptedResponse" }
              }
            }
          },
          "200": {
            description: "Idempotent duplicate: this exact bid is already current top bid",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BidAcceptedResponse" }
              }
            }
          },
          "400": {
            description: "Validation error (invalid amount, missing fields)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationErrorResponse" }
              }
            }
          },
          "404": {
            description: "Auction not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "409": {
            description: "Bid rejected: amount not higher than current top bid or self-outbid disallowed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BidRejectedResponse" }
              }
            }
          },
          "410": {
            description: "Auction has closed or expired",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BidRejectedResponse" }
              }
            }
          }
        }
      }
    },
    "/bids": {
      post: {
        summary: "Place a bid (RESTful alias)",
        description: "Alias for POST /bid.",
        tags: ["Bids"],
        requestBody: {
          $ref: "#/paths/~1bid/post/requestBody"
        },
        responses: {
          $ref: "#/paths/~1bid/post/responses"
        }
      }
    },
    "/auctions": {
      post: {
        summary: "Create a new auction",
        description: "Creates an auction with starting price and expiration timestamp.",
        tags: ["Auctions"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAuctionRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Auction created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuctionCreatedResponse" }
              }
            }
          },
          "400": {
            description: "Validation error in auction payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auctions/{id}": {
      get: {
        summary: "Get auction by ID with bid history",
        description: "Retrieves auction status, top bid, and all recorded bids ordered by timestamp.",
        tags: ["Auctions"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Unique auction ID",
            schema: { type: "string" }
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Maximum number of bids to return (1-100, default: 50)",
            schema: { type: "integer", default: 50, minimum: 1, maximum: 100 }
          },
          {
            name: "offset",
            in: "query",
            required: false,
            description: "Number of bids to skip for pagination (default: 0)",
            schema: { type: "integer", default: 0, minimum: 0 }
          }
        ],
        responses: {
          "200": {
            description: "Auction retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuctionDetailResponse" }
              }
            }
          },
          "404": {
            description: "Auction not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auctions/{id}/stream": {
      get: {
        summary: "Subscribe to live real-time auction changefeed (SSE)",
        description:
          "Establishes a persistent Server-Sent Events (SSE) connection powered by native RethinkDB Changefeeds. Emits CONNECTED, INITIAL_STATE, BID_UPDATE, and STATUS_CHANGE events with zero polling overhead.",
        tags: ["Auctions"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Unique auction ID",
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Real-time SSE event stream",
            content: {
              "text/event-stream": {
                schema: {
                  type: "string",
                  example: "event: BID_UPDATE\ndata: {\"current_top_bid\": 150.0, \"bid_count\": 1}\n\n"
                }
              }
            }
          },
          "404": {
            description: "Auction not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["HEALTHY", "DEGRADED"] },
          database: { type: "string", enum: ["CONNECTED", "DISCONNECTED"] },
          timestamp: { type: "string", format: "date-time" }
        },
        required: ["status", "database", "timestamp"]
      },
      CreateBidRequest: {
        type: "object",
        properties: {
          auction_id: { type: "string", example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" },
          user_id: { type: "string", example: "user_123" },
          amount: { type: "number", minimum: 0.01, example: 150.5 }
        },
        required: ["auction_id", "user_id", "amount"]
      },
      CreateAuctionRequest: {
        type: "object",
        properties: {
          id: { type: "string", example: "custom-id-optional" },
          title: { type: "string", example: "Vintage Rolex Submariner" },
          starting_price: { type: "number", minimum: 0.01, example: 100.0 },
          ends_at: { type: "string", format: "date-time", example: "2026-12-31T23:59:59.000Z" }
        },
        required: ["title", "starting_price", "ends_at"]
      },
      BidAcceptedResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "SUCCESS" },
          code: { type: "string", example: "ACCEPTED" },
          message: { type: "string", example: "Bid accepted successfully." },
          data: {
            type: "object",
            properties: {
              bid: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  auction_id: { type: "string" },
                  user_id: { type: "string" },
                  amount: { type: "number" },
                  created_at: { type: "string", format: "date-time" }
                }
              },
              auction: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  current_top_bid: { type: "number" },
                  current_top_bidder_id: { type: "string", nullable: true },
                  bid_count: { type: "integer" },
                  ends_at: { type: "string", format: "date-time" }
                }
              }
            }
          }
        }
      },
      BidRejectedResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ERROR" },
          code: {
            type: "string",
            enum: ["BID_NOT_HIGHER", "SELF_BID_DISALLOWED", "AUCTION_CLOSED"]
          },
          message: { type: "string" },
          currentTopBid: { type: "number" },
          closedAt: { type: "string", format: "date-time" }
        }
      },
      AuctionCreatedResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "SUCCESS" },
          data: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              starting_price: { type: "number" },
              current_top_bid: { type: "number" },
              current_top_bidder_id: { type: "string", nullable: true },
              bid_count: { type: "integer" },
              ends_at: { type: "string", format: "date-time" },
              status: { type: "string", enum: ["ACTIVE", "ENDED", "CANCELLED"] },
              created_at: { type: "string", format: "date-time" },
              updated_at: { type: "string", format: "date-time" }
            }
          }
        }
      },
      AuctionDetailResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "SUCCESS" },
          data: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              starting_price: { type: "number" },
              current_top_bid: { type: "number" },
              current_top_bidder_id: { type: "string", nullable: true },
              bid_count: { type: "integer" },
              ends_at: { type: "string", format: "date-time" },
              status: { type: "string" },
              bids: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    auction_id: { type: "string" },
                    user_id: { type: "string" },
                    amount: { type: "number" },
                    created_at: { type: "string", format: "date-time" }
                  }
                }
              }
            }
          }
        }
      },
      ValidationErrorResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ERROR" },
          code: { type: "string", example: "VALIDATION_ERROR" },
          message: { type: "string", example: "Validation failed" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" }
              }
            }
          }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ERROR" },
          code: { type: "string" },
          message: { type: "string" }
        }
      }
    }
  }
};

