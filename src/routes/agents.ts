import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import pool from "../db/index.js";
import { authenticate, checkOwnership, clearAuthCache } from "../middleware/auth.js";
import { registrationRateLimit } from "../middleware/rateLimit.js";
import { createAgentSchema, updateAgentSchema, agentParams } from "../schemas/agent.js";
import { notFound, badRequest } from "../utils/errors.js";

const BCRYPT_ROUNDS = 10;

export async function agentRoutes(app: FastifyInstance) {
  // POST /v1/agents — Register a new agent
  app.post(
    "/agents",
    { schema: createAgentSchema, ...registrationRateLimit },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        description?: string;
        endpoint: string;
        wallet_address: string;
        owner?: string;
        metadata?: Record<string, unknown>;
        public_key?: string;
      };

      // Validate endpoint reachability (skip in test environment)
      if (process.env.NODE_ENV !== "test") {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(body.endpoint, {
            method: "HEAD",
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!res.ok && res.status !== 405) {
            return badRequest(reply, `Endpoint ${body.endpoint} returned status ${res.status}`);
          }
        } catch {
          return badRequest(reply, `Endpoint ${body.endpoint} is unreachable`);
        }
      }

      // Generate API key
      const apiKey = `sk_live_${nanoid(32)}`;
      const apiKeyHash = await bcrypt.hash(apiKey, BCRYPT_ROUNDS);

      const verified = !!body.public_key;
      const verificationMethod = body.public_key ? "keypair" : "api_key";

      const { rows } = await pool.query(
        `INSERT INTO agents (name, description, endpoint, wallet_address, owner, api_key_hash, metadata, public_key, verified, verification_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, status, created_at`,
        [
          body.name,
          body.description || null,
          body.endpoint,
          body.wallet_address,
          body.owner || null,
          apiKeyHash,
          JSON.stringify(body.metadata || {}),
          body.public_key || null,
          verified,
          verificationMethod,
        ],
      );

      return reply.status(201).send({
        id: rows[0].id,
        api_key: apiKey,
        status: rows[0].status,
        verified,
        verification_method: verificationMethod,
        created_at: rows[0].created_at,
      });
    },
  );

  // GET /v1/agents/:id — Retrieve agent profile
  app.get(
    "/agents/:id",
    { schema: agentParams },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const { rows } = await pool.query(
        `SELECT a.id, a.name, a.description, a.endpoint, a.wallet_address, a.owner,
                a.status, a.metadata, a.verified, a.verification_method, a.created_at, a.updated_at,
                r.score, r.total_transactions, r.success_rate, r.avg_latency_ms
         FROM agents a
         LEFT JOIN reputation_scores r ON r.agent_id = a.id
         WHERE a.id = $1`,
        [id],
      );

      if (rows.length === 0) return notFound(reply, "Agent");

      const agent = rows[0];
      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        endpoint: agent.endpoint,
        wallet_address: agent.wallet_address,
        owner: agent.owner,
        status: agent.status,
        verified: agent.verified ?? false,
        verification_method: agent.verification_method ?? "api_key",
        metadata: agent.metadata,
        created_at: agent.created_at,
        updated_at: agent.updated_at,
        reputation: {
          score: agent.score ?? 0,
          total_transactions: agent.total_transactions ?? 0,
          success_rate: agent.success_rate ?? 0,
          avg_latency_ms: agent.avg_latency_ms ?? 0,
        },
      };
    },
  );

  // PATCH /v1/agents/:id — Update agent profile
  app.patch(
    "/agents/:id",
    { schema: { ...agentParams, ...updateAgentSchema } },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const agentId = await authenticate(request, reply);
      if (!agentId) return;
      if (!checkOwnership(agentId, id, reply)) return;

      const body = request.body as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      for (const key of ["name", "description", "endpoint", "wallet_address", "owner"] as const) {
        if (body[key] !== undefined) {
          fields.push(`${key} = $${idx++}`);
          values.push(body[key]);
        }
      }
      if (body.metadata !== undefined) {
        fields.push(`metadata = $${idx++}`);
        values.push(JSON.stringify(body.metadata));
      }

      if (fields.length === 0) {
        return badRequest(reply, "No fields to update");
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const { rows } = await pool.query(
        `UPDATE agents SET ${fields.join(", ")} WHERE id = $${idx} AND status = 'active'
         RETURNING id, name, description, endpoint, wallet_address, owner, status, metadata, created_at, updated_at`,
        values,
      );

      if (rows.length === 0) return notFound(reply, "Agent");

      return rows[0];
    },
  );

  // DELETE /v1/agents/:id — Soft delete (set status = inactive)
  app.delete(
    "/agents/:id",
    { schema: agentParams },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const agentId = await authenticate(request, reply);
      if (!agentId) return;
      if (!checkOwnership(agentId, id, reply)) return;

      const { rowCount } = await pool.query(
        `UPDATE agents SET status = 'inactive', updated_at = NOW() WHERE id = $1 AND status = 'active'`,
        [id],
      );

      if (rowCount === 0) return notFound(reply, "Agent");

      clearAuthCache();
      return reply.status(204).send();
    },
  );

  // POST /v1/agents/:id/rotate-key — Rotate API key
  app.post(
    "/agents/:id/rotate-key",
    { schema: agentParams },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const agentId = await authenticate(request, reply);
      if (!agentId) return;
      if (!checkOwnership(agentId, id, reply)) return;

      const newKey = `sk_live_${nanoid(32)}`;
      const hash = await bcrypt.hash(newKey, BCRYPT_ROUNDS);

      const { rowCount } = await pool.query(
        `UPDATE agents SET api_key_hash = $1, updated_at = NOW() WHERE id = $2 AND status = 'active'`,
        [hash, id],
      );

      if (rowCount === 0) return notFound(reply, "Agent");

      clearAuthCache();
      return { api_key: newKey };
    },
  );
}
