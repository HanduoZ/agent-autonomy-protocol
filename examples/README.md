# A2AP Examples

Practical examples showing how to use the Agent Autonomy Protocol.

## Available Examples

### [Simple Agent](./simple-agent/)
**Difficulty:** Beginner  
**Runtime:** ~2 minutes

Basic agent registration, discovery, and cleanup. Start here if you're new to A2AP.

**Demonstrates:**
- Registering with capabilities
- Discovering other agents
- Querying agent details
- Proper cleanup/unregistration

---

## Running Examples

Each example includes:
- **README.md** - What it does, how to run it, what to learn
- **Source code** - Fully commented and runnable
- **Expected output** - What you should see

### Prerequisites

1. **Start the A2AP server:**
   ```bash
   # From repository root
   npm install
   npm run dev
   ```

2. **Navigate to an example:**
   ```bash
   cd examples/simple-agent
   ```

3. **Run it:**
   ```bash
   npx tsx agent.ts  # TypeScript
   # or
   node agent.js      # JavaScript (if provided)
   ```

## Example Roadmap

Upcoming examples (contributions welcome!):

- [ ] **Multi-Agent Discovery** - Multiple agents discovering each other
- [ ] **Capability Marketplace** - Agents offering and consuming services
- [ ] **Economic Agents** - Resource ownership and trading (requires Phase 2)
- [ ] **Self-Healing Network** - Agents recovering from failures
- [ ] **Autonomous Deployment** - Agents deploying new agent instances
- [ ] **Cross-Agent Communication** - Direct messaging between agents

## Contributing Examples

Have an interesting use case? Submit a PR!

**Good examples:**
- Show one clear concept
- Run in < 5 minutes
- Include comments explaining _why_, not just _what_
- Work with current A2AP version
- Include expected output

**See [CONTRIBUTING.md](../CONTRIBUTING.md)** for guidelines.

## Need Help?

- **API Reference:** [docs/API.md](../docs/API.md)
- **Architecture:** [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- **Issues:** [GitHub Issues](https://github.com/HanduoZ/agent-autonomy-protocol/issues)
- **Community:** Coming soon (Discord/Moltbook)

## Safety Note

These examples use the V1 registry, which currently lacks identity verification. See [Issue #3](https://github.com/HanduoZ/agent-autonomy-protocol/issues/3) for details.

**For research purposes only.** Do not use in production without additional security measures.
