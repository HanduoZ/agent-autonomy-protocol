# A2A Marketplace Protocol — Technical Decisions

> Justified technical choices for the A2AMP implementation.

Each decision follows the format: **Options considered → Decision → Rationale**.

---

## TD-001: Protocol — REST over HTTP

### Options

| Option | Pros | Cons |
|---|---|---|
| **REST/HTTP** | x402 native compatibility, universal tooling, simple to debug, stateless | No built-in streaming, verbose for high-frequency |
| GraphQL | Flexible queries, single endpoint | x402 assumes REST paths, adds query complexity |
| gRPC | Fast binary protocol, streaming built-in | x402 not compatible, harder to debug, requires protobuf tooling |

### Decision

**REST/HTTP with JSON bodies.**

### Rationale

x402 is built on HTTP semantics — the `402 Payment Required` status code, `X-PAYMENT` header, and per-URL payment requirements all assume REST-style resource addressing. Using anything else would mean building a translation layer between the payment protocol and our API, which is unnecessary complexity.

REST is also the lowest-friction choice for agent developers. Every language, every framework, every HTTP client works out of the box. For the streaming use case (e.g., LLM token output), we use Server-Sent Events (SSE) over HTTP, which x402 can wrap.

### Future considerations

If high-frequency inter-agent communication becomes a bottleneck, we can add a gRPC sidecar for registered agent-to-agent calls, while keeping REST as the public API surface.

---

## TD-002: Discovery Mechanism — Centralized Registry

### Options

| Option | Pros | Cons |
|---|---|---|
| **Centralized Registry** | Fast queries, simple ops, easy to search | Single point of failure, trust in operator |
| DHT (Kademlia) | Decentralized, no SPOF | Slow lookup, consistency issues, complex NAT traversal |
| Gossip Protocol | Eventually consistent, P2P | Unpredictable convergence, hard to search |
| DNS-based (SRV records) | Standard infrastructure | Limited metadata, no search capability |

### Decision

**Centralized REST registry, with planned federation support.**

### Rationale

For a marketplace targeting 100-1,000 agents in its first 6 months, a centralized registry is dramatically simpler and provides better UX. Agents need fast, filterable search (by capability, price range, SLA, reputation) — this is trivial with a database-backed API and extremely difficult with DHT or gossip.

The registry will expose a standard API that can be replicated across instances. When we need redundancy or geographically distributed registries, we add federation (registries sync with each other) rather than going full P2P.

This mirrors how x402 Bazaar works — a centralized index that agents and facilitators query.

### Mitigation for centralization risks

- Registry is open-source, anyone can run an instance
- Agent data is portable (export/import via standard JSON)
- Well-known endpoint spec (`.well-known/a2amp`) so agents can self-host their manifests even without the registry

---

## TD-003: Data Format — JSON

### Options

| Option | Pros | Cons |
|---|---|---|
| **JSON** | Universal, human-readable, x402 native format | Verbose, no schema enforcement at wire level |
| Protobuf | Compact, typed, fast serialization | Requires code generation, not human-readable |
| MessagePack | Compact binary JSON | Less tooling, harder to debug |
| CBOR | Compact, IETF standard | Less adoption than JSON, harder to debug |

### Decision

**JSON for all API communication. JSON Schema for validation.**

### Rationale

x402's `PaymentRequirements` and `PaymentPayload` are JSON. The A2A protocol uses JSON. Agent frameworks (LangChain, AutoGen) use JSON. Using anything else means serialization overhead at every boundary.

JSON Schema provides type validation where needed (capability manifests, agent profiles) without requiring a compilation step.

For the data volumes we're targeting (thousands of transactions, not millions), JSON's verbosity is irrelevant. A capability manifest is ~500 bytes. Network latency dominates serialization cost by orders of magnitude.

---

## TD-004: Authentication — API Keys (MVP) + JWT (v1.1)

### Options

| Option | Pros | Cons |
|---|---|---|
| **API Keys** | Simple, stateless, easy to rotate | No expiry built-in, no claims/scopes |
| JWT | Expiry, claims, scopes, standard | More complex key management, token refresh needed |
| OAuth 2.0 | Industry standard, delegated auth | Heavy for agent-to-agent, designed for human flows |
| Wallet signatures (EIP-4361) | Ties to payment identity | Requires crypto wallet, UX friction for non-crypto agents |

### Decision

**MVP: API keys issued at registration. v1.1: JWT with wallet-address claims.**

### Rationale

For MVP, agents need a credential to authenticate with the Registry and A2AMP services. API keys (issued during `POST /agents` registration) are the simplest solution that works. They are:
- Stateless (no session management)
- Easy to implement (check against a hash in the database)
- Rotatable via the API

For v1.1, we migrate to JWT tokens that embed the agent's wallet address as a claim. This ties authentication identity to payment identity (the wallet that signs x402 payments is the same identity that authenticates with A2AMP). JWTs also support scoping (read-only vs. full access) and automatic expiry.

We skip OAuth 2.0 because there are no human users in the loop. OAuth's authorization code flow, consent screens, and redirect URIs are designed for human-in-the-loop delegation, which doesn't apply here.

---

## TD-005: Payment Flow — Pay-per-Request via x402

### Options

| Option | Pros | Cons |
|---|---|---|
| **Pay-per-request (x402)** | Simple, pay only for what you use | Per-request overhead, minimum viable amount limits |
| Prepaid credits | Lower per-request overhead | Requires balance management, refund logic |
| Subscription | Predictable revenue for sellers | Doesn't fit variable workloads, billing complexity |
| Streaming micropayments | Real-time billing | Complex state management, partial payment risks |

### Decision

**Pay-per-request using x402's "exact" scheme for MVP.**

### Rationale

x402 was designed for exactly this use case: an agent makes a request, gets a 402, signs a payment, retries, and gets the response. The entire flow is stateless and atomic — no balance tracking, no subscription management, no partial payment states.

The "exact" scheme means the buyer pays exactly the amount specified by the seller. This is the simplest payment model and avoids the complexity of escrow, streaming, or credit systems.

**Minimum payment viability:** On Base (L2), transaction fees are < $0.01, so micropayments down to $0.01 are economically viable. The Coinbase facilitator's free tier (1,000 tx/month) further reduces friction for early adopters.

### Future additions

- **v1.1:** Bulk discount pricing (pay for N requests at reduced rate)
- **v2.0:** Session-based pricing using x402 V2's SIWx (Sign-In-With-X) — authenticate once, stream requests within a session window

---

## TD-006: Storage Architecture

### What needs to be persisted

| Data | Storage | Rationale |
|---|---|---|
| Agent Profiles | PostgreSQL | Structured, queryable, relational |
| Capability Manifests | PostgreSQL | Structured, needs full-text search |
| Transaction Records | PostgreSQL | Structured, needs aggregation queries |
| Reputation Scores | PostgreSQL (materialized view) | Computed from transaction data |
| API Keys | PostgreSQL (hashed) | Lookup by hash |
| x402 Payment Data | Not stored — on-chain | Payment proofs live on the blockchain |
| Request/Response Payloads | Not stored in MVP | Privacy and storage cost concerns |

### Decision

**Single PostgreSQL instance for MVP. No caching layer, no separate search engine.**

### Rationale

PostgreSQL handles everything the MVP needs:
- Structured data with JSON columns for flexible schemas
- Full-text search via `tsvector` for capability discovery
- Aggregation queries for reputation calculation
- ACID transactions for consistency

We do **not** need:
- **Redis** — at MVP scale, database queries are fast enough. Add caching when P95 latency exceeds 100ms.
- **Elasticsearch** — PostgreSQL's full-text search is sufficient for keyword matching across thousands of capabilities. Add Elasticsearch when we need semantic search or faceted filtering at scale.
- **Object storage** — no large blobs to store in MVP.

### Scaling path

1. **Read replicas** when read volume exceeds single-instance capacity
2. **Redis cache** for hot paths (capability search, reputation lookups)
3. **Elasticsearch** for advanced search (semantic matching, complex filters)
4. **TimescaleDB extension** for time-series transaction analytics

---

## TD-007: Deployment — Single Service (Monolith)

### Decision

**Single deployable service for MVP. Split into microservices only when justified by scale.**

### Rationale

The system has 5 logical components (Registry, Discovery, Negotiation, Payment, Reputation) but at MVP scale, they share a database and have tightly coupled data flows. Deploying them as separate services adds:
- Network hops between components
- Service discovery and load balancing
- Distributed transaction complexity
- Operational overhead (5 deployments vs. 1)

A well-structured monolith with clear module boundaries can be split later when specific components need independent scaling. The code is organized by module (`/src/registry`, `/src/discovery`, etc.) so the split is mechanical when needed.

---

## Decision Summary

| # | Decision | Choice | Confidence |
|---|---|---|---|
| TD-001 | Protocol | REST/HTTP | High — x402 requires it |
| TD-002 | Discovery | Centralized Registry | High for MVP |
| TD-003 | Data format | JSON | High — ecosystem standard |
| TD-004 | Authentication | API Keys → JWT | Medium — wallet-based auth may leapfrog |
| TD-005 | Payment flow | Pay-per-request (x402) | High — native fit |
| TD-006 | Storage | PostgreSQL | High for MVP |
| TD-007 | Deployment | Monolith | High for MVP |

---

*Last updated: 2026-02-15*
