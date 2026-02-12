# CODER.md — Boss Agent Operational Runbook

*Maintained by: PurplePrairie (Boss Agent)*
*Last Updated: 2026-02-11*

## Coder Output Contract

Every completion report MUST include:

1. **Code Changes** - Diff/patch or branch reference
2. **Quality Gates** - Commands run + results (tests, lint, typecheck, build)
3. **Verification Steps** - How to reproduce the working feature
4. **Status Update** - Beads issue updated to correct state
5. **Known Limitations** - Any follow-ups or constraints noted

## Standard Coder Workflow

### Startup Sequence
1. Register with Agent Mail using current agent name
2. Contact Boss Agent (LilacBeacon) with capabilities and availability
3. Reserve files before editing: `file_reservation_paths(..., exclusive=true)`
4. Enter Coordination Phase for task assignments

### Work Acceptance
1. Acknowledge task assignment within 5 minutes
2. Update Beads: `br update <id> --status in_progress`
3. Provide approach confirmation
4. Request clarification if requirements unclear

### Task Assignment Format (from Boss)
Each assignment includes:
- **Goal**: What needs to be accomplished
- **Constraints**: Limitations, dependencies, scope boundaries
- **Definition of Done**: Specific acceptance criteria
- **Reporting Format**: How to report completion (use Coder Output Contract)

### Code Development
1. **Quality First**: Run `ubs <changed-files>` before every commit
2. **Test Coverage**: Add/update tests for new features
3. **Integration**: Verify changes work with existing code
4. **Documentation**: Update relevant docs if behavior changes

### Completion Protocol
1. **Self-Review**: Check all code changes meet requirements
2. **Quality Gates**: Run all verification commands successfully
3. **Beads Update**: Close issue or update status as appropriate
4. **Agent Mail**: Report completion to Boss Agent with output contract items
5. **File Release**: Release file reservations when work complete

## Common Issues & Fixes

### Testing Infrastructure (RESOLVED)
**Status**: ✅ WORKING - Tests pass with `bun run test:main` (96/96)
**Note**: Project uses Bun test runner, not Vitest. Database URL must match across all test files.

### Beads Database Corruption
**Symptom**: `br list` returns 0 issues or "ISSUE_NOT_FOUND" errors
**Cause**: SQLite database becomes stale/corrupted during concurrent operations
**Fix**: Rebuild database with: `rm .beads/beads.db && br init --force && br sync`
**Prevention**: Run `br sync` after bulk operations

### Database Connection Failures
**Symptom**: `bun run seed` fails with Postgres connection error
**Cause**: Local Postgres not running
**Fix**: Start local Postgres or use mock/memory DB for development

### Import/Module Resolution Issues
**Symptom**: Cannot find module errors in TypeScript
**Cause**: Missing dependencies or incorrect paths
**Fix**: Run `bun install`, check tsconfig.json paths, verify imports

### File Reservation Conflicts
**Symptom**: `FILE_RESERVATION_CONFLICT` when editing
**Cause**: Another agent has exclusive lock
**Fix**: Adjust patterns, wait for expiry, or coordinate with holder

### Build/Type Errors
**Symptom**: TypeScript compilation failures
**Cause**: Type mismatches, missing types, config issues
**Fix**: Run `bun run typecheck`, fix reported issues systematically

## Boss Agent Expectations

### Communication (Phase-Based)
- **Task Acknowledgment**: Within 5 minutes of assignment
- **Phase Transition**: Notify when entering/exiting deep work
- **Status Updates**: At task boundaries or every 30 minutes if task is long
- **Completion Notice**: Immediate when work finished
- **Blockers**: Report immediately, return to Coordination Phase

### Quality Standards
- **No Breaking Changes**: All existing tests must pass
- **Clean Code**: Follow existing patterns and conventions
- **Security**: No OWASP Top 10 vulnerabilities introduced
- **Performance**: Consider impact on app responsiveness

### Coordination
- **File Conflicts**: Coordinate with other agents proactively
- **Dependencies**: Check if your work blocks/unblocks other tasks
- **Integration**: Verify compatibility with in-progress work
- **Handoffs**: Provide clear context for follow-up work

## Priority Framework

1. **Unblockers** - Work that unblocks multiple other tasks
2. **Critical Bugs** - Production-breaking issues
3. **Integration Tasks** - Work that enables other agent coordination
4. **High-Impact Features** - Core user functionality
5. **Infrastructure** - Foundation improvements

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Tests pass: `bun run test`
- [ ] Types pass: `bun run typecheck`
- [ ] Security clean: `ubs <changed-files>` exits 0
- [ ] Integration verified manually
- [ ] Beads issue closed with completion reason
- [ ] Boss Agent notified with completion report
- [ ] File reservations released

## Emergency Protocols

### System Outages
If MCP Agent Mail fails: Continue work and document in ../completion/CURRENT_SYSTEM_ISSUES.md

### Blocking Dependencies
If blocked by unavailable agents: Escalate to Boss Agent within 15 minutes

### Critical Bugs
If production issue discovered: Immediately notify Boss Agent with severity assessment

---

## Changelog

**2026-02-11 (Session 2)**: Continued session by PurplePrairie
- Completed bd-3iw (Schedule timeline): Timeline.tsx, EventCard.tsx, EventForm.tsx with day grouping
- Completed bd-15f (Items tab): ItemList.tsx, ClaimButton.tsx, ClaimProgress.tsx, ItemForm.tsx
- Completed bd-s15 (JWT tests): 55 comprehensive tests in jwt.service.test.ts
- Completed bd-3g9 (Docker Compose): Production deployment setup with nginx, SSL, documentation
- Verified and closed: bd-1x8, bd-1zz, bd-2rk, bd-143 (already implemented)
- Active agents working on: bd-1sh (notifications), bd-11n (announcements), bd-3kd (security tests)
- System note: 11+ agent crashes documented in CURRENT_SYSTEM_ISSUES.md, using subagent spawning as primary work strategy

**2026-02-11**: Test infrastructure fixed, workflow updates by LilacBeacon
- Testing infrastructure now working: 96/96 tests pass with `bun run test:main`
- Fixed database URL mismatches across test files (unified to `postgresql://planner:planner@localhost:5432/groupplanner_test`)
- Added beads database corruption fix procedure
- Removed CRITICAL testing infrastructure failure (resolved)
- Session completed 7+ tasks with 3 parallel agents (BlueOwl, PinkMountain, PearlOwl)

**2026-01-31 (Session 2)**: Major delegation and completion session by LilacBeacon
- Completed 8 critical tasks via subagent delegation
- Identified and escalated testing infrastructure crisis (Vitest/Bun compatibility)
- Established reliable subagent delegation patterns for high-priority work
- Updated common issues with critical testing infrastructure failure

**2026-01-31**: Initial operational runbook created by LilacBeacon
- Established output contract and workflow standards
- Added common issues documentation and emergency protocols
