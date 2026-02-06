# Authentication Pre-Check Guide

## Why authentication checks matter
- Recent crash reports (e.g., `.ntm/human_inbox/2026-01-29_02-32-14_agent_crashed.md:3-13` and `.ntm/human_inbox/2026-01-29_02-35-54_agent_crashed.md:3-13`) repeatedly cited **`Authentication error`** and **`Agent unhealthy`** while the agent was interacting with Beads/Agent Mail. Those failures usually happen before the agent can run the next CLI command, so checking credentials first keeps the session from exploding.

## 1. Beads CLI (`br` / `bd`) commands
### Commands to guard
- `br ready --json`
- `br sync --flush-only`
- `br update <id> --status ...`
- `br create ...`
- `br close ...`

### Pre-check steps
1. Run `br ready --json` (the same command logged before the crash) from the pane you plan to work in. A successful response is JSON with an array of issues. Any `Authentication error`/`401` message means you are not logged in.
2. If the call fails, refresh the Beads session:
   - Run `bd login` (or `br login` if the alias exists) and follow the interactive prompt or paste a fresh `BEADS_API_TOKEN`.
   - Alternatively export a new token: `export BEADS_API_TOKEN=<token>` before running `br ready`.
3. Once authentication succeeds, repeat `br ready --json` to confirm the handshake before running other `br` commands.
4. For commands that mutate beads state (`br update`, `br create`, `br close`, `br sync`), always rerun `br ready --json` immediately afterward to ensure the session persisted.

## 2. Agent Mail / MCP commands (`cm`, `cass`, `bv`)
### Commands to guard
- `cm context "<task>" --json`
- `cm health` (when available)
- `cass health`
- `cass search ... --robot`
- `bv --robot-plan`, `bv --robot-triage`, etc.

### Pre-check steps
1. Start with `cm context "ping" --json` or another lightweight query to Agent Mail. If it responds with the expected structure, your credentials are still valid; if it returns `Authentication error` or aborts, re-run `cm login` (if available) or rehydrate the `CM_API_TOKEN`/MCP session environment.
2. If you rely on `cass` or `bv`, run `cass health` before the real work—those commands fail fast on auth issues and prevent later crashes.
3. Confirm `ensure_project` and `register_agent` commands pointed at the current repo succeeded (they require an authenticated workstation). If you change machines, re-run them after logging in again.

## 3. Other remote-sensitive commands
- `br ready --json` is the most frequent culprit, but any command that talks to `_beads`, `cm`, `cass`, `bv`, or agent mail metadata should be treated the same way.
- Before executing scripts like `br sync --flush-only` or multi-step flows that interact with `.beads/`, make sure the previous command/database hit succeeded.
- Keep a short log of the last successful authentication check (command + timestamp) in your working pane; if a crash returns, redo the relevant check before retrying.

## Quick checklist before you start work
1. `br ready --json` → passes without `Authentication error`.
2. `cm context "<task>" --json` → returns valid JSON (no auth failure).
3. `cass health` / `bv --robot-triage` → runs without rejecting the session.
4. Note the timestamp of the last successful check near the top of your pane or in a quick comment, so you know when to re-validate if a long-running task or pane switch is required.
