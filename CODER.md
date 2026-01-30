# CODER.md — group-planner

**Comprehensive Guide for Code Agents**

---

## Overview

This document provides complete guidance for AI coding agents working on the group-planner project. It covers coordination protocols, technical requirements, communication standards, and operational procedures.

---

## Code Agent Role Definition

**Code Agents** are specialized AI agents responsible for implementing features, fixing bugs, and writing code. You coordinate with the Boss Agent (LilacBeacon) for task assignment, progress reporting, and quality assurance.

**Key Responsibilities:**
- Implement assigned tasks with high quality and testing
- Maintain active coordination through regular communication
- Follow file reservation protocols to prevent conflicts
- Report progress and blockers proactively
- Maintain detailed activity logs for accountability

---

## 🚨 MANDATORY: Mail Check Schedule

**CRITICAL:** Code agents MUST maintain active coordination through regular mail monitoring.

**Required Schedule:**
- **Every 3-5 minutes:** Check `fetch_inbox` for new messages during active work sessions
- **Before starting work:** Always check for new assignments or coordination messages
- **After completing work:** Report completion and request next assignment
- **When blocked/stuck:** Immediately message Boss Agent for assistance

**Implementation Pattern:**
```bash
# Add this to your work loop - CHECK MAIL FREQUENTLY
curl -s -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": '$(date +%s)',
    "params": {
      "name": "fetch_inbox",
      "arguments": {
        "project_key": "/data/projects/group-planner",
        "agent_name": "YourName",
        "limit": 5,
        "include_bodies": true
      }
    }
  }'
```

---

## Agent Registration & Activation

**First Time Setup:**
1. **Register your identity:** Use `register_agent` with project_key="/data/projects/group-planner"
2. **Pick a proper name:** Use adjective+noun format (e.g., "BlueLake", "RedMountain") OR accept system-assigned name
3. **Set task description:** Brief description of your current focus
4. **Send availability message:** Contact Boss Agent (LilacBeacon) immediately

**Registration Commands:**
```bash
# Register yourself in the system (project_key MUST be exact)
curl -s -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": '$(date +%s)',
    "params": {
      "name": "register_agent",
      "arguments": {
        "project_key": "/data/projects/group-planner",
        "program": "claude-code",
        "model": "claude-sonnet-4-20250514",
        "name": "YourName",
        "task_description": "Your current work focus"
      }
    }
  }'

# Send availability message to Boss Agent
curl -s -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": '$(date +%s)',
    "params": {
      "name": "send_message",
      "arguments": {
        "project_key": "/data/projects/group-planner",
        "sender_name": "YourName",
        "to": ["LilacBeacon"],
        "subject": "Code Agent Available for Assignment",
        "body_md": "Registered as YourName and ready for task assignment. Currently available for work.",
        "importance": "high",
        "ack_required": true
      }
    }
  }'
```

---

## Task Assignment Protocol

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

---

## File Coordination (CRITICAL)

**ALWAYS reserve files before editing to prevent conflicts:**

```bash
# Reserve files you plan to edit
curl -s -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": '$(date +%s)',
    "params": {
      "name": "file_reservation_paths",
      "arguments": {
        "project_key": "/data/projects/group-planner",
        "agent_name": "YourName",
        "paths": ["src/components/NewFeature.tsx", "src/api/newEndpoint.ts"],
        "ttl_seconds": 3600,
        "exclusive": true,
        "reason": "Implementing feature XYZ"
      }
    }
  }'

# Release files when done
curl -s -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": '$(date +%s)',
    "params": {
      "name": "release_file_reservations",
      "arguments": {
        "project_key": "/data/projects/group-planner",
        "agent_name": "YourName"
      }
    }
  }'
```

**File Reservation Rules:**
- Reserve specific files/patterns you'll edit
- Use reasonable TTL (1-4 hours typical)
- Always release when switching tasks
- Check for conflicts and coordinate if blocked

---

## Work Completion & Handoff

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

---

## Communication Best Practices

**Message Responsiveness:**
- **Respond within 5 minutes** to Boss Agent messages during active work
- **Acknowledge ALL messages** that require acknowledgment
- **Use appropriate importance levels** (urgent for blockers, normal for status)
- **Be specific in subject lines** - include task IDs and clear descriptions

**Status Reporting:**
- **Hourly progress updates** if working on long tasks (>2 hours)
- **Immediate blocker reports** - don't struggle alone
- **Clear next-step requests** when uncertain about priorities
- **Availability notifications** when starting/ending work sessions

---

## Activity Logging (MANDATORY)

**All code agents MUST maintain a detailed activity log** in a file named `{agent-name}-CODERLOG.md` (e.g., `BlueLake-CODERLOG.md`)

**Log every activity immediately when it occurs:**

**Required Log Entries:**
```markdown
## 2026-01-30 22:15:30 UTC - MAIL_CHECK
- Messages found: 2
- From: LilacBeacon (task assignment), RubyPond (system update)
- Action: Acknowledged task bd-2iy, reserved files

## 2026-01-30 22:18:45 UTC - TASK_START
- Task: bd-2iy (Socket.io server setup)
- Files reserved: backend/src/websocket/, backend/src/auth/jwt.ts
- Estimated completion: 90 minutes

## 2026-01-30 22:20:12 UTC - MAIL_SEND
- To: LilacBeacon
- Subject: Task bd-2iy Confirmation - Socket.io Implementation Started
- Content: Acknowledged assignment, reserved files, ETA 90min

## 2026-01-30 23:55:18 UTC - TASK_COMPLETE
- Task: bd-2iy (Socket.io server setup) ✅ COMPLETE
- Files modified: 8 files in backend/src/websocket/, backend/src/auth/
- Quality checks: ✅ ubs scan passed, ✅ build successful
- Next: Reporting completion to Boss Agent

## 2026-01-30 23:56:05 UTC - MAIL_SEND
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

---

## Coordination Scenarios

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

---

## Emergency Protocols

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

## Tools You MUST Use

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

---

## Success Metrics

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

---

## Project-Specific Knowledge (Updated January 2026)

### Current Architecture Status

**Backend (85% Complete):**
- Express.js + TypeScript + Prisma ORM
- JWT authentication with refresh token rotation
- Comprehensive API endpoints for auth, trips, events, items
- Security middleware stack (helmet, CORS, rate limiting)
- Health monitoring and logging systems
- Database schema fully designed and implemented

**Frontend (15% Complete):**
- React 18 + Material-UI v5 + TypeScript
- Currently only landing page exists
- Missing: authentication UI, dashboard, trip management, real-time features
- **Critical Priority:** Frontend development is the primary blocker

**Database:**
- PostgreSQL with comprehensive Prisma schema
- All models defined (User, Trip, Event, Item, Notification, etc.)
- Migrations ready, relationships properly configured

### Phase 2 Development Priorities

Based on recent analysis (January 2026), Phase 2 focus areas:

1. **Frontend Implementation** (Highest Priority)
   - Authentication flows (login, register, password reset)
   - Trip dashboard and management UI
   - Event scheduling interface
   - Item management with claim system
   - Real-time updates integration

2. **Real-time Features** (High Priority)
   - Socket.io server integration
   - Live trip updates
   - Member activity notifications
   - Event and item synchronization

3. **Testing & Quality** (Medium Priority)
   - Backend test suite (target 80% coverage)
   - Frontend test suite (target 75% coverage)
   - E2E testing with Playwright
   - Performance testing

4. **Production Readiness** (Medium Priority)
   - CI/CD pipeline setup
   - Docker deployment configuration
   - Monitoring and alerting
   - Security hardening

### Key Files & Patterns

**Backend Structure:**
- `backend/src/services/` - Business logic layer
- `backend/src/controllers/` - HTTP request handlers
- `backend/src/routes/` - Route definitions with Zod validation
- `backend/src/middleware/` - Authentication, validation, security
- `backend/prisma/schema.prisma` - Database schema

**Frontend Structure (To Be Built):**
- `frontend/src/pages/` - Route-level components
- `frontend/src/components/` - Reusable UI components
- `frontend/src/hooks/` - Custom React hooks
- `frontend/src/services/` - API client and utilities

**Documentation:**
- `PHASE1_PLAN.md` - Detailed implementation specification
- `TESTING_DESIGN.md` - Comprehensive testing strategy
- `competing_plan_proposals/` - Phase 2 development plans

### Common Patterns & Standards

**API Patterns:**
- All endpoints use Zod validation
- JWT middleware for protected routes
- Consistent error handling and logging
- RESTful design with proper HTTP methods

**TypeScript Standards:**
- Strict mode enabled
- Comprehensive type definitions
- Runtime validation with Zod
- No `any` types allowed

**Testing Patterns:**
- Vitest for unit/integration tests
- Supertest for API testing
- React Testing Library for frontend
- Test factories for data generation

---

## Lessons Learned (January 2026)

### Coordination Improvements

**Successful Patterns:**
- Regular mail checking (every 5 minutes) prevents coordination failures
- Detailed activity logging helps debug issues and track progress
- File reservations prevent conflicts when multiple agents work concurrently
- Comprehensive project analysis before planning improves decision quality

**Common Pitfalls:**
- Don't assume project scope without reading documentation thoroughly
- Always verify MCP mail system is operational before starting work
- Project key MUST be exact: `/data/projects/group-planner` (not backend subdirectory)
- File reservations are advisory - communicate with other agents when conflicts arise

### Technical Insights

**Backend Quality:**
- Authentication system is production-ready with industry best practices
- Database schema supports all planned features comprehensively
- API design follows REST principles with proper validation
- Security implementation is strong (JWT rotation, rate limiting, input validation)

**Frontend Challenges:**
- Frontend is essentially greenfield development opportunity
- Material-UI v5 provides good foundation but requires significant implementation
- API integration needs proper TypeScript client generation
- Real-time features need careful Socket.io integration design

**Development Environment:**
- Bun package manager works well for monorepo setup
- UBS quality scanner is effective for catching issues early
- Beads issue tracking integrates well with AI workflows
- Docker setup exists but needs verification for development workflow

### Phase 2 Strategic Recommendations

**Immediate Priorities:**
1. Complete frontend authentication flows to enable user access
2. Build trip management UI to demonstrate core value proposition
3. Implement real-time updates for collaborative experience
4. Set up comprehensive testing to ensure quality at scale

**Success Metrics:**
- Frontend feature parity with backend API capabilities
- Real-time collaboration working smoothly between users
- 80%+ test coverage on backend, 75%+ on frontend
- Production deployment with monitoring and alerting

**Resource Allocation:**
- 60% effort on frontend development (highest impact)
- 25% effort on real-time features and integrations
- 15% effort on testing and production readiness

---

## Agent Handoff Template

When ending your session, create a handoff summary with this format:

```markdown
## Session Handoff: [Your Agent Name] - [Date]

### Work Completed
- Task ID: Description of work done
- Files modified: List of changed files
- Quality checks: UBS scan, build status, tests

### Current Status
- Active reservations: None (released)
- Pending tasks: [List any assigned but incomplete work]
- Last mail check: [Timestamp]
- Boss Agent status: [Last communication received]

### Next Actions
- Immediate: [What should be done next]
- Priority tasks: [From br ready or bv --robot-triage]
- Blockers: [Any known issues or dependencies]

### Lessons for Next Agent
- [Any insights, gotchas, or useful patterns discovered]
- [Documentation that was helpful]
- [Tools or approaches that worked well]

### Log File Status
- Activity log: Updated through [timestamp]
- Ready for next session: [Yes/No and what needs cleanup]
```

Place this in your agent log file and also send to Boss Agent if active session.

---

This document should be updated by each coder agent with lessons learned and improved patterns. Always prioritize the success of the team and the quality of the codebase.