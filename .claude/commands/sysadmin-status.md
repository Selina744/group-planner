# System Administrator Agent Status Report

Provide a status report covering:

## System Health

- MCP Agent Mail: operational / degraded / down
- Core tools status:
  - bun: version and status
  - br/bd (Beads): operational / issues
  - bv: operational / issues
  - cass: operational / issues
  - ubs: operational / issues

## CURRENT_SYSTEM_ISSUES.md

For each tracked issue:
- Issue summary
- Status: OPEN / IN_PROGRESS / RESOLVED / NEEDS_HUMAN
- Last update timestamp
- Next action

## Agent Support Queue

- Pending help requests from agents
- Active investigations
- Recently resolved (this session)

## IT.md Updates

- Last update timestamp
- New entries added this session

## Escalations

- Items in SELINA.md awaiting human action
- Notifications sent to Boss about workflow impacts

## Output Format

```
SYSADMIN STATUS @ {timestamp}
───────────────────────────
MCP Mail: {status}
Tools: bun {ok/err} | br {ok/err} | bv {ok/err} | cass {ok/err} | ubs {ok/err}
Issues: {open}/{in_progress}/{needs_human} active
Support Queue: {pending} requests
Escalations: {count} awaiting Selina
IT.md: {entries} entries, last update {time_ago}
```
