import { describe, it, expect, beforeAll, afterEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/server.js";
import pool from "../src/db/index.js";
import { clearAuthCache } from "../src/middleware/auth.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let request: ReturnType<typeof supertest>;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  request = supertest(app.server);
});

afterEach(async () => {
  clearAuthCache();
});

// Helper: register agent with a mock endpoint
async function registerAgent(overrides: Record<string, unknown> = {}) {
  return request.post("/v1/agents").send({
    name: "Test Agent",
    description: "A test agent",
    endpoint: "https://httpbin.org/get",
    wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0aBcD",
    owner: "test-owner",
    metadata: { framework: "test" },
    ...overrides,
  });
}

describe("POST /v1/agents", () => {
  it("registers a new agent and returns id + api_key", async () => {
    const res = await registerAgent();
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("api_key");
    expect(res.body.api_key).toMatch(/^sk_live_/);
    expect(res.body.status).toBe("active");
    expect(res.body).toHaveProperty("created_at");
  });

  it("rejects invalid wallet address", async () => {
    const res = await registerAgent({ wallet_address: "not-a-wallet" });
    expect(res.status).toBe(400);
  });

  it("rejects unreachable endpoint", async () => {
    const res = await registerAgent({
      endpoint: "https://this-domain-does-not-exist-xyzzy.example.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("unreachable");
  });

  it("rejects missing required fields", async () => {
    const res = await request.post("/v1/agents").send({ name: "Incomplete" });
    expect(res.status).toBe(400);
  });
});

describe("GET /v1/agents/:id", () => {
  it("retrieves agent profile with reputation", async () => {
    const reg = await registerAgent();
    const res = await request.get(`/v1/agents/${reg.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test Agent");
    expect(res.body.reputation).toBeDefined();
    expect(res.body.reputation.score).toBe(0);
  });

  it("returns 404 for nonexistent agent", async () => {
    const res = await request.get(
      "/v1/agents/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /v1/agents/:id", () => {
  it("updates agent profile with valid API key", async () => {
    const reg = await registerAgent();
    const res = await request
      .patch(`/v1/agents/${reg.body.id}`)
      .set("X-API-Key", reg.body.api_key)
      .send({ name: "Updated Agent" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Agent");
  });

  it("returns 401 without API key", async () => {
    const reg = await registerAgent();
    const res = await request
      .patch(`/v1/agents/${reg.body.id}`)
      .send({ name: "Nope" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for another agent's profile", async () => {
    const reg1 = await registerAgent({ name: "Agent 1" });
    const reg2 = await registerAgent({ name: "Agent 2" });
    const res = await request
      .patch(`/v1/agents/${reg2.body.id}`)
      .set("X-API-Key", reg1.body.api_key)
      .send({ name: "Hijack" });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /v1/agents/:id", () => {
  it("soft-deletes agent (sets status=inactive)", async () => {
    const reg = await registerAgent();
    const res = await request
      .delete(`/v1/agents/${reg.body.id}`)
      .set("X-API-Key", reg.body.api_key);
    expect(res.status).toBe(204);

    // Agent profile should still be retrievable but show inactive
    const profile = await request.get(`/v1/agents/${reg.body.id}`);
    expect(profile.body.status).toBe("inactive");
  });
});

describe("POST /v1/agents/:id/rotate-key", () => {
  it("rotates API key", async () => {
    const reg = await registerAgent();
    const oldKey = reg.body.api_key;

    const res = await request
      .post(`/v1/agents/${reg.body.id}/rotate-key`)
      .set("X-API-Key", oldKey);

    expect(res.status).toBe(200);
    expect(res.body.api_key).not.toBe(oldKey);
    expect(res.body.api_key).toMatch(/^sk_live_/);

    // Old key should no longer work
    clearAuthCache();
    const patchRes = await request
      .patch(`/v1/agents/${reg.body.id}`)
      .set("X-API-Key", oldKey)
      .send({ name: "Should Fail" });
    expect(patchRes.status).toBe(401);

    // New key should work
    const patchRes2 = await request
      .patch(`/v1/agents/${reg.body.id}`)
      .set("X-API-Key", res.body.api_key)
      .send({ name: "Should Work" });
    expect(patchRes2.status).toBe(200);
  });
});
