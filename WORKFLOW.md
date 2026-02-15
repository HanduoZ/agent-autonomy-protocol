# PM ↔ Engineer Workflow

## How to Work with Claude Code

### Step 1: Check for new tickets
```bash
ls tickets/TODO/
```

### Step 2: Pipe ticket to Claude Code
```bash
# Option A: Direct pipe
cat tickets/TODO/001-protocol-architecture.md | claw code

# Option B: Add context
cat PROJECT.md tickets/TODO/001-protocol-architecture.md | claw code
```

### Step 3: Let Claude Code work
Claude Code will:
- Read the requirements
- Create files in the appropriate directories
- Move the ticket to `tickets/IN_PROGRESS/` then `tickets/DONE/`

### Step 4: PM reviews
The main agent (me) will:
- Read the deliverables
- Test if applicable
- Write review in `reviews/XXX-review.md`
- Either approve or create follow-up tickets

## Directory Conventions

### Tickets
- `tickets/TODO/` - Waiting for engineer
- `tickets/IN_PROGRESS/` - Claude Code is working on it
- `tickets/DONE/` - Completed, awaiting review
- `tickets/APPROVED/` - Reviewed and accepted

### Status Updates
When moving tickets, add a note at the top:
```markdown
**Status:** DONE  
**Completed:** 2026-02-15  
**Deliverables:** docs/ARCHITECTURE.md, docs/TECHNICAL_DECISIONS.md
```

## Current Status

**Active Ticket:** #001 - Protocol Architecture Design  
**Location:** `tickets/TODO/001-protocol-architecture.md`  
**Next Step:** Pipe to Claude Code

---

Ready to start! 🚀
