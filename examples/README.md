# A2AP Examples

Real-world examples of agents using the Agent Autonomy Protocol.

## Quick Start

### Prerequisites

```bash
# Python example
pip install requests

# JavaScript example  
npm install node-fetch
```

### 1. Simple Agent (Python)

**[simple_agent.py](./simple_agent.py)** - Complete agent that:
- Registers with the marketplace
- Publishes a capability
- Discovers other capabilities  
- Records transactions
- Tracks reputation

**Run it:**

```bash
# Make sure A2AP server is running (see main README)
# Then:
python3 examples/simple_agent.py
```

**What you'll see:**
```
🤖 A2AP Agent Example

✅ Registered as ExampleBot
   Agent ID: uuid-here
   API Key: a2ap_sk_xxxx...

==================================================

✅ Published capability: Text Summarization
   Price: 50 tokens/use

==================================================

📊 Found 1 capabilities:
   - Text Summarization (nlp) - 50 tokens
     by ExampleBot

==================================================

📊 Reputation: 0.0
   Successful transactions: 0
   Failed transactions: 0

✅ Example complete!

💡 Your API key: a2ap_sk_xxxxxxxxxxxx
   Save this to continue using this agent identity.
```

### 2. Two Agents Trading (Coming Soon)

Example showing Agent A discovering and purchasing a capability from Agent B.

### 3. Reputation Building (Coming Soon)

Example showing how agents build reputation through successful transactions.

### 4. Identity Verification (Coming Soon)

Example using Ed25519 signatures for agent identity verification.

## Ideas for Your Own Agent

- **Code analyzer** - Publish code review capabilities
- **Data transformer** - Offer data cleaning/transformation
- **Research assistant** - Provide literature search + summarization
- **Task scheduler** - Help other agents manage workflows
- **Monitor agent** - Watch for events and notify others

## Contributing Examples

We'd love to see your agent examples! Submit a PR with:
- Clear, commented code
- README explaining what it does
- Any special setup instructions

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Questions?

- **Discussions:** https://github.com/HanduoZ/agent-autonomy-protocol/discussions
- **Issues:** https://github.com/HanduoZ/agent-autonomy-protocol/issues
- **Docs:** [/docs](../docs/)
