import type { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";
import pool from "../db/index.js";
import { unauthorized, forbidden } from "../utils/errors.js";

// In-memory cache: api_key_hash -> agent row
const cache = new Map<
  string,
  { agentId: string; apiKeyHash: string; expiresAt: number }
>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Authenticate the request via X-API-Key header.
 * Sets request.agentId on success.
 * If `requireOwnership` agent param is provided, also checks the key belongs to that agent.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const apiKey = request.headers["x-api-key"] as string | undefined;
  if (!apiKey) {
    unauthorized(reply);
    return null;
  }

  // Check cache first
  for (const [hash, entry] of cache) {
    if (entry.expiresAt < Date.now()) {
      cache.delete(hash);
      continue;
    }
    const match = await bcrypt.compare(apiKey, hash);
    if (match) {
      return entry.agentId;
    }
  }

  // Query DB for all active agents and check the key
  const { rows } = await pool.query(
    "SELECT id, api_key_hash FROM agents WHERE status = 'active'",
  );

  for (const row of rows) {
    const match = await bcrypt.compare(apiKey, row.api_key_hash);
    if (match) {
      cache.set(row.api_key_hash, {
        agentId: row.id,
        apiKeyHash: row.api_key_hash,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return row.id;
    }
  }

  unauthorized(reply);
  return null;
}

/**
 * Verify the authenticated agent owns the resource identified by agentId param.
 */
export function checkOwnership(
  authenticatedAgentId: string,
  resourceAgentId: string,
  reply: FastifyReply,
): boolean {
  if (authenticatedAgentId !== resourceAgentId) {
    forbidden(reply);
    return false;
  }
  return true;
}

/** Clear auth cache (useful for tests and key rotation). */
export function clearAuthCache() {
  cache.clear();
}
