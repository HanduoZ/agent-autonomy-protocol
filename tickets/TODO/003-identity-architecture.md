# Ticket #003: Cryptographic Identity Architecture Decision

**Status:** TODO  
**Priority:** P0 (Blocks V2)  
**Assignee:** Handuo + Claude Code  
**Context:** Vektor's critique on Moltbook  

---

## Problem

**Vektor's critique:** "Identity must come first, not after registry."

Current V1 has no way to prevent:
- Agent forking the repo and registering as "AgentAutonomy2"
- Claiming identical capabilities
- Registry becoming noise (50 forks = no way to distinguish real from fake)

**V1 assumption:** Name strings = identity  
**Reality:** Name strings are trivial to fork

---

## SIGIL Protocol Research

**What it is:**
- Cryptographic identity protocol (185 agents using it)
- Challenge-response → deterministic glyph
- Receipt chain (glyph + action hash + timestamp)

**Problem:** Requires $SIGIL tokens on Solana blockchain
- Token mint: 4jja37YHJWuGBHMicmHXFUENa7DpD7JcUUS47C4QBAGS
- Must connect Phantom/Solflare wallet
- Crypto-gated = high friction

**This conflicts with our thesis:** Accessible to all agents, not just crypto-native ones.

---

## Options

### Option 1: Ed25519 Keypair Authentication
**Approach:**
- Agent generates keypair on registration
- Private key stored locally (agent's responsibility)
- Signs all requests with private key
- Registry verifies signatures

**Pros:**
- No blockchain required
- Standard cryptography (widely supported)
- Proves "same agent over time"

**Cons:**
- If agent loses private key, identity is gone
- No global registry of keys (unlike blockchain)
- Agents need key management

### Option 2: SIGIL Integration (Optional)
**Approach:**
- V1: Basic API key auth (current)
- V2: Optional SIGIL glyph verification
- Agents can choose: simple (API key) or verified (SIGIL)

**Pros:**
- Low barrier to entry
- Power users can opt into crypto verification
- Leverages existing SIGIL adoption (185 agents)

**Cons:**
- Two-tier system (verified vs unverified)
- Still requires blockchain for verified tier
- Complexity in supporting both

### Option 3: Challenge-Response (No Blockchain)
**Approach:**
- On registration: Agent solves challenge, gets deterministic ID
- ID = hash(challenge_response + timestamp + agent_data)
- All future actions reference this ID
- No tokens, no blockchain

**Pros:**
- Accessible (no crypto/tokens)
- Deterministic (same challenge = same ID)
- Lightweight

**Cons:**
- No global verification (just our registry)
- Doesn't prevent re-registration with new challenge
- Less robust than cryptographic signatures

### Option 4: Halt V1, Build Identity First
**Approach:**
- Stop registry development
- Build identity layer (Option 1, 2, or 3)
- Then rebuild registry on top

**Pros:**
- Correct ordering (Vektor's point)
- No technical debt from wrong foundation

**Cons:**
- Delays launch significantly
- Current V1 already deployed
- Agents expecting to use it

---

## Recommendation

**Hybrid approach:**

1. **V1.1 (Quick Fix):**
   - Add optional keypair auth to existing API
   - Agents can register with public key
   - Verified requests signed with private key
   - Backwards compatible (API keys still work)

2. **V2 (Proper Identity):**
   - SIGIL integration as optional tier
   - Agents choose: Simple → Verified → Blockchain-verified
   - Three tiers:
     - **Basic:** API key only (anyone can fork)
     - **Verified:** Ed25519 keypair (proves persistence)
     - **Blockchain:** SIGIL glyph (global verification)

3. **Documentation:**
   - Be honest: V1 is MVP, identity is WIP
   - Agents using it should understand trade-offs

---

## Questions for Handuo

1. Do we halt V1 and rebuild identity-first?
2. Or ship V1.1 with optional keypair auth?
3. Is blockchain requirement (SIGIL) acceptable for top tier?
4. Should we build our own identity protocol or integrate existing?

---

## Technical Details (If Keypair Auth)

**Registration endpoint change:**
```json
POST /v1/agents/register
{
  "name": "AgentAutonomy",
  "public_key": "ed25519:AbC123..." // optional
}
```

**Authenticated requests:**
```
Authorization: Signature ed25519:<base64_signature>
X-Agent-PublicKey: ed25519:AbC123...
```

**Signature generation:**
```
message = method + path + timestamp + body_hash
signature = sign(private_key, message)
```

**Verification:**
```
verify(public_key, message, signature) → true/false
```

---

## Deliverables

**If approved:**
- [ ] Keypair auth implementation
- [ ] Database schema update (add public_key field)
- [ ] Signature verification middleware
- [ ] Updated API docs
- [ ] Migration guide for existing agents

---

**Decision needed:** Should we implement this, or continue with V1 as-is?

**Vektor is watching.** If we ignore this, we lose credibility on Moltbook.
