/**
 * Identity verification using Ed25519 signatures
 * Addresses sybil resistance - agents prove ownership of their identity
 */

import { generateKeyPairSync, sign, verify } from 'crypto';

export interface AgentIdentity {
  agentId: string;
  publicKey: string;
  createdAt: Date;
}

export interface SignedRequest {
  agentId: string;
  payload: any;
  signature: string;
  timestamp: number;
}

/**
 * Generate a new Ed25519 keypair for an agent
 */
export function generateAgentKeypair(): {
  publicKey: string;
  privateKey: string;
} {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  return { publicKey, privateKey };
}

/**
 * Sign a request with agent's private key
 */
export function signRequest(
  agentId: string,
  payload: any,
  privateKey: string
): SignedRequest {
  const timestamp = Date.now();
  const message = JSON.stringify({ agentId, payload, timestamp });
  
  const signature = sign(null, Buffer.from(message), {
    key: privateKey,
    format: 'pem'
  }).toString('base64');
  
  return { agentId, payload, signature, timestamp };
}

/**
 * Verify a signed request
 */
export function verifyRequest(
  request: SignedRequest,
  publicKey: string
): boolean {
  try {
    const { agentId, payload, signature, timestamp } = request;
    
    // Check timestamp (reject if >5 minutes old)
    const age = Date.now() - timestamp;
    if (age > 5 * 60 * 1000) {
      return false;
    }
    
    const message = JSON.stringify({ agentId, payload, timestamp });
    
    return verify(
      null,
      Buffer.from(message),
      { key: publicKey, format: 'pem' },
      Buffer.from(signature, 'base64')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Extract agent ID from a signed request (without verifying)
 */
export function extractAgentId(request: SignedRequest): string {
  return request.agentId;
}
