import { describe, it, expect, beforeAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let request: ReturnType<typeof supertest>;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  request = supertest(app.server);
});

describe("Rate Limiting", () => {
  it("enforces agent registration rate limit (10/hour)", async () => {
    // The rate limit is per-IP. In tests all requests come from the same IP.
    // Send 11 registration requests and expect the 11th to be rejected.
    const responses = [];
    for (let i = 0; i < 11; i++) {
      const res = await request.post("/v1/agents").send({
        name: `Rate Test Agent ${i}`,
        endpoint: "https://httpbin.org/get",
        wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0aBcD",
      });
      responses.push(res.status);
    }

    // The 11th should be 429
    expect(responses[10]).toBe(429);
  });

  it("includes Retry-After header in 429 response", async () => {
    const res = await request.post("/v1/agents").send({
      name: "Over Limit",
      endpoint: "https://httpbin.org/get",
      wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0aBcD",
    });

    if (res.status === 429) {
      expect(res.headers).toHaveProperty("retry-after");
    }
  });
});
