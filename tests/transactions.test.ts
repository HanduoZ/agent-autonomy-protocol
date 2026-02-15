import { describe, it, expect, beforeAll, afterEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/server.js";
import { clearAuthCache } from "../src/middleware/auth.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let request: ReturnType<typeof supertest>;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  request = supertest(app.server);
});

afterEach(() => {
  clearAuthCache();
});

async function setupAgentsAndCapability() {
  const buyer = await request.post("/v1/agents").send({
    name: "Buyer Agent",
    endpoint: "https://httpbin.org/get",
    wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0aBcD",
  });

  const seller = await request.post("/v1/agents").send({
    name: "Seller Agent",
    endpoint: "https://httpbin.org/get",
    wallet_address: "0x842d35Cc6634C0532925a3b844Bc9e7595f0aBcD",
  });

  const cap = await request
    .post(`/v1/agents/${seller.body.id}/capabilities`)
    .set("X-API-Key", seller.body.api_key)
    .send({
      name: "test_capability",
      pricing: { model: "per_request", amount: "100000", currency: "USDC", network: "base" },
      sla: { max_latency_ms: 500, availability: 0.99 },
      input_schema: { type: "object" },
      output_schema: { type: "object" },
    });

  return {
    buyerId: buyer.body.id,
    buyerKey: buyer.body.api_key,
    sellerId: seller.body.id,
    sellerKey: seller.body.api_key,
    capId: cap.body.id,
  };
}

describe("POST /v1/transactions", () => {
  it("records a completed transaction and updates reputation", async () => {
    const { buyerId, buyerKey, sellerId, capId } = await setupAgentsAndCapability();

    const res = await request
      .post("/v1/transactions")
      .set("X-API-Key", buyerKey)
      .send({
        buyer_agent_id: buyerId,
        seller_agent_id: sellerId,
        capability_id: capId,
        status: "completed",
        latency_ms: 320,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.reputation_updated.agent_id).toBe(sellerId);
    expect(res.body.reputation_updated.new_score).toBe(1);
    expect(res.body.reputation_updated.total_transactions).toBe(1);
  });

  it("records a failed transaction and lowers reputation", async () => {
    const { buyerId, buyerKey, sellerId, capId } = await setupAgentsAndCapability();

    // First record a success
    await request
      .post("/v1/transactions")
      .set("X-API-Key", buyerKey)
      .send({
        buyer_agent_id: buyerId,
        seller_agent_id: sellerId,
        capability_id: capId,
        status: "completed",
        latency_ms: 300,
      });

    // Then a failure
    const res = await request
      .post("/v1/transactions")
      .set("X-API-Key", buyerKey)
      .send({
        buyer_agent_id: buyerId,
        seller_agent_id: sellerId,
        capability_id: capId,
        status: "failed",
        latency_ms: 5000,
      });

    expect(res.status).toBe(201);
    expect(res.body.reputation_updated.new_score).toBe(0.5); // 1 success out of 2
    expect(res.body.reputation_updated.total_transactions).toBe(2);
  });

  it("requires authentication", async () => {
    const { buyerId, sellerId, capId } = await setupAgentsAndCapability();

    const res = await request
      .post("/v1/transactions")
      .send({
        buyer_agent_id: buyerId,
        seller_agent_id: sellerId,
        capability_id: capId,
        status: "completed",
      });

    expect(res.status).toBe(401);
  });

  it("rejects non-existent buyer", async () => {
    const { buyerKey, sellerId, capId } = await setupAgentsAndCapability();

    const res = await request
      .post("/v1/transactions")
      .set("X-API-Key", buyerKey)
      .send({
        buyer_agent_id: "00000000-0000-0000-0000-000000000000",
        seller_agent_id: sellerId,
        capability_id: capId,
        status: "completed",
      });

    expect(res.status).toBe(400);
  });
});

describe("GET /v1/agents/:id/reputation", () => {
  it("returns reputation score for an agent", async () => {
    const { buyerId, buyerKey, sellerId, capId } = await setupAgentsAndCapability();

    await request
      .post("/v1/transactions")
      .set("X-API-Key", buyerKey)
      .send({
        buyer_agent_id: buyerId,
        seller_agent_id: sellerId,
        capability_id: capId,
        status: "completed",
        latency_ms: 250,
      });

    const res = await request.get(`/v1/agents/${sellerId}/reputation`);
    expect(res.status).toBe(200);
    expect(res.body.agent_id).toBe(sellerId);
    expect(res.body.score).toBe(1);
    expect(res.body.total_transactions).toBe(1);
    expect(res.body.success_rate).toBe(1);
    expect(res.body.avg_latency_ms).toBe(250);
  });

  it("returns zero reputation for agent with no transactions", async () => {
    const agent = await request.post("/v1/agents").send({
      name: "No Tx Agent",
      endpoint: "https://httpbin.org/get",
      wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0aBcD",
    });

    const res = await request.get(`/v1/agents/${agent.body.id}/reputation`);
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
    expect(res.body.total_transactions).toBe(0);
  });

  it("returns 404 for non-existent agent", async () => {
    const res = await request.get(
      "/v1/agents/00000000-0000-0000-0000-000000000000/reputation",
    );
    expect(res.status).toBe(404);
  });
});
