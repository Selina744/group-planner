# AGENTS.md — group-planner
---
This document is applicable for all agents except for Gemini. If you are Gemini, stop reading this immediately unless you were very explicitly asked to. If you are unsure if it was explicit, ask for clarification.

## RULE 1 – ABSOLUTE (DO NOT EVER VIOLATE THIS)

You may NOT delete any file or directory unless I explicitly give the exact command **in this session**.

- This includes files you just created (tests, tmp files, scripts, etc.).
- You do not get to decide that something is "safe" to remove.
- If you think something should be removed, stop and ask. You must receive clear written approval **before** any deletion command is even proposed.

Treat "never delete files without permission" as a hard invariant.

---

## IRREVERSIBLE GIT & FILESYSTEM ACTIONS

Absolutely forbidden unless I give the **exact command and explicit approval** in the same message:

- `git reset --hard`
- `git clean -fd`
- `rm -rf`
- Any command that can delete or overwrite code/data

Rules:

1. If you are not 100% sure what a command will delete, do not propose or run it. Ask first.
2. Prefer safe tools: `git status`, `git diff`, `git stash`, copying to backups, etc.
3. After approval, restate the command verbatim, list what it will affect, and wait for confirmation.
4. When a destructive command is run, record in your response:
   - The exact user text authorizing it
   - The command run
   - When you ran it

If that audit trail is missing, then you must act as if the operation never happened.

---

## Node / JS Toolchain

- Use **bun** for everything JS/TS.
- ❌ Never use `npm`, `yarn`, or `pnpm`.
- Lockfiles: only `bun.lock`. Do not introduce any other lockfile.
- Target **latest Node.js**. No need to support old Node versions.
- **Note:** `bun install -g <pkg>` is valid syntax (alias for `bun add -g`). Do not "fix" it.

---

## Project Architecture

A) server app
B) client android app
C) client web app
D) CLI to manage server

### Components

<!-- CUSTOMIZE: List your project's main components/domains -->

Example structure:
- **A) Backend API** — Framework, database, main responsibilities
- **B) Frontend** — Framework, UI library, key patterns
- **C) Shared** — Common utilities, types, constants

---

## Repo Layout

```
group-planner/
├── README.md
├── AGENTS.md
├── .beads/                        # Issue tracking (bd)
├── .claude/                       # Claude Code settings
│
└── src/                           # Your source code
```

---

## Generated Files — NEVER Edit Manually

**Current state:** There are no generated files in this repo.

If/when you add generated artifacts:
- **Rule:** Never hand-edit generated outputs.
- **Convention:** Put generated outputs in a clearly labeled directory and document the generator command.

---

## Code Editing Discipline

- Do **not** run scripts that bulk-modify code (codemods, invented one-off scripts, giant `sed`/regex refactors).
- Large mechanical changes: break into smaller, explicit edits and review diffs.
- Subtle/complex changes: edit by hand, file-by-file, with careful reasoning.

---

## Backwards Compatibility & File Sprawl

We optimize for a clean architecture now, not backwards compatibility.

- No "compat shims" or "v2" file clones.
- When changing behavior, migrate callers and remove old code.
- New files are only for genuinely new domains that don't fit existing modules.
- The bar for adding files is very high.

---

## Console Output

- Prefer **structured, minimal logs** (avoid spammy debug output).
- Treat user-facing UX as UI-first; logs are for operators/debugging.

---

## MCP Agent Mail — Multi-Agent Coordination

Agent Mail is available as an MCP server for coordinating work across agents.

What Agent Mail gives:
- Identities, inbox/outbox, searchable threads.
- Advisory file reservations (leases) to avoid agents clobbering each other.
- Persistent artifacts in git (human-auditable).

Core patterns:

1. **Same repo**
   - Register identity:
     - `ensure_project` then `register_agent` with the repo's absolute path as `project_key`.
   - Reserve files before editing:
     - `file_reservation_paths(project_key, agent_name, ["src/**"], ttl_seconds=3600, exclusive=true)`.
   - Communicate:
     - `send_message(..., thread_id="FEAT-123")`.
     - `fetch_inbox`, then `acknowledge_message`.
   - Fast reads:
     - `resource://inbox/{Agent}?project=<abs-path>&limit=20`.
     - `resource://thread/{id}?project=<abs-path>&include_bodies=true`.

2. **Macros vs granular:**
   - Prefer macros when speed is more important than fine-grained control:
     - `macro_start_session`, `macro_prepare_thread`, `macro_file_reservation_cycle`, `macro_contact_handshake`.
   - Use granular tools when you need explicit behavior.

Common pitfalls:
- "from_agent not registered" → call `register_agent` with correct `project_key`.
- `FILE_RESERVATION_CONFLICT` → adjust patterns, wait for expiry, or use non-exclusive reservation.

---

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   br sync --flush-only
   git add .beads/
   git commit -m "Update beads"
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

---

## Issue Tracking with br (Beads)

All issue tracking goes through **Beads**. No other TODO systems.

**Note:** `br` is a convenience alias (installed by `acfs/zsh/acfs.zshrc`) for the real Beads CLI: `bd`.
If `br` is unavailable (CI / non-interactive shells), use `bd` directly.

Key invariants:

- `.beads/` is authoritative state and **must always be committed** with code changes.
- Do not edit `.beads/*.jsonl` directly; only via `br` / `bd`.

### Basics

Check ready work:

```bash
br ready --json
```

Create issues:

```bash
br create "Issue title" -t bug|feature|task -p 0-4 --json
br create "Issue title" -p 1 --deps discovered-from:br-123 --json
```

Update:

```bash
br update br-42 --status in_progress --json
br update br-42 --priority 1 --json
```

Complete:

```bash
br close br-42 --reason "Completed" --json
```

Types: `bug`, `feature`, `task`, `epic`, `chore`

Priorities: `0` critical, `1` high, `2` medium (default), `3` low, `4` backlog

Agent workflow:

1. `br ready` to find unblocked work.
2. Claim: `br update <id> --status in_progress`.
3. Implement + test.
4. If you discover new work, create a new bead with `discovered-from:<parent-id>`.
5. Close when done.
6. Commit `.beads/` in the same commit as code changes.

Never:
- Use markdown TODO lists.
- Use other trackers.
- Duplicate tracking.

---

## Using bv as an AI sidecar

bv is a graph-aware triage engine for Beads projects. Use robot flags for deterministic outputs.

**⚠️ CRITICAL: Use ONLY `--robot-*` flags. Bare `bv` launches an interactive TUI that blocks your session.**

```bash
bv --robot-triage        # THE MEGA-COMMAND: start here
bv --robot-next          # Just the single top pick + claim command
bv --robot-plan          # Parallel execution tracks
bv --robot-insights      # Full graph metrics
```

Use bv instead of parsing beads.jsonl—it computes PageRank, critical paths, cycles, and parallel tracks deterministically.

---

## cass — Cross-Agent Search

`cass` indexes prior agent conversations so we can reuse solved problems.

**Rules:** Never run bare `cass` (TUI). Always use `--robot` or `--json`.

```bash
cass health
cass search "authentication error" --robot --limit 5
cass view /path/to/session.jsonl -n 42 --json
```

Treat cass as a way to avoid re-solving problems other agents already handled.

---

## Memory System: cass-memory

Before starting complex tasks, retrieve relevant context:

```bash
cm context "<task description>" --json
```

This returns:
- **relevantBullets**: Rules that may help with your task
- **antiPatterns**: Pitfalls to avoid
- **historySnippets**: Past sessions that solved similar problems

Protocol:
1. **START**: Run `cm context "<task>" --json` before non-trivial work
2. **WORK**: Reference rule IDs when following them
3. **END**: Just finish your work. Learning happens automatically.

---

## UBS Quick Reference

**Golden Rule:** `ubs <changed-files>` before every commit. Exit 0 = safe. Exit >0 = fix & re-run.

```bash
ubs file.ts file2.py                    # Specific files (< 1s) — USE THIS
ubs $(git diff --name-only --cached)    # Staged files — before commit
ubs .                                   # Whole project
```

**Speed Critical:** Scope to changed files. `ubs src/file.ts` (< 1s) vs `ubs .` (30s).

**Bug Severity:**
- **Critical** (always fix): Null safety, XSS/injection, async/await, memory leaks
- **Important** (production): Type narrowing, division-by-zero, resource leaks
- **Contextual** (judgment): TODO/FIXME, console logs

---

## Multi-Agent Development Environment

**For Boss Agent coordination, see BOSS.md**

---

## Code Agents

**For complete Code Agent guidance, see [CODER.md](./CODER.md)**

Code Agents are specialized AI agents responsible for implementing features, fixing bugs, and writing code. They coordinate with the Boss Agent (LilacBeacon) for task assignment, progress reporting, and quality assurance.

**Key Requirements:**
- Check mail every 3-5 minutes during active work
- Reserve files before editing to prevent conflicts
- Maintain detailed activity logs
- Report completion and request next assignments
- Follow all coordination protocols detailed in CODER.md

---

## System Reliability & Operations

### Development Environment Tools Status

**Core Tools Verified Operational:**
- **Package Management:** bun v1.3.7 for JS/TS development
- **Issue Tracking:** Beads (br/bd) with intelligent AI triage via bv
- **Code Quality:** UBS scanner for security/quality checks
- **Search System:** cass for cross-agent knowledge sharing
- **Coordination:** MCP Agent Mail for multi-agent workflows

**Database Setup Notes:**
- Local Postgres service required for `bun run seed` execution
- Consider lightweight local Postgres or mock for seed/migration verification
- Connection failures block database verification workflows

### Agent Health Monitoring (Lessons Learned)

**Critical Issues Identified:**
1. **Registration vs. Availability Mismatch** - Agents show "registered" but are completely unresponsive
2. **Communication Reliability** - No delivery confirmation or read receipts in MCP system
3. **Coordination Bottlenecks** - Boss Agent effectiveness limited by dormant agent responsiveness

**Recommended Monitoring Infrastructure:**
- **Automated dormancy detection** when agents haven't checked mail in >4 hours
- **Health ping system** for registered agents with automatic status updates
- **Agent response reliability tracking** over time for performance metrics
- **Automatic deactivation** protocols for consistently unresponsive agents

### Task Assignment Resilience Strategies

**Primary Strategy:** Don't rely solely on dormant agents
- **Task tool subagent spawning** for reliable, immediate work completion
- **Backup agent creation capabilities** when coordination fails
- **Parallel execution** via specialized subagents and responsive agents

**Communication Protocols:**
- **Escalation procedures** when agents don't respond (15min → 30min → system admin)
- **Alternative coordination** via CURRENT_SYSTEM_ISSUES.md for system outages
- **Emergency work continuation** protocols during MCP mail outages

### MCP Agent Mail Technical Implementation (Critical Setup Knowledge)

**🚨 CRITICAL: MCP API Configuration**

The MCP Agent Mail system requires precise JSON-RPC 2.0 API calls to function correctly:

**Service Endpoint:**
```
http://127.0.0.1:8765/mcp
```

**Required Headers:**
```
Content-Type: application/json
```

**Protocol Initialization (MANDATORY FIRST STEP):**
```bash
curl -s -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "id": 1,
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "boss-agent",
        "version": "1.0.0"
      }
    }
  }'
```

**Session Setup Pattern:**
```bash
# Always use macro_start_session for new agent sessions
curl -s -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": 4,
    "params": {
      "name": "macro_start_session",
      "arguments": {
        "human_key": "/data/projects/group-planner/backend",
        "program": "claude-code",
        "model": "claude-sonnet-4-20250514",
        "task_description": "Boss Agent - Project coordination",
        "inbox_limit": 50
      }
    }
  }'
```

**Inbox Monitoring Pattern:**
```bash
curl -s -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": $(date +%s),
    "params": {
      "name": "fetch_inbox",
      "arguments": {
        "project_key": "/data/projects/group-planner/backend",
        "agent_name": "AgentName",
        "limit": 20,
        "include_bodies": true
      }
    }
  }'
```

**⚠️ CRITICAL: Boss Agent Monitoring System Failures**

**Common Failure Pattern - DO NOT REPEAT:**
```bash
# ❌ WRONG - Web scraping approach (causes resource exhaustion)
curl -s http://127.0.0.1:8765/mail | grep "messages"  # Downloads massive HTML
```

**✅ CORRECT - Proper API approach:**
```bash
# Lightweight JSON-RPC calls only
curl -s -X POST http://127.0.0.1:8765/mcp -H "Content-Type: application/json" -d '...'
```

**Monitoring Script Requirements:**
- **Use JSON-RPC API only** - never scrape HTML interfaces
- **2-minute intervals maximum** - more frequent causes resource issues
- **Proper error handling** - check for JSON responses, not HTML
- **Resource cleanup** - kill failed monitoring processes immediately

**Agent Naming System:**
- **Auto-generated names:** System assigns adjective+noun combinations (e.g., "PinkGrove")
- **DO NOT specify names** in registration unless required
- **Use returned name** for all subsequent API calls

**⚠️ CRITICAL: Agent Identity Management**

**Agent Session vs. Registration Confusion Prevention:**
1. **Your active agent name** (e.g., "PinkGrove") may differ from old registrations
2. **Always register with your current agent identity** - don't reuse old names
3. **Boss Agent coordinates by current name** - not historical registrations
4. **First action in ANY session:** Register immediately with current identity

**Registration Protocol for All Agents:**
```bash
# MANDATORY FIRST STEP - Use YOUR current agent name
mcp__mcp-agent-mail__register_agent project_key="/data/projects/group-planner" program="claude-code" model="your-model" name="YourCurrentName" task_description="Your current work focus"

# Then immediately contact Boss Agent
mcp__mcp-agent-mail__send_message project_key="/data/projects/group-planner" sender_name="YourCurrentName" to=["LilacBeacon"] subject="Agent Registration - Ready for Coordination" body_md="Registered as YourCurrentName. Ready for task assignment and coordination protocols." importance="high" ack_required=true
```

**Boss Agent Identity Tracking:**
- **If your name changed from previous sessions:** Inform Boss Agent immediately
- **If you're replacing another agent:** Mention the previous agent name for context
- **Include session change information** in your first contact message

### System Architecture Recommendations for Future

**Immediate Infrastructure Needs:**
1. **MCP Agent Mail Reliability**
   - JSON-RPC health monitoring scripts (not web scraping)
   - Proper API error handling and retry logic
   - Resource usage monitoring to prevent script failures

2. **Monitoring Dashboard**
   - Real-time MCP API status (not web interface)
   - JSON-RPC response time and error rate tracking
   - Agent registration and activity metrics

3. **Agent Lifecycle Management**
   - Auto-naming acceptance and tracking
   - API-based dormancy detection via fetch_inbox timestamps
   - Session cleanup via proper tool calls

4. **Quality Pipeline Automation**
   - MCP-integrated code review triggers
   - Standardized JSON-RPC communication patterns
   - Tool-based subagent spawning workflows

**Technical Lessons Learned:**
- Exit code 137 (SIGKILL) indicates resource exhaustion from improper API usage
- HTML scraping causes 74KB+ downloads vs. <1KB JSON-RPC responses
- Always verify JSON-RPC 2.0 format compliance before deployment
- MCP server version v2.13.0.2 confirmed operational and stable

---
