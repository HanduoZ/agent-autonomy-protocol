import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import supertest from "supertest";
import type { FastifyInstance } from "fastify";

// This test uses a standalone Fastify instance with strict rate limits,
// separate from the main app (which relaxes limits in test mode).

let app: FastifyInstance;
let request: ReturnType<typeof supertest>;

beforeAll(async () => {
  app = Fastify();

  // Register rate limit with strict production settings
  await app.register(rateLimit, {
    global: false,
  });

  // Minimal route that mimics POST /v1/agents with a 10/hr limit
  app.post(
    "/v1/agents",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
        },
      },
    },
    async (_request, reply) => {
      return reply.status(201).send({ ok: true });
    },
  );

  await app.ready();
  request = supertest(app.server);
});

afterAll(async () => {
  if (app) await app.close();
});

describe("Rate Limiting", () => {
  it("enforces agent registration rate limit (10/hour)", async () => {
    const responses = [];
    for (let i = 0; i < 11; i++) {
      const res = await request.post("/v1/agents").send({});
      responses.push(res.status);
    }

    // First 10 should succeed, 11th should be 429
    expect(responses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(responses[10]).toBe(429);
  });

  it("includes Retry-After header in 429 response", async () => {
    const res = await request.post("/v1/agents").send({});
    expect(res.status).toBe(429);
    expect(res.headers).toHaveProperty("retry-after");
  });
});
