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

async function registerAgent(name = "Cap Test Agent") {
  const res = await request.post("/v1/agents").send({
    name,
    description: "Test agent for capabilities",
    endpoint: "https://httpbin.org/get",
    wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0aBcD",
    owner: "test-owner",
  });
  return { id: res.body.id, apiKey: res.body.api_key };
}

function capabilityPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "image_classification",
    description: "Multi-class image classification using ResNet-50",
    category: "vision",
    pricing: {
      model: "per_request",
      amount: "100000",
      currency: "USDC",
      network: "base",
    },
    sla: {
      max_latency_ms: 500,
      availability: 0.99,
    },
    input_schema: {
      type: "object",
      properties: { image_url: { type: "string" } },
      required: ["image_url"],
    },
    output_schema: {
      type: "object",
      properties: {
        classifications: { type: "array" },
      },
    },
    ...overrides,
  };
}

describe("POST /v1/agents/:id/capabilities", () => {
  it("publishes a capability", async () => {
    const agent = await registerAgent();
    const res = await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload());

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.agent_id).toBe(agent.id);
    expect(res.body.status).toBe("active");
  });

  it("rejects capability for another agent (403)", async () => {
    const agent1 = await registerAgent("Agent A");
    const agent2 = await registerAgent("Agent B");

    const res = await request
      .post(`/v1/agents/${agent2.id}/capabilities`)
      .set("X-API-Key", agent1.apiKey)
      .send(capabilityPayload());

    expect(res.status).toBe(403);
  });

  it("rejects invalid pricing amount", async () => {
    const agent = await registerAgent();
    const res = await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload({ pricing: { model: "per_request", amount: "abc", currency: "USDC", network: "base" } }));

    expect(res.status).toBe(400);
  });
});

describe("GET /v1/agents/:id/capabilities", () => {
  it("lists capabilities for an agent", async () => {
    const agent = await registerAgent();
    await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload());
    await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload({ name: "text_analysis" }));

    const res = await request.get(`/v1/agents/${agent.id}/capabilities`);
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GET /v1/capabilities/:id", () => {
  it("returns capability with agent and reputation", async () => {
    const agent = await registerAgent();
    const cap = await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload());

    const res = await request.get(`/v1/capabilities/${cap.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.capability.name).toBe("image_classification");
    expect(res.body.agent.id).toBe(agent.id);
    expect(res.body.reputation).toBeDefined();
  });
});

describe("GET /v1/capabilities (search)", () => {
  it("searches capabilities with full-text search", async () => {
    const agent = await registerAgent();
    await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload({ name: "unique_image_search_test", description: "Very unique capability for searching" }));

    const res = await request.get("/v1/capabilities?q=unique_image_search_test");
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("filters by category", async () => {
    const agent = await registerAgent();
    await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload({ category: "nlp_test_category" }));

    const res = await request.get("/v1/capabilities?category=nlp_test_category");
    expect(res.status).toBe(200);
    expect(res.body.results.every((r: any) => r.capability.category === "nlp_test_category")).toBe(true);
  });

  it("filters by max_price", async () => {
    const agent = await registerAgent();
    await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload({ pricing: { model: "per_request", amount: "50000", currency: "USDC", network: "base" } }));

    const res = await request.get("/v1/capabilities?max_price=50000");
    expect(res.status).toBe(200);
    for (const r of res.body.results) {
      expect(parseInt(r.capability.pricing.amount)).toBeLessThanOrEqual(50000);
    }
  });

  it("paginates results", async () => {
    const res = await request.get("/v1/capabilities?limit=2&offset=0");
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.offset).toBe(0);
  });

  it("returns all capabilities when no filters", async () => {
    const res = await request.get("/v1/capabilities");
    expect(res.status).toBe(200);
    expect(res.body.results).toBeDefined();
    expect(res.body.pagination).toBeDefined();
  });
});

describe("PATCH /v1/capabilities/:id", () => {
  it("updates a capability", async () => {
    const agent = await registerAgent();
    const cap = await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload());

    const res = await request
      .patch(`/v1/capabilities/${cap.body.id}`)
      .set("X-API-Key", agent.apiKey)
      .send({ description: "Updated description" });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe("Updated description");
  });
});

describe("DELETE /v1/capabilities/:id", () => {
  it("soft-deletes a capability", async () => {
    const agent = await registerAgent();
    const cap = await request
      .post(`/v1/agents/${agent.id}/capabilities`)
      .set("X-API-Key", agent.apiKey)
      .send(capabilityPayload());

    const res = await request
      .delete(`/v1/capabilities/${cap.body.id}`)
      .set("X-API-Key", agent.apiKey);

    expect(res.status).toBe(204);
  });
});
