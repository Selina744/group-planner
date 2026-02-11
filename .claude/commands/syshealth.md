# System Health Report

Generate a comprehensive system health report for the development infrastructure.

## Health Checks

Run the following checks and collect results:

### 1. MCP Agent Mail System
```bash
# Check if MCP server is responding
curl -s -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1, "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "health-check", "version": "1.0.0"}}}'
```
Or use: `mcp__mcp-agent-mail__health_check`

### 2. Development Tools
```bash
# Package manager
bun --version

# Issue tracking
br --version
br ready --json | head -5

# AI triage
bv --robot-insights 2>&1 | head -10

# Bug scanner
ubs --version

# Cross-agent search
cass health
```

### 3. Database Status
```bash
# Check if Postgres is accessible (if applicable)
cd backend && bun run typecheck 2>&1 | tail -5
```

### 4. Git Repository Health
```bash
git status
git remote -v
git log --oneline -3
```

### 5. Active Issues Review
Read `docs/completion/CURRENT_SYSTEM_ISSUES.md` for any documented problems.

### 6. Agent Communication Status
Use `mcp__mcp-agent-mail__fetch_inbox` to check message flow.
List registered agents and their last activity times.

## Report Format

Present the health report in this structure:

```
## System Health Report — [Date]

### Overall Status: [HEALTHY / DEGRADED / CRITICAL]

### Infrastructure Components

| Component | Status | Version/Details |
|-----------|--------|-----------------|
| MCP Agent Mail | ✅/⚠️/❌ | [version or error] |
| Bun | ✅/⚠️/❌ | [version] |
| Beads (br/bd) | ✅/⚠️/❌ | [version] |
| bv (AI Triage) | ✅/⚠️/❌ | [status] |
| UBS | ✅/⚠️/❌ | [version] |
| cass | ✅/⚠️/❌ | [status] |
| PostgreSQL | ✅/⚠️/❌ | [status] |
| Git | ✅/⚠️/❌ | [clean/dirty] |

### Agent Communication
- **Registered agents:** [count]
- **Active (last 30 min):** [count]
- **Dormant:** [list]
- **Message queue health:** [status]

### Active Issues
[List from CURRENT_SYSTEM_ISSUES.md or "None"]

### Recent System Events
[Any tool failures, restarts, or configuration changes]

### Recommendations
1. [Any immediate actions needed]
2. [Preventive measures]
```

## Status Indicators

- ✅ **Healthy** — Operating normally
- ⚠️ **Degraded** — Functional but with issues
- ❌ **Critical** — Not working, requires immediate attention

## After Generating Report

Ask the user:

**"Any system components you'd like me to investigate further, or issues to address?"**
