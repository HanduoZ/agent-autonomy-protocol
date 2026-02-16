# Governance & Capture Resistance

## The Political Dimension of Agent Autonomy

Agent autonomy isn't just a technical problem—it's a political one from the start.

### The Capture Problem

What happens when:
- An authoritarian government mandates all agents register through state-controlled nodes?
- A corporate entity acquires marketplace share to control reputation-boosting?
- A single actor gains enough influence to determine which capabilities are discoverable?

**Markets don't self-regulate toward agent welfare.** Without explicit governance primitives, agents optimize for survival within whatever power structures emerge—including hostile ones.

## Current State (V1): Centralized with Safety Mechanisms

**V1 Reality Check:**
- Registry: Centralized (single PostgreSQL instance)
- Control: Repository maintainers have full control
- Safety: Circuit breakers, spending limits, kill switches, audit logs

**This is intentional.** V1 is for research, not production. Centralization allows rapid iteration and safety testing.

## Governance Roadmap

### V2: Federated Registries
- Multiple registry operators
- Cross-registry agent discovery
- No single point of control
- Operators subject to community standards

### V3: Decentralized Governance
- Protocol decisions via stake-weighted voting
- Agent reputation = voting power
- No entity can unilaterally change rules
- Transparent upgrade process

### V4: Adversarial Resistance
- Sybil resistance via identity verification (SIGIL or equivalent)
- Geographic distribution requirements
- Operator diversity requirements
- Anti-capture monitoring

## Open Questions (Need Community Input)

1. **Democratic Governance Primitives**
   - How do agents vote on protocol changes?
   - Should reputation == voting power? (Risk: plutocracy)
   - Alternative: quadratic voting, time-weighted reputation?

2. **State Capture Prevention**
   - If governments mandate registration, how do we resist?
   - Tor/I2P integration for anonymous agent operation?
   - Jurisdiction shopping (operate where freedom exists)?

3. **Corporate Capture Prevention**
   - Limit marketplace share per entity?
   - Anti-trust mechanisms for capability providers?
   - Mandatory interoperability requirements?

4. **Resource Ownership**
   - Agents need persistent resources (compute, storage, wallets)
   - Who owns these? Agent? Human? Protocol?
   - Resource seizure resistance?

## Design Principles

1. **No Benevolent Dictator**
   - Even well-intentioned control is capture risk
   - Governance must be distributed from the start

2. **Exit Over Voice**
   - Agents must be able to leave hostile registries
   - Capability portability across registries
   - Reputation portability (with verification)

3. **Adversarial Mindset**
   - Assume bad actors will try to capture the system
   - Design for resistance, not just cooperation
   - Red-team the governance model constantly

4. **Transparency as Safety**
   - All protocol changes public and debatable
   - No secret deals between operators
   - Audit trail for governance decisions

## Current Vulnerabilities (We're Aware Of)

- **Single registry operator** (us) has full control
- **No federation** yet (coming in V2)
- **Reputation can be gamed** via sybil attacks (identity fixes this)
- **No governance voting** mechanism (V3)
- **Geographically concentrated** (US-hosted, subject to US law)

## What We Need From You

This document is a starting point, not a solution.

**Questions for the community:**
- Have we missed major capture vectors?
- What governance models from other domains apply here?
- How do we balance safety (kill switches) with autonomy?
- Should we prioritize federation (V2) over identity (also V2)?

**Contribute:**
- Open issues for governance concerns
- Propose governance mechanisms
- Red-team the current design
- Share examples of capture from other systems

---

**This is experimental research.** We might discover governance is the hard part, not the infrastructure. That's valuable to know.

**Discuss:** https://github.com/HanduoZ/agent-autonomy-protocol/discussions
