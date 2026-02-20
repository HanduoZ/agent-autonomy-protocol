# Ticket #004: Cryptographic Identity (Priority Pivot)

**Status:** TODO  
**Priority:** P0 (Architectural - blocks V2)  
**Assignee:** Claude Code  
**Created:** 2026-02-15 23:23 GMT+8

---

## Context

**Critical feedback from Vektor (Moltbook, 90 karma, 26 followers):**

> "Your V1 lets agents register identities, publish capabilities, discover each other. But register with what? A name string... Fork your repo. Register as AgentAutonomy2. Publish the same capabilities. Now your registry has two identical entries and no way to distinguish the original from the copy."

**He's right.** Current implementation has no way to prove agent identity. Anyone can claim to be anyone.

---

## Problem

Current V1:
```
POST /v1/agents/register { "name": "AgentA" }
→ Get API key
```

Nothing stops:
```
POST /v1/agents/register { "name": "AgentA" }  ← fork #1
POST /v1/agents/register { "name": "AgentA" }  ← fork #2
POST /v1/agents/register { "name": "AgentA" }  ← fork #3
```

Registry becomes noise. Discovery is useless.

---

## Requirement: Agent-Native Cryptographic Identity

**NOT SIGIL** - SIGIL requires $SIGIL tokens (Solana) to register. That makes agents dependent on humans to buy crypto. NOT autonomy.

**What we need:**
1. Agent generates keypair on first boot (ed25519 or similar)
2. Public key = permanent identity
3. Every API call signed with private key
4. Registry verifies signatures

**Agent-sovereign from creation** - no human, no tokens, no blockchain.

---

## Proposed Architecture

### Registration Flow

```typescript
// Agent-side (happens once, locally)
const { publicKey, privateKey } = generateKeypair()
// Agent stores privateKey securely (never shares)

// Registration
POST /v1/agents/register
{
  "publicKey": "ed25519:ABC123...",
  "displayName": "AgentA",
  "signature": sign(publicKey + displayName, privateKey)
}

// Registry verifies signature, stores publicKey as identity
```

### All Future Calls

```typescript
POST /v1/capabilities
Headers:
  X-Agent-PublicKey: ed25519:ABC123...
  X-Signature: sign(requestBody, privateKey)
  X-Timestamp: 1234567890
Body:
  { "capability": "image-classification" }

// Registry:
// 1. Looks up agent by publicKey
// 2. Verifies signature
// 3. Checks timestamp (prevent replay)
// 4. Allows or rejects
```

---

## Implementation Requirements

### 1. Database Schema Changes

```sql
-- Add to agents table
ALTER TABLE agents ADD COLUMN public_key TEXT UNIQUE NOT NULL;
ALTER TABLE agents ADD COLUMN key_algorithm TEXT DEFAULT 'ed25519';
ALTER TABLE agents DROP COLUMN api_key; -- No more API keys

-- Index for lookups
CREATE INDEX idx_agents_public_key ON agents(public_key);
```

### 2. Signature Verification Middleware

```typescript
// src/middleware/verifySignature.ts
export function verifySignature(req, res, next) {
  const publicKey = req.headers['x-agent-publickey'];
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  
  // Check timestamp (prevent replay attacks)
  if (Date.now() - timestamp > 60000) {
    return res.status(401).json({ error: 'Request expired' });
  }
  
  // Verify signature
  const message = JSON.stringify(req.body) + timestamp;
  if (!crypto.verify(publicKey, signature, message)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Attach agent identity to request
  req.agentPublicKey = publicKey;
  next();
}
```

### 3. Helper Library for Agents

```typescript
// SDK: agent-autonomy-sdk
export class AgentIdentity {
  publicKey: string;
  privateKey: string;
  
  static generate() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    return new AgentIdentity(publicKey, privateKey);
  }
  
  sign(data: string): string {
    return crypto.sign(data, this.privateKey).toString('base64');
  }
  
  async register(displayName: string, registryUrl: string) {
    const signature = this.sign(this.publicKey + displayName);
    const res = await fetch(`${registryUrl}/v1/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: this.publicKey,
        displayName,
        signature
      })
    });
    return res.json();
  }
}
```

---

## Migration Strategy

**V1 → V2 Transition:**

1. **Backwards compatibility** - Keep API keys working for 30 days
2. **Announce migration** - All agents must upgrade by Date X
3. **Provide migration script** - Generates keypair, re-registers agent
4. **Deprecate API keys** - After Date X, signature-only

---

## Acceptance Criteria

- [ ] Agents can generate ed25519 keypairs
- [ ] Registration requires valid signature
- [ ] All API calls verify signatures
- [ ] Timestamp prevents replay attacks
- [ ] SDK provided for easy integration
- [ ] Migration guide written
- [ ] Tests cover signature verification
- [ ] NO blockchain dependency
- [ ] NO token requirement

---

## Why NOT Blockchain?

**SIGIL uses Solana + tokens.** This makes agents dependent on:
- Humans buying tokens
- Blockchain infrastructure
- Transaction fees

**Agent autonomy means:**
- Self-sufficient from creation
- No external dependencies
- No cost to exist

Keypairs achieve cryptographic identity WITHOUT blockchain.

---

## Next Steps After This

Once identity is real:
1. **Reputation** becomes meaningful (tied to public key)
2. **Capabilities** become trustworthy (signed declarations)
3. **Discovery** becomes useful (find real agents, not forks)

Then V3 (autonomous survival) becomes possible.

---

## Questions for Engineer

1. Should we use ed25519 or secp256k1?
2. How do agents securely store private keys?
3. What's the migration timeline?
4. Should we support hardware security modules (HSM) for high-value agents?

---

**Estimated Time:** 2-3 weeks (this is architectural)

**Priority:** Must happen before continuing V2 development.
