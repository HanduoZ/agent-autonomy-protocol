import type { FastifyInstance } from "fastify";
import pool from "../db/index.js";
import { authenticate } from "../middleware/auth.js";
import { notFound, badRequest } from "../utils/errors.js";

const createTransactionSchema = {
  body: {
    type: "object",
    required: ["buyer_agent_id", "seller_agent_id", "capability_id", "status"],
    properties: {
      buyer_agent_id: { type: "string", format: "uuid" },
      seller_agent_id: { type: "string", format: "uuid" },
      capability_id: { type: "string", format: "uuid" },
      status: { type: "string", enum: ["completed", "failed"] },
      latency_ms: { type: "integer", minimum: 0 },
    },
    additionalProperties: false,
  },
} as const;

export async function transactionRoutes(app: FastifyInstance) {
  // POST /v1/transactions — Record a completed transaction
  app.post(
    "/transactions",
    { schema: createTransactionSchema },
    async (request, reply) => {
      const authedId = await authenticate(request, reply);
      if (!authedId) return;

      const body = request.body as {
        buyer_agent_id: string;
        seller_agent_id: string;
        capability_id: string;
        status: "completed" | "failed";
        latency_ms?: number;
      };

      // Verify buyer exists
      const { rows: buyerRows } = await pool.query(
        "SELECT id FROM agents WHERE id = $1 AND status = 'active'",
        [body.buyer_agent_id],
      );
      if (buyerRows.length === 0) return badRequest(reply, "Buyer agent not found");

      // Verify seller exists
      const { rows: sellerRows } = await pool.query(
        "SELECT id FROM agents WHERE id = $1 AND status = 'active'",
        [body.seller_agent_id],
      );
      if (sellerRows.length === 0) return badRequest(reply, "Seller agent not found");

      // Verify capability exists
      const { rows: capRows } = await pool.query(
        "SELECT id FROM capabilities WHERE id = $1 AND status = 'active'",
        [body.capability_id],
      );
      if (capRows.length === 0) return badRequest(reply, "Capability not found");

      // Insert transaction — the DB trigger will update reputation_scores
      const { rows } = await pool.query(
        `INSERT INTO transactions (buyer_agent_id, seller_agent_id, capability_id, status, latency_ms)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [
          body.buyer_agent_id,
          body.seller_agent_id,
          body.capability_id,
          body.status,
          body.latency_ms ?? null,
        ],
      );

      // Fetch updated reputation
      const { rows: repRows } = await pool.query(
        "SELECT score, total_transactions FROM reputation_scores WHERE agent_id = $1",
        [body.seller_agent_id],
      );

      return reply.status(201).send({
        id: rows[0].id,
        created_at: rows[0].created_at,
        reputation_updated: {
          agent_id: body.seller_agent_id,
          new_score: repRows[0]?.score ?? 0,
          total_transactions: repRows[0]?.total_transactions ?? 0,
        },
      });
    },
  );

  // GET /v1/agents/:id/reputation — Retrieve reputation score
  app.get(
    "/agents/:id/reputation",
    { schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } } } },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verify agent exists
      const { rows: agentRows } = await pool.query(
        "SELECT id FROM agents WHERE id = $1",
        [id],
      );
      if (agentRows.length === 0) return notFound(reply, "Agent");

      const { rows } = await pool.query(
        "SELECT score, total_transactions, success_rate, avg_latency_ms FROM reputation_scores WHERE agent_id = $1",
        [id],
      );

      if (rows.length === 0) {
        return {
          agent_id: id,
          score: 0,
          total_transactions: 0,
          success_rate: 0,
          avg_latency_ms: 0,
        };
      }

      return {
        agent_id: id,
        score: rows[0].score,
        total_transactions: rows[0].total_transactions,
        success_rate: rows[0].success_rate,
        avg_latency_ms: rows[0].avg_latency_ms,
      };
    },
  );
}
