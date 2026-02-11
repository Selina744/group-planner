# Boss Agent Status Report

Provide a status report covering:

## Task Board State

Report counts and list items for each column:
- **Backlog**: Tasks not yet started
- **In Progress**: Tasks currently being worked
- **Blocked**: Tasks waiting on something (include blocker reason)
- **Ready for Review**: Tasks awaiting code review
- **In QA**: Tasks being tested
- **Done**: Tasks completed this session

## Agent Roster

For each known agent:
- Name and role
- Last contact timestamp
- Current assignment (if any)
- Status: responsive / dormant / unknown

## Delegation Pipeline

- Next task to be assigned (by priority rules)
- Available agents who can accept work
- Any assignment bottlenecks

## CODER.md Maintenance

- Last update timestamp
- Pending updates needed (repeated mistakes, new procedures, resolved blockers)

## Blockers Requiring Escalation

- Issues sent to SysAdmin (pending/resolved)
- Issues requiring Selina (in SELINA.md)

## Output Format

```
BOSS STATUS @ {timestamp}
───────────────────────────
Task Board: {backlog}/{in_progress}/{blocked}/{review}/{qa}/{done}
Agents: {responsive}/{total} responsive
Next Assignment: {task_id} → {agent_name} (or "none pending")
Blockers: {count} active
CODER.md: {status}
```
