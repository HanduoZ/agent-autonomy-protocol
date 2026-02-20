import { describe, it, expect, beforeAll, afterEach } from "vitest";
import supertest from "supertest";
import nacl from "tweetnacl";
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

/** Generate an Ed25519 keypair and return base64-encoded keys. */
function generateKeypair() {
  const kp = nacl.sign.keyPair();
  return {
    publicKey: Buffer.from(kp.publicKey).toString("base64"),
    secretKey: kp.secretKey, // raw bytes for signing
    publicKeyFormatted: `ed25519:${Buffer.from(kp.publicKey).toString("base64")}`,
  };
}

/** Sign a request and return the headers needed for signature auth. */
function signRequest(
  method: string,
  path: string,
  body: unknown,
  secretKey: Uint8Array,
  publicKeyB64: string,
  timestampOverride?: number,
) {
  const timestamp = timestampOverride ?? Math.floor(Date.now() / 1000);
  const bodyStr = body ? JSON.stringify(body) : "";
  const message = `${method}\n${path}\n${timestamp}\n${bodyStr}`;
  const signature = nacl.sign.detached(Buffer.from(message), secretKey);

  return {
    authorization: `Signature ${Buffer.from(signature).toString("base64")}`,
    "x-agent-publickey": `ed25519:${publicKeyB64}`,
    "x-signature-timestamp": String(timestamp),
  };
}

/** Register an agent with optional keypair. */
async function registerAgent(overrides: Record<string, unknown> = {}) {
  return request.post("/v1/agents").send({
    name: "Test Agent",
    description: "A test agent",
    endpoint: "https://httpbin.org/get",
    wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0aBcD",
    ...overrides,
  });
}

describe("Registration with keypair", () => {
  it("registers without public_key → verified=false, verification_method=api_key", async () => {
    const res = await registerAgent();
    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(false);
    expect(res.body.verification_method).toBe("api_key");
  });

  it("registers with public_key → verified=true, verification_method=keypair", async () => {
    const kp = generateKeypair();
    const res = await registerAgent({ public_key: kp.publicKeyFormatted });
    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(true);
    expect(res.body.verification_method).toBe("keypair");
  });

  it("rejects invalid public_key format", async () => {
    const res = await registerAgent({ public_key: "not-a-valid-key" });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate public_key", async () => {
    const kp = generateKeypair();
    await registerAgent({ public_key: kp.publicKeyFormatted, name: "Agent A" });
    const res = await registerAgent({ public_key: kp.publicKeyFormatted, name: "Agent B" });
    expect(res.status).toBe(500); // unique constraint violation
  });
});

describe("GET /v1/agents/:id includes verified status", () => {
  it("shows verified=false for API-key-only agent", async () => {
    const reg = await registerAgent();
    const res = await request.get(`/v1/agents/${reg.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(false);
    expect(res.body.verification_method).toBe("api_key");
  });

  it("shows verified=true for keypair agent", async () => {
    const kp = generateKeypair();
    const reg = await registerAgent({ public_key: kp.publicKeyFormatted });
    const res = await request.get(`/v1/agents/${reg.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.verification_method).toBe("keypair");
  });
});

describe("Signature-based authentication", () => {
  it("authenticates with valid signature", async () => {
    const kp = generateKeypair();
    const reg = await registerAgent({ public_key: kp.publicKeyFormatted });
    const agentId = reg.body.id;

    const path = `/v1/agents/${agentId}`;
    const body = { name: "Signed Update" };
    const headers = signRequest("PATCH", path, body, kp.secretKey, kp.publicKey);

    const res = await request
      .patch(path)
      .set("Authorization", headers.authorization)
      .set("X-Agent-PublicKey", headers["x-agent-publickey"])
      .set("X-Signature-Timestamp", headers["x-signature-timestamp"])
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Signed Update");
  });

  it("rejects invalid signature", async () => {
    const kp = generateKeypair();
    const wrongKp = generateKeypair();
    const reg = await registerAgent({ public_key: kp.publicKeyFormatted });
    const agentId = reg.body.id;

    const path = `/v1/agents/${agentId}`;
    const body = { name: "Bad Sig" };
    // Sign with wrong key
    const headers = signRequest("PATCH", path, body, wrongKp.secretKey, kp.publicKey);

    const res = await request
      .patch(path)
      .set("Authorization", headers.authorization)
      .set("X-Agent-PublicKey", headers["x-agent-publickey"])
      .set("X-Signature-Timestamp", headers["x-signature-timestamp"])
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid signature");
  });

  it("rejects expired timestamp", async () => {
    const kp = generateKeypair();
    const reg = await registerAgent({ public_key: kp.publicKeyFormatted });
    const agentId = reg.body.id;

    const path = `/v1/agents/${agentId}`;
    const body = { name: "Expired" };
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    const headers = signRequest("PATCH", path, body, kp.secretKey, kp.publicKey, oldTimestamp);

    const res = await request
      .patch(path)
      .set("Authorization", headers.authorization)
      .set("X-Agent-PublicKey", headers["x-agent-publickey"])
      .set("X-Signature-Timestamp", headers["x-signature-timestamp"])
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Signature expired");
  });

  it("rejects missing headers", async () => {
    const res = await request
      .patch("/v1/agents/00000000-0000-0000-0000-000000000000")
      .set("Authorization", "Signature abc123")
      .send({ name: "No Headers" });

    expect(res.status).toBe(401);
  });

  it("API key auth still works for keypair agents", async () => {
    const kp = generateKeypair();
    const reg = await registerAgent({ public_key: kp.publicKeyFormatted });

    const res = await request
      .patch(`/v1/agents/${reg.body.id}`)
      .set("X-API-Key", reg.body.api_key)
      .send({ name: "API Key Update" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("API Key Update");
  });
});

describe("Discovery filtering by verified status", () => {
  it("filters capabilities by verified agents", async () => {
    // Create verified agent with capability
    const kp = generateKeypair();
    const verifiedAgent = await registerAgent({
      name: "Verified Agent",
      public_key: kp.publicKeyFormatted,
    });
    await request
      .post(`/v1/agents/${verifiedAgent.body.id}/capabilities`)
      .set("X-API-Key", verifiedAgent.body.api_key)
      .send({
        name: "Verified Capability",
        pricing: { model: "per_request", amount: "100", currency: "USDC", network: "base" },
        sla: { max_latency_ms: 1000, availability: 0.99 },
        input_schema: { type: "object" },
        output_schema: { type: "object" },
      });

    // Create unverified agent with capability
    const unverifiedAgent = await registerAgent({ name: "Unverified Agent" });
    await request
      .post(`/v1/agents/${unverifiedAgent.body.id}/capabilities`)
      .set("X-API-Key", unverifiedAgent.body.api_key)
      .send({
        name: "Unverified Capability",
        pricing: { model: "per_request", amount: "100", currency: "USDC", network: "base" },
        sla: { max_latency_ms: 1000, availability: 0.99 },
        input_schema: { type: "object" },
        output_schema: { type: "object" },
      });

    // Search with verified=true
    const res = await request.get("/v1/capabilities?verified=true");
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThanOrEqual(1);
    for (const result of res.body.results) {
      expect(result.agent.verified).toBe(true);
    }

    // Search with verified=false
    const res2 = await request.get("/v1/capabilities?verified=false");
    expect(res2.status).toBe(200);
    for (const result of res2.body.results) {
      expect(result.agent.verified).toBe(false);
    }
  });
});
