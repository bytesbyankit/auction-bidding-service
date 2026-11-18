import { createBidSchema } from "../../src/modules/bids/bid.schema";

describe("Bid Schema Validation", () => {
  it("should validate a correct bid payload", () => {
    const payload = {
      auction_id: "auc-123",
      user_id: "user-456",
      amount: 150.5
    };

    const parsed = createBidSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("should reject missing auction_id", () => {
    const payload = {
      user_id: "user-456",
      amount: 150
    };

    const parsed = createBidSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("should reject negative or zero amounts", () => {
    const payloadNegative = {
      auction_id: "auc-123",
      user_id: "user-456",
      amount: -10
    };
    expect(createBidSchema.safeParse(payloadNegative).success).toBe(false);

    const payloadZero = {
      auction_id: "auc-123",
      user_id: "user-456",
      amount: 0
    };
    expect(createBidSchema.safeParse(payloadZero).success).toBe(false);
  });

  it("should reject non-numeric amounts", () => {
    const payload = {
      auction_id: "auc-123",
      user_id: "user-456",
      amount: "one hundred"
    };
    expect(createBidSchema.safeParse(payload).success).toBe(false);
  });

  it("should reject amounts with more than 2 decimal places", () => {
    const payload = {
      auction_id: "auc-123",
      user_id: "user-456",
      amount: 100.123
    };
    expect(createBidSchema.safeParse(payload).success).toBe(false);
  });
});

