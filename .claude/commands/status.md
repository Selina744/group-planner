# Project Status Report

Generate a comprehensive status report on the current state of the project.

## Data Gathering

Collect information from the following sources:

### 1. Task Pipeline
```bash
bv --robot-triage
```
Summarize: Total tasks, blocked tasks, ready tasks, in-progress tasks, critical path items.

### 2. Recent Activity
```bash
br list --json | head -20
```
Note any recently completed or updated tasks.

### 3. Agent Status
Use `mcp__mcp-agent-mail__fetch_inbox` to check for recent agent communications.
Use `whois` on known agents to check last activity times.

### 4. System Health
- Check `docs/completion/CURRENT_SYSTEM_ISSUES.md` for any active blockers
- Note any infrastructure issues affecting development

### 5. Git Status
```bash
git log --oneline -10
git status
```
Summarize recent commits and any uncommitted work.

## Report Format

Present the status report in this structure:

```
## Project Status Report — [Date]

### Summary
[2-3 sentence overview of project health and momentum]

### Task Pipeline
- **Ready for work:** X tasks
- **In progress:** X tasks
- **Blocked:** X tasks
- **Critical path:** [List top 3 priority items]

### Agent Status
| Agent | Role | Status | Last Active |
|-------|------|--------|-------------|
| ... | ... | ... | ... |

### Recent Progress
- [List 3-5 recent completions or significant commits]

### Active Blockers
- [List any blockers, or "None" if clear]

### Recommended Next Actions
1. [Top priority action]
2. [Second priority]
3. [Third priority]
```

## After Generating Report

Ask the user:

**"Is there any specific area you'd like me to dive deeper into, or shall I proceed with the recommended actions?"**
