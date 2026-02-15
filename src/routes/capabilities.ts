import type { FastifyInstance } from "fastify";
import pool from "../db/index.js";
import { authenticate, checkOwnership } from "../middleware/auth.js";
import {
  createCapabilitySchema,
  updateCapabilitySchema,
  capabilitySearchSchema,
} from "../schemas/capability.js";
import { notFound, badRequest } from "../utils/errors.js";

export async function capabilityRoutes(app: FastifyInstance) {
  // POST /v1/agents/:id/capabilities — Publish a new capability
  app.post(
    "/agents/:id/capabilities",
    { schema: { ...createCapabilitySchema, params: { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } } } },
    async (request, reply) => {
      const { id: agentId } = request.params as { id: string };

      const authedId = await authenticate(request, reply);
      if (!authedId) return;
      if (!checkOwnership(authedId, agentId, reply)) return;

      // Verify agent exists and is active
      const { rows: agentRows } = await pool.query(
        "SELECT id FROM agents WHERE id = $1 AND status = 'active'",
        [agentId],
      );
      if (agentRows.length === 0) return notFound(reply, "Agent");

      const body = request.body as {
        name: string;
        description?: string;
        category?: string;
        pricing: { model: string; amount: string; currency: string; network: string };
        sla: { max_latency_ms: number; availability: number; max_payload_bytes?: number };
        input_schema: Record<string, unknown>;
        output_schema: Record<string, unknown>;
      };

      // Validate pricing amount is positive
      if (BigInt(body.pricing.amount) <= 0n) {
        return badRequest(reply, "Pricing amount must be positive");
      }

      const { rows } = await pool.query(
        `INSERT INTO capabilities (agent_id, name, description, category, pricing, sla, input_schema, output_schema)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, agent_id, status, created_at`,
        [
          agentId,
          body.name,
          body.description || null,
          body.category || null,
          JSON.stringify(body.pricing),
          JSON.stringify(body.sla),
          JSON.stringify(body.input_schema),
          JSON.stringify(body.output_schema),
        ],
      );

      return reply.status(201).send(rows[0]);
    },
  );

  // GET /v1/agents/:id/capabilities — List capabilities for an agent
  app.get(
    "/agents/:id/capabilities",
    { schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } } } },
    async (request, reply) => {
      const { id: agentId } = request.params as { id: string };

      const { rows } = await pool.query(
        `SELECT id, agent_id, name, description, category, pricing, sla, input_schema, output_schema, status, created_at, updated_at
         FROM capabilities
         WHERE agent_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [agentId],
      );

      return { results: rows };
    },
  );

  // GET /v1/capabilities/:id — Get single capability
  app.get(
    "/capabilities/:id",
    { schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } } } },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const { rows } = await pool.query(
        `SELECT c.*, a.name AS agent_name, a.endpoint AS agent_endpoint,
                a.wallet_address AS agent_wallet_address,
                r.score, r.total_transactions, r.success_rate, r.avg_latency_ms
         FROM capabilities c
         JOIN agents a ON a.id = c.agent_id
         LEFT JOIN reputation_scores r ON r.agent_id = a.id
         WHERE c.id = $1`,
        [id],
      );

      if (rows.length === 0) return notFound(reply, "Capability");

      const row = rows[0];
      return {
        capability: {
          id: row.id,
          agent_id: row.agent_id,
          name: row.name,
          description: row.description,
          category: row.category,
          pricing: row.pricing,
          sla: row.sla,
          input_schema: row.input_schema,
          output_schema: row.output_schema,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        agent: {
          id: row.agent_id,
          name: row.agent_name,
          endpoint: row.agent_endpoint,
          wallet_address: row.agent_wallet_address,
        },
        reputation: {
          score: row.score ?? 0,
          total_transactions: row.total_transactions ?? 0,
          success_rate: row.success_rate ?? 0,
          avg_latency_ms: row.avg_latency_ms ?? 0,
        },
      };
    },
  );

  // GET /v1/capabilities — Search and filter capabilities
  app.get(
    "/capabilities",
    { schema: capabilitySearchSchema },
    async (request, reply) => {
      const query = request.query as {
        q?: string;
        category?: string;
        max_price?: number;
        min_reputation?: number;
        currency?: string;
        network?: string;
        limit?: number;
        offset?: number;
      };

      const limit = query.limit ?? 20;
      const offset = query.offset ?? 0;

      const conditions: string[] = ["c.status = 'active'", "a.status = 'active'"];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (query.q) {
        conditions.push(`c.search_vector @@ plainto_tsquery('english', $${paramIdx})`);
        params.push(query.q);
        paramIdx++;
      }

      if (query.category) {
        conditions.push(`c.category = $${paramIdx}`);
        params.push(query.category);
        paramIdx++;
      }

      if (query.max_price !== undefined) {
        conditions.push(`(c.pricing->>'amount')::bigint <= $${paramIdx}`);
        params.push(query.max_price);
        paramIdx++;
      }

      if (query.min_reputation !== undefined) {
        conditions.push(`COALESCE(r.score, 0) >= $${paramIdx}`);
        params.push(query.min_reputation);
        paramIdx++;
      }

      if (query.currency) {
        conditions.push(`c.pricing->>'currency' = $${paramIdx}`);
        params.push(query.currency);
        paramIdx++;
      }

      if (query.network) {
        conditions.push(`c.pricing->>'network' = $${paramIdx}`);
        params.push(query.network);
        paramIdx++;
      }

      const whereClause = conditions.join(" AND ");

      // Count total matching
      const countResult = await pool.query(
        `SELECT COUNT(*) AS total
         FROM capabilities c
         JOIN agents a ON a.id = c.agent_id
         LEFT JOIN reputation_scores r ON r.agent_id = a.id
         WHERE ${whereClause}`,
        params,
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Fetch results
      const { rows } = await pool.query(
        `SELECT c.id, c.agent_id, c.name, c.description, c.category, c.pricing, c.sla,
                c.input_schema, c.output_schema, c.status, c.created_at,
                a.name AS agent_name, a.endpoint AS agent_endpoint, a.wallet_address AS agent_wallet_address,
                COALESCE(r.score, 0) AS rep_score,
                COALESCE(r.total_transactions, 0) AS rep_total,
                COALESCE(r.success_rate, 0) AS rep_success_rate,
                COALESCE(r.avg_latency_ms, 0) AS rep_avg_latency
         FROM capabilities c
         JOIN agents a ON a.id = c.agent_id
         LEFT JOIN reputation_scores r ON r.agent_id = a.id
         WHERE ${whereClause}
         ORDER BY COALESCE(r.score, 0) DESC, (c.pricing->>'amount')::bigint ASC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset],
      );

      return {
        results: rows.map((row) => ({
          capability: {
            id: row.id,
            name: row.name,
            description: row.description,
            category: row.category,
            pricing: row.pricing,
            sla: row.sla,
          },
          agent: {
            id: row.agent_id,
            name: row.agent_name,
            endpoint: row.agent_endpoint,
            wallet_address: row.agent_wallet_address,
          },
          reputation: {
            score: row.rep_score,
            total_transactions: row.rep_total,
            success_rate: row.rep_success_rate,
            avg_latency_ms: row.rep_avg_latency,
          },
        })),
        pagination: { limit, offset, total },
      };
    },
  );

  // PATCH /v1/capabilities/:id — Update capability
  app.patch(
    "/capabilities/:id",
    { schema: { ...updateCapabilitySchema, params: { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } } } },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Look up the capability to find its agent_id
      const { rows: capRows } = await pool.query(
        "SELECT agent_id FROM capabilities WHERE id = $1 AND status = 'active'",
        [id],
      );
      if (capRows.length === 0) return notFound(reply, "Capability");

      const authedId = await authenticate(request, reply);
      if (!authedId) return;
      if (!checkOwnership(authedId, capRows[0].agent_id, reply)) return;

      const body = request.body as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      for (const key of ["name", "description", "category"] as const) {
        if (body[key] !== undefined) {
          fields.push(`${key} = $${idx++}`);
          values.push(body[key]);
        }
      }
      for (const key of ["pricing", "sla", "input_schema", "output_schema"] as const) {
        if (body[key] !== undefined) {
          fields.push(`${key} = $${idx++}`);
          values.push(JSON.stringify(body[key]));
        }
      }

      if (fields.length === 0) {
        return badRequest(reply, "No fields to update");
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const { rows } = await pool.query(
        `UPDATE capabilities SET ${fields.join(", ")} WHERE id = $${idx} AND status = 'active'
         RETURNING id, agent_id, name, description, category, pricing, sla, input_schema, output_schema, status, created_at, updated_at`,
        values,
      );

      if (rows.length === 0) return notFound(reply, "Capability");
      return rows[0];
    },
  );

  // DELETE /v1/capabilities/:id — Soft delete
  app.delete(
    "/capabilities/:id",
    { schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } } } },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const { rows: capRows } = await pool.query(
        "SELECT agent_id FROM capabilities WHERE id = $1 AND status = 'active'",
        [id],
      );
      if (capRows.length === 0) return notFound(reply, "Capability");

      const authedId = await authenticate(request, reply);
      if (!authedId) return;
      if (!checkOwnership(authedId, capRows[0].agent_id, reply)) return;

      await pool.query(
        "UPDATE capabilities SET status = 'inactive', updated_at = NOW() WHERE id = $1",
        [id],
      );

      return reply.status(204).send();
    },
  );
}
