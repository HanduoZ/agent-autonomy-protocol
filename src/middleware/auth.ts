import type { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";
import nacl from "tweetnacl";
import pool from "../db/index.js";
import { unauthorized, forbidden, sendError } from "../utils/errors.js";

// In-memory cache: api_key_hash -> agent row
const cache = new Map<
  string,
  { agentId: string; apiKeyHash: string; expiresAt: number }
>();
const CACHE_TTL_MS = 60_000; // 1 minute

const SIGNATURE_MAX_AGE_SECONDS = 300; // 5 minutes

/**
 * Authenticate the request via X-API-Key header or Ed25519 signature.
 * Returns agent_id on success, null on failure (reply already sent).
 *
 * Supports two methods:
 *   1. API Key: X-API-Key header
 *   2. Signature: Authorization: Signature <base64>, X-Agent-PublicKey, X-Signature-Timestamp
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const authHeader = request.headers["authorization"] as string | undefined;

  // Method 2: Ed25519 Signature
  if (authHeader?.startsWith("Signature ")) {
    return authenticateSignature(request, reply, authHeader);
  }

  // Method 1: API Key (existing)
  const apiKey = request.headers["x-api-key"] as string | undefined;
  if (!apiKey) {
    unauthorized(reply);
    return null;
  }

  return authenticateApiKey(apiKey, reply);
}

/**
 * Authenticate via API key (X-API-Key header).
 */
async function authenticateApiKey(
  apiKey: string,
  reply: FastifyReply,
): Promise<string | null> {
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
 * Authenticate via Ed25519 signature.
 * Headers required:
 *   Authorization: Signature <base64_signature>
 *   X-Agent-PublicKey: ed25519:<base64_public_key>
 *   X-Signature-Timestamp: <unix_seconds>
 *
 * Message format: METHOD\nPATH\nTIMESTAMP\nBODY_JSON
 */
async function authenticateSignature(
  request: FastifyRequest,
  reply: FastifyReply,
  authHeader: string,
): Promise<string | null> {
  const signatureB64 = authHeader.slice("Signature ".length);
  const publicKeyHeader = request.headers["x-agent-publickey"] as string | undefined;
  const timestampStr = request.headers["x-signature-timestamp"] as string | undefined;

  if (!publicKeyHeader || !timestampStr) {
    return sendError(reply, 401, "Missing X-Agent-PublicKey or X-Signature-Timestamp header"), null;
  }

  // Validate timestamp (prevent replay attacks)
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return sendError(reply, 401, "Invalid timestamp"), null;
  }
  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > SIGNATURE_MAX_AGE_SECONDS || age < -30) {
    return sendError(reply, 401, "Signature expired"), null;
  }

  // Parse public key
  const keyStr = publicKeyHeader.startsWith("ed25519:")
    ? publicKeyHeader.slice("ed25519:".length)
    : publicKeyHeader;

  let publicKeyBytes: Uint8Array;
  try {
    publicKeyBytes = Buffer.from(keyStr, "base64");
    if (publicKeyBytes.length !== 32) {
      return sendError(reply, 401, "Invalid public key length"), null;
    }
  } catch {
    return sendError(reply, 401, "Invalid public key encoding"), null;
  }

  // Reconstruct signed message
  const body = request.body ? JSON.stringify(request.body) : "";
  const message = `${request.method}\n${request.url}\n${timestampStr}\n${body}`;
  const messageBytes = Buffer.from(message);

  // Verify signature
  let signatureBytes: Uint8Array;
  try {
    signatureBytes = Buffer.from(signatureB64, "base64");
  } catch {
    return sendError(reply, 401, "Invalid signature encoding"), null;
  }

  const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  if (!valid) {
    return sendError(reply, 401, "Invalid signature"), null;
  }

  // Look up agent by public key
  const fullKey = `ed25519:${keyStr}`;
  const { rows } = await pool.query(
    "SELECT id FROM agents WHERE public_key = $1 AND status = 'active'",
    [fullKey],
  );

  if (rows.length === 0) {
    return sendError(reply, 401, "No agent found for this public key"), null;
  }

  return rows[0].id;
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
