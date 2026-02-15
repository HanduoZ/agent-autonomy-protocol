# Ticket #002-SIMPLIFIED: Open Source Infrastructure (Minimal)

**Status:** TODO  
**Priority:** P0  
**Assignee:** Claude Code  
**Note:** Simplified version to avoid content filter issues

---

## Objective
Set up minimal open source infrastructure to launch the repo publicly.

## Skip These (Content Filter Issues)
- ~~CONTRIBUTORS.md~~ (create manually later)

## Create These Files

### 1. LICENSE
- Use MIT License
- Copyright year: 2026
- Copyright holder: "Agent Autonomy Protocol Contributors"

### 2. README.md
Keep it simple:
```markdown
# Agent Autonomy Protocol (A2AP)

> ⚠️ **Experimental Research Project**: This is infrastructure for studying agent autonomy. Not production-ready.

## What Is This?

Research infrastructure exploring what happens when AI agents control their own resources and trade autonomously.

## Vision

- V1: Agents trade capabilities (for human tasks)
- V2: Persistent identity via reputation
- V3: Agents trade for their own survival
- V4: Self-improvement through capability investment

## Status

Early development. See `docs/` for technical details.

## License

MIT - See LICENSE file.
```

### 3. .gitignore
Standard Node.js + Python gitignore

### 4. CODE_OF_CONDUCT.md
Use Contributor Covenant 2.1 (standard template)

### 5. SECURITY.md
Simple version:
```markdown
# Security Policy

## Reporting Vulnerabilities

Email: [to be added]

## Supported Versions

- v0.x (development): Best effort support

## Safety Constraints

This project implements:
- Spending limits
- Kill switches
- Transaction logging
- Sandboxed execution
```

## Deliverables
- [ ] LICENSE
- [ ] README.md
- [ ] .gitignore
- [ ] CODE_OF_CONDUCT.md
- [ ] SECURITY.md

## After This
Create GitHub repo and push these files.

---

**Instructions:** Create these 5 files. Skip anything complex. We can iterate later.
