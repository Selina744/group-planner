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
*Last Updated: 2026-01-29 14:40 UTC*

**MCP Agent Mail:** ❌ DOWN - Connection timeouts to http://127.0.0.1:8765/mcp/
**Active Agents:** Unknown (pending discovery when MCP comes online)
**Task Queue:** 45 ready issues, 2 in progress (per latest br status)
**Next Action:** Monitor MCP status every 2 minutes, begin agent discovery when available
