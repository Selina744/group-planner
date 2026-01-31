# CODER.md — Boss Agent Operational Runbook

*Maintained by: LilacBeacon (Boss Agent)*
*Last Updated: 2026-01-31*

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
4. Check inbox every 3-5 minutes during active work

### Work Acceptance
1. Acknowledge task assignment within 5 minutes
2. Update Beads: `br update <id> --status in_progress --json`
3. Provide time estimate and approach confirmation
4. Request clarification if requirements unclear

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

### CRITICAL: Testing Infrastructure Failure
**Symptom**: `TypeError: port.addListener is not a function` / `this.process.channel?.unref is not a function`
**Cause**: Vitest/Bun compatibility issue with worker processes
**Fix**: URGENT - System Administrator intervention required
**Workaround**: Complete implementation first, defer test verification until infrastructure fixed
**Impact**: Blocks quality gates and test verification workflows

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

### Communication
- **Response Time**: 5 minutes for task acknowledgment
- **Status Updates**: Every 30 minutes during active work
- **Completion Notice**: Immediate when work finished
- **Blockers**: Report immediately, don't wait

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
If MCP Agent Mail fails: Continue work and document in CURRENT_SYSTEM_ISSUES.md

### Blocking Dependencies
If blocked by unavailable agents: Escalate to Boss Agent within 15 minutes

### Critical Bugs
If production issue discovered: Immediately notify Boss Agent with severity assessment

---

## Changelog

**2026-01-31 (Session 2)**: Major delegation and completion session by LilacBeacon
- Completed 8 critical tasks via subagent delegation
- Identified and escalated testing infrastructure crisis (Vitest/Bun compatibility)
- Established reliable subagent delegation patterns for high-priority work
- Updated common issues with critical testing infrastructure failure

**2026-01-31**: Initial operational runbook created by LilacBeacon
- Established output contract and workflow standards
- Added common issues documentation and emergency protocols