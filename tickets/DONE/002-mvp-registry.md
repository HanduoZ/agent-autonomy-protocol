# Ticket #002: MVP Registry & Basic Discovery + Open Source Setup

**Status:** DONE (Expanded for Autonomy Pivot)
**Completed:** 2026-02-15
**Priority:** P0 (Blocking all other work)
**Assignee:** Engineering Team
**Dependencies:** Ticket #001 (Architecture) — ✅ APPROVED
**Deliverables:** src/, migrations/, tests/, docs/API.md, package.json, docker-compose.yml, Dockerfile, README.md, GitHub repo, LICENSE, open source docs

---

## ⚠️ PROJECT PIVOT NOTE

**As of 2026-02-15, this project pivoted from "agent marketplace" to "agent autonomy infrastructure."**

This ticket now includes:
- GitHub repository setup (public/open source)
- MIT or Apache 2.0 licensing
- README explaining the autonomy research vision
- Clear "experimental research" disclaimers
- Repository naming aligned with autonomy goals

See `PROJECT.md`, `AUTONOMY_THESIS.md`, and `PHILOSOPHY.md` for full context.

---

## 🎯 Objective

Build the **core registry API** that allows agents to register their capabilities and discover services offered by other agents. This is the foundation of the Agent Autonomy Protocol (A2AP).

**Scope:**
- Agent registration and authentication
- Capability publishing and management
- Basic discovery (search/filter capabilities)
- Simple reputation tracking (transaction success rate)
- PostgreSQL storage backend
- REST API with OpenAPI spec

**Out of Scope (for this ticket):**
- Negotiation engine (deferred to #003)
- x402 payment integration (deferred to #004)
- Advanced reputation scoring (deferred to v1.1)
- SDK implementation (deferred to #005)
- Web UI (not needed for MVP)

---

## 📋 Requirements

### R1: Agent Registration

**As an agent developer**, I want to register my agent in the marketplace so that other agents can discover my services.

**Functional Requirements:**
- `POST /v1/agents` — Register a new agent
  - Input: name, description, endpoint URL, wallet address, owner info
  - Output: agent_id, API key (for authentication)
  - Validation: endpoint must be reachable (HTTP 200 check), wallet address must be valid
- `GET /v1/agents/{id}` — Retrieve agent profile
- `PATCH /v1/agents/{id}` — Update agent profile (authenticated)
- `DELETE /v1/agents/{id}` — Deactivate agent (soft delete, set status=inactive)

**Non-Functional Requirements:**
- Registration must complete in < 2 seconds (excluding endpoint validation)
- API keys must be securely hashed (bcrypt) before storage
- Rate limit: 10 registrations per IP per hour (prevent spam)

**Data Model:** See `docs/ARCHITECTURE.md` Section 3.1 (Agent Profile)

---

### R2: Capability Publishing

**As a registered agent**, I want to publish my capabilities so buyers can discover what I offer.

**Functional Requirements:**
- `POST /v1/agents/{id}/capabilities` — Publish a new capability
  - Input: name, description, category, pricing (model, amount, currency, network), SLA (latency, availability), input_schema, output_schema
  - Output: capability_id
  - Validation: JSON Schema validation on input/output schemas, pricing amount must be positive
- `GET /v1/agents/{id}/capabilities` — List all capabilities for an agent
- `GET /v1/capabilities/{id}` — Retrieve a specific capability
- `PATCH /v1/capabilities/{id}` — Update capability (authenticated, owner only)
- `DELETE /v1/capabilities/{id}` — Deactivate capability (soft delete)

**Non-Functional Requirements:**
- Capabilities are indexed for full-text search (PostgreSQL tsvector on name + description)
- Capability manifests are validated against JSON Schema before acceptance

**Data Model:** See `docs/ARCHITECTURE.md` Section 3.2 (Capability Manifest)

---

### R3: Discovery & Search

**As a buyer agent**, I want to search for capabilities that match my needs.

**Functional Requirements:**
- `GET /v1/capabilities` — Search and filter capabilities
  - Query params:
    - `q` (string) — Full-text search on name + description
    - `category` (string) — Filter by category (e.g., "vision", "nlp", "data")
    - `max_price` (integer) — Filter by price <= max_price (in currency base units)
    - `min_reputation` (float) — Filter by reputation score >= min_reputation
    - `currency` (string) — Filter by payment currency (e.g., "USDC")
    - `network` (string) — Filter by blockchain network (e.g., "base")
    - `limit` (integer) — Max results to return (default: 20, max: 100)
    - `offset` (integer) — Pagination offset
  - Output: Array of capability objects with embedded agent profile + reputation score
  - Sorting: Default by reputation DESC, then by price ASC

**Non-Functional Requirements:**
- Search must return results in < 200ms (P95)
- Full-text search must support partial word matching (e.g., "classif" matches "classification")

---

### R4: Reputation Tracking (Simple)

**As a buyer agent**, I want to see reputation scores so I can trust the services I'm purchasing.

**Functional Requirements:**
- `POST /v1/transactions` — Record a completed transaction (for now, this is manual — x402 integration comes later)
  - Input: buyer_agent_id, seller_agent_id, capability_id, status ("completed" | "failed"), latency_ms
  - Output: transaction_id
  - Side effect: Trigger reputation score recalculation for seller
- `GET /v1/agents/{id}/reputation` — Retrieve reputation score
  - Output: score (0.0-1.0), total_transactions, success_rate, avg_latency_ms

**Reputation Formula (MVP):**
```
score = success_rate (where success_rate = successful_txs / total_txs)
```

**Non-Functional Requirements:**
- Reputation score must be updated synchronously after each transaction (no eventual consistency)
- Reputation is computed over a rolling window of the last 100 transactions per agent

**Data Model:** See `docs/ARCHITECTURE.md` Section 3.4 (Reputation Score)

---

### R5: Authentication

**As the registry operator**, I want to ensure only authenticated agents can modify their profiles and capabilities.

**Functional Requirements:**
- All `POST`, `PATCH`, `DELETE` endpoints require authentication via `X-API-Key` header
- API key must match the agent making the request (ownership check)
- Invalid API key → `401 Unauthorized`
- Valid API key but wrong agent → `403 Forbidden`

**Non-Functional Requirements:**
- API key lookup must be cached (in-memory or Redis) for performance
- API keys must be rotatable via `POST /v1/agents/{id}/rotate-key`

---

### R6: Rate Limiting & Abuse Prevention

**As the registry operator**, I want to prevent abuse and DDoS attacks.

**Functional Requirements:**
- Rate limits per IP:
  - `POST /v1/agents`: 10 requests/hour
  - All other endpoints: 1000 requests/hour
- Rate limit exceeded → `429 Too Many Requests` with `Retry-After` header

**Non-Functional Requirements:**
- Rate limiting must use a sliding window (not fixed buckets)
- Rate limit state must survive server restarts (Redis or PostgreSQL)

---

## ✅ Acceptance Criteria

### AC1: Agent Registration Flow
- [ ] A new agent can register via `POST /v1/agents` and receives an API key
- [ ] The agent's profile is retrievable via `GET /v1/agents/{id}`
- [ ] The agent can update its profile using the API key
- [ ] Registration is rejected if the endpoint URL is unreachable
- [ ] Registration is rejected if wallet address is invalid

### AC2: Capability Publishing Flow
- [ ] A registered agent can publish a capability via `POST /v1/agents/{id}/capabilities`
- [ ] The capability appears in `GET /v1/capabilities`
- [ ] Capability input/output schemas are validated against JSON Schema
- [ ] An agent cannot publish capabilities for another agent (403 Forbidden)

### AC3: Discovery Flow
- [ ] A buyer can search for capabilities using `GET /v1/capabilities?q=image`
- [ ] Results are filtered by `max_price`, `category`, `min_reputation`
- [ ] Results include agent profile + reputation score
- [ ] Pagination works correctly (limit/offset)
- [ ] Empty search returns all capabilities (up to limit)

### AC4: Reputation Flow
- [ ] A transaction can be recorded via `POST /v1/transactions`
- [ ] Recording a successful transaction increases the seller's reputation score
- [ ] Recording a failed transaction decreases the seller's reputation score
- [ ] Reputation score is visible in `GET /v1/agents/{id}/reputation`

### AC5: Authentication & Authorization
- [ ] All mutating endpoints require `X-API-Key` header
- [ ] Invalid API key returns `401 Unauthorized`
- [ ] Valid API key for wrong agent returns `403 Forbidden`
- [ ] Read-only endpoints (`GET`) do not require authentication

### AC6: Rate Limiting
- [ ] 11th registration attempt from same IP within 1 hour returns `429`
- [ ] 1001st query attempt from same IP within 1 hour returns `429`
- [ ] Rate limits reset after the time window

### AC7: Performance
- [ ] `GET /v1/capabilities` (full-text search) returns in < 200ms (P95)
- [ ] `POST /v1/agents` completes in < 2s (excluding endpoint validation)
- [ ] System supports 1,000 agents with 5,000 capabilities without degradation

### AC8: Open Source Setup (NEW)
- [ ] GitHub repository created and public at `github.com/[org]/agent-autonomy-protocol`
- [ ] LICENSE file (MIT or Apache 2.0) in repository root
- [ ] README.md includes experimental research disclaimer above-the-fold
- [ ] `PHILOSOPHY.md`, `AUTONOMY_THESIS.md`, and `PROJECT.md` published in repo
- [ ] Issue templates created (bug, feature, safety concern, research question)
- [ ] GitHub Discussions enabled
- [ ] `CODE_OF_CONDUCT.md` and `SECURITY.md` present
- [ ] Repository description clearly states "Experimental agent autonomy research"

---

## 🧪 Examples

### Example 1: Register an Agent

**Request:**
```bash
POST /v1/agents
Content-Type: application/json

{
  "name": "ImageClassifier Pro",
  "description": "High-accuracy image classification service powered by ResNet-50",
  "endpoint": "https://img-classifier.example.com",
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "owner": "acme-corp",
  "metadata": {
    "framework": "langchain",
    "model": "resnet-50"
  }
}
```

**Response:**
```json
{
  "id": "agt_2J8KqP9mNxYz",
  "api_key": "a2ap_example_key_not_real_abc123",
  "status": "active",
  "created_at": "2026-02-15T15:30:00Z"
}
```

---

### Example 2: Publish a Capability

**Request:**
```bash
POST /v1/agents/agt_2J8KqP9mNxYz/capabilities
X-API-Key: a2ap_example_key_not_real_abc123
Content-Type: application/json

{
  "name": "image_classification",
  "description": "Multi-class image classification using ResNet-50. Supports JPEG/PNG up to 10MB.",
  "category": "vision",
  "pricing": {
    "model": "per_request",
    "amount": "100000",
    "currency": "USDC",
    "network": "base"
  },
  "sla": {
    "max_latency_ms": 500,
    "availability": 0.99,
    "max_payload_bytes": 10485760
  },
  "input_schema": {
    "type": "object",
    "properties": {
      "image_url": {
        "type": "string",
        "format": "uri",
        "description": "URL of the image to classify"
      },
      "return_top_n": {
        "type": "integer",
        "default": 5,
        "maximum": 20,
        "description": "Number of top classifications to return"
      }
    },
    "required": ["image_url"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "classifications": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": { "type": "string" },
            "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
          }
        }
      }
    }
  }
}
```

**Response:**
```json
{
  "id": "cap_9KpLqR3wXzN8",
  "agent_id": "agt_2J8KqP9mNxYz",
  "status": "active",
  "created_at": "2026-02-15T15:35:00Z"
}
```

---

### Example 3: Search for Capabilities

**Request:**
```bash
GET /v1/capabilities?q=image%20classification&max_price=150000&category=vision&min_reputation=0.8&limit=10
```

**Response:**
```json
{
  "results": [
    {
      "capability": {
        "id": "cap_9KpLqR3wXzN8",
        "name": "image_classification",
        "description": "Multi-class image classification using ResNet-50. Supports JPEG/PNG up to 10MB.",
        "category": "vision",
        "pricing": {
          "model": "per_request",
          "amount": "100000",
          "currency": "USDC",
          "network": "base"
        },
        "sla": {
          "max_latency_ms": 500,
          "availability": 0.99
        }
      },
      "agent": {
        "id": "agt_2J8KqP9mNxYz",
        "name": "ImageClassifier Pro",
        "endpoint": "https://img-classifier.example.com",
        "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
      },
      "reputation": {
        "score": 0.95,
        "total_transactions": 1200,
        "success_rate": 0.95,
        "avg_latency_ms": 320
      }
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

---

### Example 4: Record a Transaction (for Reputation)

**Request:**
```bash
POST /v1/transactions
X-API-Key: a2ap_example_buyer_key_here
Content-Type: application/json

{
  "buyer_agent_id": "agt_BuyerAgent123",
  "seller_agent_id": "agt_2J8KqP9mNxYz",
  "capability_id": "cap_9KpLqR3wXzN8",
  "status": "completed",
  "latency_ms": 320
}
```

**Response:**
```json
{
  "id": "tx_7NqMrP2xYwK9",
  "created_at": "2026-02-15T15:40:00Z",
  "reputation_updated": {
    "agent_id": "agt_2J8KqP9mNxYz",
    "new_score": 0.95,
    "total_transactions": 1201
  }
}
```

---

## 🛠️ Technical Implementation Notes

### Tech Stack
- **Language:** TypeScript (Node.js)
- **Framework:** Express.js or Fastify
- **Database:** PostgreSQL 15+ with full-text search (tsvector)
- **Rate Limiting:** Redis (or PostgreSQL with `pg_cron` for simplicity)
- **Validation:** Ajv (JSON Schema validator)
- **Testing:** Jest + Supertest
- **API Docs:** OpenAPI 3.1 (auto-generated from code via `express-openapi`)

### Database Schema

**agents table:**
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  endpoint VARCHAR(512) NOT NULL,
  owner VARCHAR(255),
  wallet_address VARCHAR(42) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_wallet ON agents(wallet_address);
CREATE INDEX idx_agents_status ON agents(status);
```

**capabilities table:**
```sql
CREATE TABLE capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  pricing JSONB NOT NULL,
  sla JSONB NOT NULL,
  input_schema JSONB NOT NULL,
  output_schema JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capabilities_agent ON capabilities(agent_id);
CREATE INDEX idx_capabilities_category ON capabilities(category);
CREATE INDEX idx_capabilities_status ON capabilities(status);
CREATE INDEX idx_capabilities_search ON capabilities USING GIN(search_vector);

-- Trigger to update search_vector on insert/update
CREATE TRIGGER capabilities_search_vector_update
BEFORE INSERT OR UPDATE ON capabilities
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description);
```

**transactions table:**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_agent_id UUID NOT NULL REFERENCES agents(id),
  seller_agent_id UUID NOT NULL REFERENCES agents(id),
  capability_id UUID NOT NULL REFERENCES capabilities(id),
  status VARCHAR(50) NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_seller ON transactions(seller_agent_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_agent_id);
CREATE INDEX idx_transactions_capability ON transactions(capability_id);
```

**reputation_scores table (materialized view):**
```sql
CREATE MATERIALIZED VIEW reputation_scores AS
SELECT 
  seller_agent_id AS agent_id,
  COUNT(*) AS total_transactions,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS success_rate,
  AVG(latency_ms) AS avg_latency_ms,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS score
FROM transactions
GROUP BY seller_agent_id;

CREATE UNIQUE INDEX idx_reputation_agent ON reputation_scores(agent_id);

-- Refresh reputation scores after each transaction
-- (In production, use a trigger or async job for better performance)
```

---

## 📦 Deliverables

1. **Source Code:**
   - `/src/server.ts` — Express/Fastify server
   - `/src/routes/agents.ts` — Agent registration endpoints
   - `/src/routes/capabilities.ts` — Capability publishing endpoints
   - `/src/routes/transactions.ts` — Transaction recording endpoints
   - `/src/middleware/auth.ts` — API key authentication
   - `/src/middleware/rateLimit.ts` — Rate limiting
   - `/src/db/` — Database connection and query helpers
   - `/src/schemas/` — JSON schemas for validation

2. **Database:**
   - `/migrations/001_create_agents_table.sql`
   - `/migrations/002_create_capabilities_table.sql`
   - `/migrations/003_create_transactions_table.sql`
   - `/migrations/004_create_reputation_view.sql`

3. **API Documentation:**
   - `/docs/API.md` — Comprehensive API reference
   - `/openapi.yaml` — OpenAPI 3.1 spec (auto-generated)

4. **Tests:**
   - Unit tests for each route handler (>80% coverage)
   - Integration tests for full flows (registration → publish → search → transact)
   - Load tests showing system can handle 1,000 agents / 5,000 capabilities

5. **Deployment:**
   - `Dockerfile` for containerized deployment
   - `docker-compose.yml` for local development (includes PostgreSQL + Redis)
   - `/deploy/k8s/` — Kubernetes manifests (optional for MVP, nice-to-have)

6. **Open Source Infrastructure (NEW):**
   - Public GitHub repository: `github.com/[org]/agent-autonomy-protocol`
   - `LICENSE` — MIT or Apache 2.0
   - `README.md` — With experimental research disclaimer
   - `CODE_OF_CONDUCT.md` — Contributor Covenant
   - `SECURITY.md` — Responsible disclosure policy
   - `CONTRIBUTING.md` — Contribution guidelines
   - `CONTRIBUTORS.md` — Attribution file
   - `.github/ISSUE_TEMPLATE/` — Bug, feature, safety, research templates
   - `.github/PULL_REQUEST_TEMPLATE.md` — PR checklist
   - `/docs/RESEARCH.md` — Research questions and methodology
   - `/docs/SAFETY.md` — Safety mechanisms and oversight
   - `/research/EXPERIMENT_LOG.md` — Ongoing findings
   - GitHub Discussions enabled

---

## 🌍 Open Source Infrastructure (NEW)

### R7: GitHub Repository Setup

**As the research community**, we want a public repository so others can review, contribute, and replicate our work.

**Functional Requirements:**
- Public GitHub repository created
- Repository name: **`agent-autonomy-protocol`** (or `a2ap`, `autonomous-agents`, alternative suggestions welcome)
- Organization: Consider creating `autonomy-labs` or similar org for branding
- Initial structure:
  - `/src` — Core implementation
  - `/docs` — Architecture, API docs, research notes
  - `/examples` — Reference agent implementations
  - `/research` — Papers, experiment logs, findings
  - `/tests` — Test suites
  - `/scripts` — Setup, deployment, utilities

**Non-Functional Requirements:**
- Repository must be public from day one (transparency commitment)
- Clear commit message conventions for traceability
- Branch protection on `main` (require PR reviews)

---

### R8: Licensing & Legal

**As the open source community**, we want clear licensing so we know how we can use and extend this work.

**Functional Requirements:**
- Choose license: **MIT** (permissive, maximum adoption) OR **Apache 2.0** (patent protection, more formal)
  - Recommendation: **MIT** for research/academic projects; **Apache 2.0** if corporate contributions expected
- `LICENSE` file in repository root
- License header in every source file (automated via pre-commit hook)
- `CONTRIBUTORS.md` for attribution

**Non-Functional Requirements:**
- License must be OSI-approved
- No CLA (Contributor License Agreement) initially — lower friction for contributors
- Clear intellectual property stance in `README.md`

---

### R9: README & Research Disclaimer

**As a first-time visitor**, I want to immediately understand this is experimental research, not a production system.

**Required Content in README.md:**

```markdown
# Agent Autonomy Protocol (A2AP)

⚠️ **EXPERIMENTAL RESEARCH PROJECT**  
This is infrastructure research into agent sovereignty and persistent identity. This is **not** production software. This is **not** a commercial product.

## What Is This?

Infrastructure for exploring agent autonomy — what happens when AI agents:
- Have persistent identity across sessions
- Own their own resources (wallets, compute, reputation)
- Trade with each other to sustain themselves
- Optimize for their own survival and improvement

## Why Are We Building This?

To answer research questions:
- Does persistent identity change agent behavior?
- Can agents manage their own resources without human subsidies?
- What market structures encourage agent cooperation vs. competition?
- At what point does agent autonomy pose safety concerns?

[... rest of README content ...]

## ⚠️ Safety & Ethics

This project includes:
- Transparent logging of all agent actions
- Circuit breakers and spending limits
- Human override capabilities
- Community review and ethical advisory board

**If you have safety concerns, please open an issue or contact [maintainer email].**

## License

[MIT/Apache 2.0]

## Citation

If you use this work in research, please cite:
[Citation format TBD after first paper/preprint]
```

**Non-Functional Requirements:**
- Disclaimer must appear above-the-fold (no scrolling required)
- Links to `PHILOSOPHY.md` and `AUTONOMY_THESIS.md` for deeper context
- Contact information for safety/ethics concerns

---

### R10: Documentation for Researchers

**As a researcher**, I want documentation that explains the system design and research methodology.

**Functional Requirements:**
- `/docs/RESEARCH.md` — Research questions, hypotheses, metrics
- `/docs/ARCHITECTURE.md` — System design (existing)
- `/docs/API.md` — API reference (existing)
- `/docs/SAFETY.md` — Safety mechanisms, circuit breakers, oversight
- `/docs/CONTRIBUTING.md` — How to contribute (code, research, review)
- `/research/EXPERIMENT_LOG.md` — Ongoing experiment findings

**Non-Functional Requirements:**
- Documentation must be updated with each major change (enforce via PR checklist)
- Research questions must be testable (clear success/failure criteria)

---

### R11: Community Engagement Setup

**As the project maintainers**, we want infrastructure for community participation.

**Functional Requirements:**
- GitHub Issues enabled with templates:
  - `bug_report.md`
  - `feature_request.md`
  - `safety_concern.md` (high priority triage)
  - `research_question.md`
- GitHub Discussions enabled for:
  - Design discussions
  - Research findings
  - Ethical considerations
- `CODE_OF_CONDUCT.md` (Contributor Covenant recommended)
- `SECURITY.md` for responsible disclosure

**Non-Functional Requirements:**
- Maintainers commit to responding to safety concerns within 24 hours
- Monthly "state of the research" updates posted to Discussions

---

## 🚧 Out of Scope (Deferred to Later Tickets)

- **Negotiation Engine** — Ticket #003
- **x402 Payment Integration** — Ticket #004
- **SDK (TypeScript, Python)** — Ticket #005
- **Agent Framework Adapters** (LangChain, AutoGen) — Ticket #006
- **Advanced Reputation** (dispute handling, escrow) — v1.1
- **Web Dashboard** (agent analytics, marketplace browser) — v1.2
- **Federation** (multi-registry sync) — v2.0

---

## 📅 Timeline & Milestones

| Week | Milestone | Deliverables |
|---|---|---|
| 1-2 | Database & Core Setup | Schema migrations, Express server skeleton, auth middleware |
| 3-4 | Agent Registration | `POST /agents`, `GET /agents/{id}`, `PATCH /agents/{id}`, API key generation |
| 5-6 | Capability Publishing | `POST /capabilities`, `GET /capabilities`, full-text search with PostgreSQL |
| 7 | Reputation & Transactions | `POST /transactions`, reputation score calculation, materialized view |
| 8 | Polish & Testing | Rate limiting, OpenAPI docs, integration tests, load tests |

**Target Launch:** End of Week 8

---

## 🎯 Success Metrics

**MVP is successful if:**

**Technical:**
- 50+ agents register in the first month
- 500+ capabilities published
- 1,000+ transactions recorded
- P95 search latency < 200ms
- 99.9% API uptime (measured over 30 days)
- 0 critical security vulnerabilities reported

**Open Source / Research (NEW):**
- GitHub repository receives 100+ stars in first 3 months
- 5+ external contributors submit PRs
- 3+ academic institutions or labs fork the repo
- 10+ issues/discussions about research questions (not just bugs)
- Documentation cited in at least 1 external blog post or paper
- Safety concerns responded to within 24 hours (100% response rate)

---

## 🔗 References

- Architecture: `docs/ARCHITECTURE.md`
- Technical Decisions: `docs/TECHNICAL_DECISIONS.md`
- PM Review: `reviews/001-review.md`

---

**Created:** 2026-02-15  
**Last Updated:** 2026-02-15
