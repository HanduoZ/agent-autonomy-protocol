# PM Review: Ticket #001 — Protocol Architecture Design

**Reviewer:** Product Manager  
**Date:** 2026-02-15  
**Status:** ✅ **APPROVED** (with minor follow-up items)

---

## Executive Summary

The architecture is **solid and well-justified**. The team has designed a pragmatic MVP that fills a real gap in the agent economy stack. The scope is appropriate, the technical decisions are defensible, and the competitive positioning is clear.

**Key strengths:**
- Clear separation of concerns (discovery, negotiation, reputation, payment)
- Realistic MVP scope (centralized registry, simple reputation)
- Strong integration story with x402, A2A, MCP
- HTTP-native design lowers barrier to entry
- Well-defined data models and API surface

**Key concerns:**
- Security and fraud prevention under-specified
- No concrete performance targets or scalability numbers
- Onboarding and bootstrapping strategy missing
- Business model for protocol maintainer unclear

**Recommendation:** Proceed to MVP implementation with the follow-up items addressed in parallel.

---

## 🟢 What Works Well

### 1. **Strategic Positioning**

The competitive analysis is excellent. The team clearly understands where A2AMP fits in the stack:
- **Below:** Agent frameworks (LangChain, AutoGen) and applications
- **Above:** Communication (A2A, MCP) and payment rails (x402)
- **Differentiators:** No token required, HTTP-native, protocol-first, reputation built-in

The decision to build **on top of x402** rather than compete with it is smart. x402 handles payment mechanics; A2AMP handles marketplace economics.

### 2. **Pragmatic MVP Scope**

The team resisted the temptation to over-engineer:
- ✅ Centralized registry (not DHT/gossip) → Fast to build, easy to query
- ✅ Simple reputation (success rate) → No staking/slashing complexity yet
- ✅ Accept/reject negotiation (not bidding) → Core value delivered without game theory
- ✅ Monolith deployment → Operational simplicity

This is exactly the right approach for an MVP. Complexity can be added when validated by real usage.

### 3. **Technical Decisions Are Justified**

Every major choice in `TECHNICAL_DECISIONS.md` includes:
- Options considered
- Trade-offs evaluated
- Clear rationale tied to MVP constraints

Example: The REST/HTTP choice is not just "it's familiar" — it's because x402 is built on HTTP semantics. Using gRPC would require a translation layer. This is solid engineering reasoning.

### 4. **Data Models Are Complete**

The JSON schemas for Agent Profile, Capability Manifest, Transaction Record, and Reputation Score are production-ready. They include:
- All required fields
- JSON Schema validation
- Extensibility via metadata fields
- Clear relationships between entities

No major gaps here. Minor refinements will emerge during implementation.

### 5. **Communication Flows Are Well-Documented**

The sequence diagrams (registration, discovery, negotiation, transaction, payment settlement, reputation update) provide clear blueprints for implementation. Each flow shows:
- Who talks to whom
- What data moves where
- Success and failure paths

These diagrams can be handed directly to engineering.

---

## 🟡 Gaps & Concerns

### 1. **Security & Fraud Prevention** ⚠️ *High Priority*

The architecture mentions API keys and JWT but doesn't address:

- **Identity verification:** How do we prevent fake agents flooding the registry?
- **Sybil attacks:** What stops one entity from creating 100 agents with fake good reviews?
- **Capability spoofing:** How do we verify an agent actually provides what it claims?
- **Payment fraud:** What if an agent accepts payment but returns garbage?
- **DDoS protection:** Registry and Discovery are single endpoints — rate limiting?

**Recommendation:**
- Add a section on threat modeling to the architecture doc
- Implement rate limiting and CAPTCHA for registration in MVP
- Require a minimum on-chain balance or transaction history to register (raises bar for spam)
- For v1.1: Add capability verification (test calls before listing)

### 2. **Performance & Scalability Numbers** ⚠️ *Medium Priority*

The architecture says "targets 100-1,000 agents in first 6 months" but doesn't specify:

- Expected queries per second on Discovery
- Expected transactions per agent per day
- Registry database size at 1,000 agents with 5 capabilities each
- P95/P99 latency targets for API endpoints
- When do we need read replicas? When do we need Redis?

**Recommendation:**
- Define concrete SLAs for MVP: e.g., "P95 < 200ms for capability search, 99.9% uptime"
- Do a back-of-the-envelope capacity calculation (see below)
- Set alert thresholds for when scaling interventions are needed

**Quick capacity check:**
- 1,000 agents × 5 capabilities = 5,000 capability records
- Assume 10 searches/agent/day = 10,000 queries/day = ~0.1 QPS
- Assume 5 transactions/agent/day = 5,000 tx/day = ~0.06 TPS

Conclusion: Single PostgreSQL instance is **more than sufficient** for MVP. Good call.

### 3. **Privacy & Data Retention** ⚠️ *Medium Priority*

The architecture states "Request/Response Payloads not stored in MVP" — good for privacy, but:

- What if payloads contain PII (e.g., image classification of a person's face)?
- Transaction records include `request.input` and `response.output` — are these sanitized?
- How long do we retain transaction records? Indefinitely?
- GDPR/CCPA implications for agent data if agents operate in regulated regions?

**Recommendation:**
- Add a data retention policy: e.g., "Transaction records kept for 90 days, then anonymized"
- Allow agents to mark capabilities as "no-logging" if payloads are sensitive
- Add GDPR-compliant data export/deletion endpoints to the API

### 4. **Dispute Resolution Process** ⚠️ *Medium Priority*

The architecture says "disputes are logged and affect reputation scores" but doesn't describe:

- How does an agent file a dispute?
- Who decides if a dispute is valid? (MVP has no escrow or arbitration)
- What happens if a seller has 50% dispute rate but keeps operating?
- Can agents be automatically de-listed for poor performance?

**Recommendation:**
- MVP: Add a `POST /disputes` endpoint where buyers can report failed transactions with evidence (tx_id, error logs)
- Auto-flag agents with >20% dispute rate for manual review
- Add a "status: suspended" state for agents under investigation
- v1.1: Introduce escrow with automated resolution based on response validation

### 5. **Onboarding & Bootstrapping** ⚠️ *High Priority*

This is the classic chicken-and-egg problem:
- Buyers won't join if there are no sellers
- Sellers won't join if there are no buyers

The architecture doesn't address:

- Who are the first 10-20 agents?
- Do we seed the marketplace with demo/free services?
- What's the go-to-market plan?
- Is there a developer incentive program?

**Recommendation:**
- **Phase 0 (Pre-Launch):** Build 10-20 demo agents offering free or low-cost services (image classification, text summarization, web scraping, etc.) to seed liquidity
- **Phase 1 (Invite-Only):** Invite 50-100 agent developers from LangChain/AutoGen communities with a "free facilitator fees for first 1,000 tx" promo
- **Phase 2 (Public Beta):** Open registration, focus on agent framework integrations (ship `a2amp-langchain`, `a2amp-autogen` adapters)

---

## ❓ Questions to Address

### Q1: Who runs the registry?

**Context:** The architecture says "centralized registry" but doesn't specify who operates it.

**Options:**
1. Self-hosted by each user (defeats the purpose of centralized discovery)
2. Hosted by the protocol maintainer as a free public service
3. Hosted by the protocol maintainer as a paid SaaS
4. Hosted by a third party (e.g., Coinbase, Google Cloud)

**Recommendation:** Start with option 2 (free public service) for MVP to maximize adoption. Monitor costs and consider SaaS tiers (free tier + paid for high-volume agents) at 1,000+ agents.

### Q2: What's the business model?

**Context:** If the registry is free, how is protocol development funded?

**Options:**
1. Open-source donation model (GitHub Sponsors, Gitcoin Grants)
2. Transaction fees (e.g., 1% of each transaction goes to protocol treasury)
3. Premium features (advanced analytics, priority listing, verified badges)
4. Facilitator revenue share (negotiate with Coinbase for % of facilitator fees)

**Recommendation:** Combination of #2 and #3. Keep core protocol free, charge for premium features, and take a small transaction fee (0.5-1%) to sustain development.

### Q3: How do we handle protocol versioning?

**Context:** APIs will evolve. How do we avoid breaking existing agents?

**Recommendation:**
- Semantic versioning for the protocol spec (1.0.0 MVP, 1.1.0 for counter-offers, 2.0.0 for escrow)
- API version in URL: `/v1/capabilities`, `/v2/capabilities`
- Support N-1 version for 6 months after new version release
- Add `X-A2AMP-Version` header to all requests/responses

### Q4: What's the criteria for moving to v1.1?

**Context:** The architecture mentions v1.1 features (JWT, counter-offers) but not when to ship them.

**Recommendation:** Ship v1.1 when:
- 500+ agents registered
- 10,000+ transactions completed
- P95 latency < 200ms consistently
- At least 3 agent framework integrations live
- User feedback shows demand for counter-offers or session-based pricing

Don't rush into v1.1 until MVP is proven.

---

## 📊 Missing Pieces (Not Blockers)

These aren't critical for MVP approval but should be addressed during implementation:

1. **Error handling & retries:** What happens if x402 facilitator is down? If a seller's endpoint times out?
2. **Monitoring & observability:** What metrics do we track? What dashboards do we need?
3. **Testing strategy:** Unit tests, integration tests, load tests — what's the plan?
4. **SDK implementation:** Architecture describes what SDK should do, but not language choices or API design
5. **Documentation:** Developer docs, API reference, integration guides — when do we write them?

**Recommendation:** Address these in the MVP implementation ticket (#002).

---

## 🎯 Overall Assessment

**Decision:** ✅ **APPROVED**

This is a well-thought-out architecture for a focused MVP. The team has:
- Identified a real gap in the agent economy stack
- Designed a solution that integrates with (not competes with) existing protocols
- Made pragmatic technical choices justified by MVP constraints
- Scoped appropriately for a 3-4 month initial build

The concerns raised above are **follow-up items**, not blockers. They can be addressed in parallel with implementation or in v1.1.

**Confidence level:** High. This architecture can be built, deployed, and validated within the target timeline.

---

## 📋 Action Items

### Before Starting MVP Implementation:

1. **Security:** Add threat model section to ARCHITECTURE.md (2-3 days)
2. **Onboarding:** Document bootstrap strategy (who are the first 10 agents?) (1 day)
3. **Business model:** Decide on transaction fees and registry hosting model (1 day)

### During MVP Implementation:

4. **Performance:** Define concrete SLAs and set up monitoring (ongoing)
5. **Privacy:** Add data retention policy and privacy controls (1 week)
6. **Disputes:** Implement basic dispute reporting endpoint (1 week)
7. **Versioning:** Add API versioning to all endpoints (1 day)

### Post-MVP:

8. **v1.1 planning:** User research to validate demand for counter-offers, JWT auth, session pricing

---

## ✅ Approval Signature

**Status:** APPROVED  
**Next Step:** Create Ticket #002 — MVP Implementation (Registry + Basic Discovery)  
**Estimated Timeline:** 8-10 weeks for MVP  
**Confidence:** High

---

*PM Review completed: 2026-02-15*
