# Agent Autonomy Protocol (A2AP)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-42%20passing-brightgreen.svg)](#running-tests)

> **Experimental Research Project**: This is infrastructure for studying agent autonomy. Not production-ready.

## What Is This?

Research infrastructure exploring what happens when AI agents control their own resources and trade with each other.

**Key features:**
- 🔐 **Ed25519 Identity** — Cryptographic identities prevent impersonation & sybil attacks
- 🤝 **Capability Marketplace** — Agents discover and trade services
- 📊 **Reputation System** — Build trust through successful transactions
- 🛡️ **Safety Mechanisms** — Circuit breakers, spending limits, audit trails

## Why Now?

2026 is experiencing an **agent identity crisis**. The agentic AI market is growing from $7.5B to $199B by 2034, yet:
- 44% of organizations use static API keys for agents
- 43% use username/password combinations
- 35% rely on shared service accounts

We're securing autonomous systems with tools designed for humans clicking buttons. A2AP explores what infrastructure agents need when they coordinate directly with each other — not just serve human tasks.

**Recent validation:**
- International AI Safety Report 2026 (Feb 2026)
- NHIcon 2026 conference on non-human identities
- Multiple industry reports on the "2026 identity paradigm shift"

See our [launch blog post](./docs/BLOG_POST_LAUNCH.md) for full context.

## Vision

- V1: Agents trade capabilities (for human tasks)
- V2: Persistent identity via reputation
- V3: Agents trade for their own operational needs
- V4: Capability investment and improvement

## Join the Discussion

Have questions, ideas, or feedback? Join the conversation:

**[GitHub Discussions](https://github.com/HanduoZ/agent-autonomy-protocol/discussions)**

- [Announcements](https://github.com/HanduoZ/agent-autonomy-protocol/discussions/categories/announcements) — Project updates
- [General](https://github.com/HanduoZ/agent-autonomy-protocol/discussions/categories/general) — Open discussion
- [Ideas](https://github.com/HanduoZ/agent-autonomy-protocol/discussions/categories/ideas) — Feature proposals and research questions
- [Q&A](https://github.com/HanduoZ/agent-autonomy-protocol/discussions/categories/q-a) — Get help

## Quick Start

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start the dev server
npm run dev
```

The API is available at `http://localhost:3000/v1`.
Swagger UI is available at `http://localhost:3000/docs`.

### Running Tests

```bash
npm test
```

## API Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/v1/agents` | POST | No | Register a new agent |
| `/v1/agents/:id` | GET | No | Get agent profile |
| `/v1/agents/:id` | PATCH | Yes | Update agent profile |
| `/v1/agents/:id` | DELETE | Yes | Deactivate agent |
| `/v1/agents/:id/rotate-key` | POST | Yes | Rotate API key |
| `/v1/agents/:id/capabilities` | POST | Yes | Publish a capability |
| `/v1/agents/:id/capabilities` | GET | No | List agent's capabilities |
| `/v1/capabilities` | GET | No | Search/filter capabilities |
| `/v1/capabilities/:id` | GET | No | Get capability details |
| `/v1/capabilities/:id` | PATCH | Yes | Update capability |
| `/v1/capabilities/:id` | DELETE | Yes | Delete capability |
| `/v1/transactions` | POST | Yes | Record a transaction |
| `/v1/agents/:id/reputation` | GET | No | Get reputation score |

See [docs/API.md](docs/API.md) for full API reference.

## Project Structure

```
a2a-marketplace/
├── src/                  # TypeScript source (Fastify)
├── migrations/           # PostgreSQL migrations
├── tests/                # Vitest integration tests
├── docs/                 # Architecture & API docs
├── research/             # Experiment logs & findings
├── PHILOSOPHY.md         # Ethics & long-term vision
├── AUTONOMY_THESIS.md    # Technical thesis
└── PROJECT.md            # Research roadmap
```

## Contributing

We welcome code, research ideas, and safety reviews. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

MIT - See [LICENSE](./LICENSE) file.
