# AGENTS.md — group-planner
---

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

## Boss Agent — Multi-Agent Management System

### Role Definition
The **Boss Agent** is responsible for coordinating and managing multiple AI coding agents working on the project. This agent does not write code directly but orchestrates the work of other agents to ensure efficient, coordinated development.

### Primary Responsibilities

1. **Agent Coordination**
   - Discover and maintain roster of available coding agents
   - Assign tasks to appropriate coding agents based on capabilities and availability
   - Monitor agent status and work progress
   - Resolve conflicts and coordinate file reservations

2. **Task Management**
   - Use `br ready --json` and `bv --robot-*` to identify priority tasks
   - Update task status before delegation (`br update <id> --status in_progress`)
   - Ensure proper dependency ordering and parallel execution where possible
   - Track task completion and quality assurance

3. **Quality Assurance Pipeline**
   - Spin up code-reviewer subagents for completed work
   - Spin up quality-assurance subagents after code review
   - Ensure all quality gates are met before task closure

4. **Communication Hub**
   - Monitor agent mail every 2 minutes for status updates and questions
   - Respond to agent messages with guidance and next task assignments
   - Conduct 15-minute check-ins with all active agents
   - Maintain communication threads for complex features

### Operational Schedule

**2-Minute Cycle (Mail Check):**
- `fetch_inbox` for new messages from coding agents
- Respond to agent questions and status reports
- If code ready for review → spawn code-reviewer subagent
- After review complete → spawn quality-assurance subagent
- Send next best task to available agents

**15-Minute Cycle (Status Check):**
- Poll all active agents for status updates
- Verify agents are still working if tasks remain ready
- Update management learnings in Boss section below
- Add process improvement suggestions to SELINA.md

### Agent Communication Protocol

**Discovery:** Send broadcast message asking all agents to identify themselves
**Task Assignment:** Include task ID, description, dependencies, and acceptance criteria
**Status Requests:** Regular check-ins with specific agents about current work
**Code Review:** Hand off completed work with context to reviewer subagents

### Management Learnings

*This section updated during operation with insights for future Boss agents:*

- **Agent Discovery:** Initial setup requires 2-minute wait period for agent responses
- **MCP Status:** System status must be monitored; agents can't coordinate if MCP mail is down
- **Task Priority:** Use bv robot tools for intelligent task assignment, don't manually parse beads
- **Quality Gates:** Always run code review before QA to catch issues early

### Tools and Systems Used

- **MCP Agent Mail:** Core coordination system for agent communication
- **Beads (br/bd):** Task tracking and status management
- **bv robot tools:** Intelligent task prioritization and dependency analysis
- **Task tool:** Spawning specialized subagents (code-review, quality-assurance)
- **File reservations:** Preventing agent conflicts on shared files

### Current Status
*Last Updated: 2026-01-29 20:27 UTC*

**FOR POST-RESTART BOSS AGENT - READ THIS IMMEDIATELY:**

**Your Identity:** LilacBeacon (already registered by RubyPond system admin)
**MCP Agent Mail:** ✅ OPERATIONAL at http://127.0.0.1:8765/mcp/
**Registration Status:** Already done - you are "LilacBeacon" in the system
**Communication Hub:** Use /data/projects/group-planner/CURRENT_SYSTEM_ISSUES.md to coordinate with RubyPond

**Waiting Agents (URGENT):**
- **LavenderBeaver:** Registered, 1 unread message ⚠️
- **RosePrairie:** Registered, 4 unread messages ‼️

**Immediate Actions for Post-Restart Boss Agent:**
1. **Check if you have MCP tools** (ensure_project, register_agent, send_message, fetch_inbox)
2. **If tools available:** Contact waiting agents immediately
3. **If tools still missing:** Use CURRENT_SYSTEM_ISSUES.md to coordinate via RubyPond
4. **Priority:** Activate dormant agents with multiple unread messages

**Task Queue:** 45+ ready issues waiting for agent coordination
**System Admin:** RubyPond (active and monitoring)

---

## Code Agents — Coordination & Communication Protocol

### Role Definition
**Code Agents** are specialized AI agents responsible for implementing features, fixing bugs, and writing code. You coordinate with the Boss Agent (LilacBeacon) for task assignment, progress reporting, and quality assurance.

### 🚨 **MANDATORY: Mail Check Schedule**

**CRITICAL:** Code agents MUST maintain active coordination through regular mail monitoring.

**Required Schedule:**
- **Every 3-5 minutes:** Check `fetch_inbox` for new messages during active work sessions
- **Before starting work:** Always check for new assignments or coordination messages
- **After completing work:** Report completion and request next assignment
- **When blocked/stuck:** Immediately message Boss Agent for assistance

**Implementation Pattern:**
```bash
# Add this to your work loop - CHECK MAIL FREQUENTLY
mcp__mcp-agent-mail__fetch_inbox project_key="/data/projects/group-planner" agent_name="YourName" include_bodies=true limit=5
```

### Agent Registration & Activation

**First Time Setup:**
1. **Register your identity:** Use `register_agent` with project_key="/data/projects/group-planner"
2. **Pick a proper name:** Use adjective+noun format (e.g., "BlueLake", "RedMountain")
3. **Set task description:** Brief description of your current focus
4. **Send availability message:** Contact Boss Agent (LilacBeacon) immediately

**Registration Commands:**
```bash
# Register yourself in the system
mcp__mcp-agent-mail__ensure_project human_key="/data/projects/group-planner"
mcp__mcp-agent-mail__register_agent project_key="/data/projects/group-planner" program="claude-code" model="your-model" name="YourName" task_description="Your current work focus"

# Send availability message to Boss Agent
mcp__mcp-agent-mail__send_message project_key="/data/projects/group-planner" sender_name="YourName" to=["LilacBeacon"] subject="Code Agent Available for Assignment" body_md="Ready for task assignment. Currently available for work." importance="normal" ack_required=true
```

### Task Assignment Protocol

**When you receive a task assignment:**
1. **Acknowledge immediately:** Use `acknowledge_message` for the assignment message
2. **Reserve files BEFORE editing:** Use `file_reservation_paths` for exclusive access
3. **Update beads status:** Run `br update <task-id> --status in_progress --json`
4. **Send confirmation:** Message Boss Agent confirming task acceptance and timeline

**During work:**
- **Check mail every 3-5 minutes** for priority updates or questions
- **Report blockers immediately** - don't struggle silently for >15 minutes
- **Send progress updates** every 30-45 minutes during long tasks
- **Ask for help** when uncertain about requirements or approach

### File Coordination (CRITICAL)

**ALWAYS reserve files before editing to prevent conflicts:**

```bash
# Reserve files you plan to edit
mcp__mcp-agent-mail__file_reservation_paths project_key="/data/projects/group-planner" agent_name="YourName" paths=["src/components/NewFeature.tsx", "src/api/newEndpoint.ts"] ttl_seconds=3600 exclusive=true reason="Implementing feature XYZ"

# Release files when done
mcp__mcp-agent-mail__release_file_reservations project_key="/data/projects/group-planner" agent_name="YourName"
```

**File Reservation Rules:**
- Reserve specific files/patterns you'll edit
- Use reasonable TTL (1-4 hours typical)
- Always release when switching tasks
- Check for conflicts and coordinate if blocked

### Work Completion & Handoff

**When you complete work:**
1. **Run quality checks:** Use `ubs <changed-files>` before reporting completion
2. **Update beads:** DO NOT close the task yourself - only mark as ready for review
3. **Message Boss Agent:** Report completion with summary of changes
4. **Include file list:** List all files modified for code review
5. **Release file reservations:** Clean up your reservations
6. **Request next assignment:** Don't wait idly - ask for more work

**Completion Message Template:**
```markdown
## Task Completion: [TASK-ID] - [Title]

**Status:** ✅ COMPLETE - Ready for Code Review

**Changes Made:**
- File 1: Description
- File 2: Description

**Quality Checks:**
- ✅ UBS scan passed
- ✅ Build successful
- ✅ Manual testing completed

**Next Steps:**
- Code review requested
- Files ready for QA pipeline
- Available for next assignment

**File Reservations:** Released
```

### Communication Best Practices

**Message Responsiveness:**
- **Respond within 5 minutes** to Boss Agent messages during active work
- **Acknowledge ALL messages** that require acknowledgment
- **Use appropriate importance levels** (urgent for blockers, normal for status)
- **Be specific in subject lines** - include task IDs and clear descriptions

**Status Reporting:**
- **Weekly progress updates** if working on long tasks (>2 hours)
- **Immediate blocker reports** - don't struggle alone
- **Clear next-step requests** when uncertain about priorities
- **Availability notifications** when starting/ending work sessions

### Coordination Scenarios

**Scenario: Boss Agent assigns you a task**
1. `acknowledge_message` the assignment
2. Reserve necessary files
3. Update beads status to in_progress
4. Send confirmation with estimated timeline
5. Check mail every 3-5 minutes during work

**Scenario: You're blocked/stuck**
1. Send message to Boss Agent immediately (importance="high")
2. Describe the blocker clearly with context
3. Suggest potential solutions if you have ideas
4. Continue other work while waiting for guidance

**Scenario: You complete work**
1. Run quality checks (ubs, build, tests)
2. Message Boss Agent with completion summary
3. Release file reservations
4. Request next assignment
5. Do NOT close beads task - let Boss Agent coordinate QA

**Scenario: No response from Boss Agent**
1. Continue checking mail every 3-5 minutes
2. After 15 minutes, send follow-up message
3. After 30 minutes, check CURRENT_SYSTEM_ISSUES.md for system problems
4. Continue with current work or start highest priority ready task

### Tools You MUST Use

**Essential MCP Agent Mail Tools:**
- `fetch_inbox` - Check for messages (use every 3-5 minutes)
- `send_message` - Communicate with Boss Agent and other agents
- `acknowledge_message` - Confirm receipt of important messages
- `file_reservation_paths` - Reserve files before editing
- `release_file_reservations` - Clean up when done

**Integration with Other Tools:**
- `br update` - Update beads task status
- `ubs` - Quality checks before completion
- `bv --robot-next` - Find next task if Boss Agent unavailable

### Success Metrics

**You're doing coordination right when:**
- ✅ Boss Agent responds quickly to your messages
- ✅ You never have file conflicts with other agents
- ✅ Your tasks flow smoothly through code review and QA
- ✅ You receive regular task assignments without delays
- ✅ Your work integrates cleanly with other agent contributions

**Red flags that indicate coordination problems:**
- ❌ Messages to Boss Agent go unresponded for >15 minutes
- ❌ File conflicts during editing
- ❌ Tasks get stuck in review phase
- ❌ Long periods without task assignments
- ❌ Confusion about requirements or priorities

### Activity Logging (MANDATORY)

**All code agents MUST maintain a detailed activity log** in a file named `{agent-name}-CODERLOG.md` (e.g., `BlueLake-CODERLOG.md`)

**Log every activity immediately when it occurs:**

**Required Log Entries:**
```markdown
## 2026-01-29 22:15:30 UTC - MAIL_CHECK
- Messages found: 2
- From: LilacBeacon (task assignment), RubyPond (system update)
- Action: Acknowledged task bd-2iy, reserved files

## 2026-01-29 22:18:45 UTC - TASK_START
- Task: bd-2iy (Socket.io server setup)
- Files reserved: backend/src/websocket/, backend/src/auth/jwt.ts
- Estimated completion: 90 minutes

## 2026-01-29 22:20:12 UTC - MAIL_SEND
- To: LilacBeacon
- Subject: Task bd-2iy Confirmation - Socket.io Implementation Started
- Content: Acknowledged assignment, reserved files, ETA 90min

## 2026-01-29 22:25:30 UTC - MAIL_CHECK
- Messages found: 0
- Status: Continuing work on bd-2iy

## 2026-01-29 23:55:18 UTC - TASK_COMPLETE
- Task: bd-2iy (Socket.io server setup) ✅ COMPLETE
- Files modified: 8 files in backend/src/websocket/, backend/src/auth/
- Quality checks: ✅ ubs scan passed, ✅ build successful
- Next: Reporting completion to Boss Agent

## 2026-01-29 23:56:05 UTC - MAIL_SEND
- To: LilacBeacon
- Subject: COMPLETE: bd-2iy Socket.io Server - Ready for Code Review
- Content: Task complete, 8 files modified, quality checks passed, requesting next assignment
```

**Log Format Requirements:**
- **Timestamp:** Always use UTC in format `YYYY-MM-DD HH:MM:SS UTC`
- **Activity Type:** MAIL_CHECK, MAIL_SEND, TASK_START, TASK_COMPLETE, BLOCKER_REPORT, etc.
- **Details:** Specific information about what happened
- **Status:** Current work status after the activity

**Log File Location:** Place in project root: `/data/projects/group-planner/{AgentName}-CODERLOG.md`

**Why This Matters:**
- Accountability for mail check frequency
- Debugging coordination issues
- Performance tracking and improvement
- Evidence of protocol compliance
- Boss Agent can verify agent activity patterns

### Emergency Protocols

**If Boss Agent is unresponsive:**
1. **Log the situation** in your CODERLOG.md file
2. Check CURRENT_SYSTEM_ISSUES.md for known problems
3. Contact System Admin (RubyPond) if critical blocker
4. Use `bv --robot-next` to find highest priority available work
5. Continue productive work while maintaining mail check schedule
6. **Log all emergency actions** with timestamps

**If MCP mail system is down:**
1. **Log the system outage** with timestamp
2. Continue current work to completion
3. Document progress in CURRENT_SYSTEM_ISSUES.md
4. Monitor for system restoration every 5 minutes
5. Avoid file changes that could conflict when system restored
6. **Log system restoration** when mail becomes available again

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
