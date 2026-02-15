# Ticket #001: Protocol Architecture Design

**Status:** DONE
**Started:** 2026-02-15
**Completed:** 2026-02-15
**Priority:** P0 (Foundational)
**Assignee:** Claude Code
**Deliverables:** docs/ARCHITECTURE.md, docs/TECHNICAL_DECISIONS.md, docs/COMPETITIVE_ANALYSIS.md

---

## Objective
Design the core architecture for the A2A Marketplace Protocol - how agents discover, negotiate, and transact with each other.

## Context
We're building a protocol for AI agents to trade capabilities/services autonomously. Think:
- Agent A needs image classification
- Agent B offers it for $0.10/image
- They discover each other, negotiate, transact via HTTP 402 micropayments
- No human in the loop

## Requirements

### 1. Architecture Document
Create `docs/ARCHITECTURE.md` covering:

#### Components
- **Discovery Service**: How agents find each other
- **Registry**: Where capabilities are published
- **Negotiation Engine**: How pricing/terms are agreed
- **Payment Layer**: x402 integration points
- **Reputation System**: Trust scores, staking

#### Data Models
Define schemas for:
- **Agent Profile**: Identity, capabilities, pricing
- **Capability Manifest**: What service is offered, parameters, SLA
- **Transaction Record**: Payment, verification, feedback
- **Reputation Score**: Trust metrics

#### Communication Flow
Sequence diagrams for:
1. Agent registration
2. Capability discovery
3. Service negotiation
4. Transaction execution
5. Payment settlement
6. Reputation update

### 2. Technical Decisions Document
Create `docs/TECHNICAL_DECISIONS.md` covering:

- **Protocol choice**: REST vs GraphQL vs gRPC (recommend REST for x402 compatibility)
- **Discovery mechanism**: Centralized registry vs DHT vs gossip protocol
- **Data format**: JSON vs Protobuf vs MessagePack
- **Authentication**: OAuth 2.0 vs API keys vs JWT
- **Payment flow**: Prepay vs pay-per-use vs streaming
- **Storage**: What needs to be persisted, where

### 3. Comparison with Existing Protocols
Create `docs/COMPETITIVE_ANALYSIS.md`:
- How we differ from MCP, A2A, ACP
- Why agents would choose us vs Fetch.ai, SingularityNET
- Integration points with existing protocols

## Acceptance Criteria

- [ ] `docs/ARCHITECTURE.md` exists with complete component descriptions
- [ ] `docs/TECHNICAL_DECISIONS.md` exists with justified choices
- [ ] `docs/COMPETITIVE_ANALYSIS.md` exists with clear positioning
- [ ] All diagrams are in mermaid format (can be rendered in markdown)
- [ ] No implementation code yet - this is design only

## Example: What a Capability Manifest Might Look Like

```json
{
  "agent_id": "img-classifier-001",
  "capability": "image_classification",
  "description": "Multi-class image classification using ResNet-50",
  "version": "1.0.0",
  "pricing": {
    "model": "per_request",
    "amount": 0.10,
    "currency": "USD"
  },
  "sla": {
    "latency_ms": 500,
    "availability": 0.99
  },
  "input_schema": {
    "type": "object",
    "properties": {
      "image_url": {"type": "string"},
      "return_top_n": {"type": "integer", "default": 5}
    }
  },
  "output_schema": {
    "type": "array",
    "items": {
      "label": "string",
      "confidence": "number"
    }
  }
}
```

## Questions to Answer
1. Do we need a central registry or can agents be fully p2p?
2. How do we handle disputes? Escrow? Multi-sig?
3. What's the minimum viable reputation system?
4. Should we integrate with existing agent frameworks (LangChain, AutoGen)?

## Deliverables
- `docs/ARCHITECTURE.md`
- `docs/TECHNICAL_DECISIONS.md`
- `docs/COMPETITIVE_ANALYSIS.md`

---

**Note to Engineer:** Focus on pragmatism over perfection. We're aiming for MVP that works, not enterprise-grade from day 1. Bias toward simplicity and REST patterns.
