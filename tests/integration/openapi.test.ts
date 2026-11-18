import request from "supertest";
import { createApp } from "../../src/app";

describe("OpenAPI and Swagger UI Endpoints", () => {
  const app = createApp();

  it("should serve the raw OpenAPI specification as JSON", async () => {
    const res = await request(app).get("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toMatch(/application\/json/);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.info.title).toBe("Auction Bidding Service API");
    expect(res.body.paths["/bid"]).toBeDefined();
    expect(res.body.paths["/auctions"]).toBeDefined();
    expect(res.body.paths["/health"]).toBeDefined();
  });

  it("should serve Swagger UI at /api-docs/", async () => {
    const res = await request(app).get("/api-docs/");
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("swagger-ui");
  });
});

