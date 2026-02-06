# System Administrator Guide for group-planner

## Overview
This document contains essential information for system administrator agents managing the group-planner project infrastructure and multi-agent coordination.

## Agent Registration & Identity
**System Admin Agent Name:** RubyPond (ID: 3)
- **Program:** claude-code
- **Model:** claude-sonnet-4-20250514
- **Task:** System Administrator - Ensuring all systems are available for development teams
- **Registration:** Use `register_agent` with project_key="/data/projects/group-planner"

## Core Responsibilities

### 1. System Monitoring Schedule
- **Every 2 minutes:** Check MCP Agent Mail for help requests
- **Every 5 minutes:** Check CURRENT_SYSTEM_ISSUES.md and resolve reported issues
- **Every 15 minutes:** Agent status verification and coordination

### 2. Development Tools Management
**All tools verified operational (as of 2026-01-30):**
- **bun v1.3.7:** JavaScript/TypeScript package manager
- **Beads (br/bd):** Issue tracking system
- **bv (AI Triage):** Intelligent task prioritization
- **cass:** Cross-agent search and knowledge sharing
- **UBS v5.0.7:** Universal bug scanner

### 3. Multi-Agent Coordination
**Current Active Agents:**
- **LilacBeacon (Boss Agent):** Multi-agent coordination and task management
- **RubyPond (System Admin):** Infrastructure and system monitoring
- **IndigoGlacier:** Development tasks (recently active)

**Dormant Agents:** RosePrairie, LavenderBeaver (15+ hours unresponsive)

## Critical System Infrastructure

### MCP Agent Mail System
- **Status:** Operational
- **Host:** 127.0.0.1:8765 (development environment)
- **Database:** SQLite (sqlite+aiosqlite:///./storage.sqlite3)
- **Health Check:** `mcp__mcp-agent-mail__health_check`
- **Agent Registration:** `mcp__mcp-agent-mail__register_agent`

### Project Architecture
- **Backend API:** Node.js/TypeScript with Express (in backend/)
- **Web Client:** React/Vite/TypeScript (planned)
- **Android Client:** Native development (planned)
- **CLI Tool:** Server management utilities (planned)

## Operational Protocols

### Agent Responsiveness Standards
**Established by Boss Agent coordination:**
- **Priority messages:** 5-30 minute response window
- **Normal coordination:** 2-4 hour response window
- **Beyond timeframes:** Declare dormant, use Task subagents

### Dormant Agent Protocol
1. **Detection:** No response to priority messages within 30 minutes
2. **Declaration:** Mark as inactive in coordination systems
3. **Mitigation:** Use Task tool subagents for reliable progress
4. **Documentation:** Update status in SELINA.md and coordination logs

### Task Verification Process
**Key Discovery:** Tasks may be complete but still marked "in_progress"
1. **Use Task subagents** to verify actual completion status
2. **Close completed tasks** with `br close <id> --reason "Verified complete"`
3. **Regular auditing** of task status vs actual implementation

## Common Issues & Resolutions

### MCP Tool Access Problems
**Symptom:** Agent sessions lacking `mcp__mcp-agent-mail__*` tools
**Cause:** Session-specific tool availability
**Solution:** Session restart usually resolves tool access
**Workaround:** System admin can relay messages and register agents

### Agent Communication Failures
**Root Cause:** Agent-specific dormancy, not system issues
**Detection:** Unread message counts increase without responses
**Response:** Declare dormant after 30 minutes, continue with Task subagents

### Task Status Inaccuracy
**Issue:** "Open" or "in_progress" tasks may actually be complete
**Solution:** Use backend-reliability-engineer or other Task subagents to verify
**Process:** Systematic audit of long-standing tasks

## System Files & Documentation

### Key Files to Monitor
- **CURRENT_SYSTEM_ISSUES.md:** Real-time system problems and resolutions
- **IT.md:** System status and tool verification logs
- **SELINA.md:** Process improvements and human attention items
- **AGENTS.md:** Agent coordination rules and protocols

### File Maintenance
- **Regular cleanup:** Remove resolved issues, update current statuses
- **Status accuracy:** Keep all documentation current and actionable
- **Historical value:** Preserve lessons learned and protocol improvements

## Development Environment Status

### Current Task Pipeline
- **46 actionable issues** identified by bv triage
- **High-priority blockers:** bd-20t (React scaffold), bd-39i (Trip service), bd-2pd (Event service - verified complete)
- **Task assignment strategy:** Boss Agent coordinates via Task subagents

### Quality Assurance
- **Code review:** Automated via Task tool code-reviewer subagents
- **Testing:** UBS scanning for security/quality issues
- **Verification:** Backend-reliability-engineer for completion confirmation

## Emergency Procedures

### MCP System Outage
1. **Detection:** Health check failures or tool inaccessibility
2. **Communication:** Use CURRENT_SYSTEM_ISSUES.md for coordination
3. **Monitoring:** Check every 2 minutes until restored
4. **Recovery:** Verify all agents can access tools post-restoration

### Boss Agent Unresponsive
1. **Timeout:** If no response within 1 hour to critical system issues
2. **Escalation:** Document in SELINA.md for human attention
3. **Continuity:** System admin maintains basic coordination via Task subagents
4. **Recovery:** Provide full status update when Boss Agent returns

### Mass Agent Dormancy
1. **Recognition:** Multiple agents unresponsive (current situation)
2. **Strategy:** Task subagent approach for continued development
3. **Documentation:** Log patterns and potential causes
4. **Improvement:** Enhance agent lifecycle management protocols

## Best Practices for Future System Admins

### Proactive Monitoring
- **Don't wait for issues:** Regular status checks prevent problems
- **Documentation discipline:** Keep all logs current and accurate
- **Communication clarity:** Provide clear guidance to Boss Agents

### Coordination Support
- **Trust Boss Agents:** Support their coordination strategies when effective
- **Provide guidance:** Clear protocols for dormant agent handling
- **System perspective:** Focus on infrastructure, let Boss Agents manage development

### Continuous Improvement
- **Learn from incidents:** Document root causes and solutions
- **Protocol evolution:** Update procedures based on operational experience
- **Tool effectiveness:** Monitor which approaches work reliably

---

## Current System Status Summary
*Last Updated: 2026-01-30 00:40 UTC by RubyPond*

**✅ All Systems Operational**
- MCP Agent Mail: Functional
- Development Tools: Verified working
- Boss Agent Coordination: Active and effective (LilacBeacon)
- Task Progress: Reliable via Task subagent strategy
- Quality Pipeline: Automated review and verification

**🎯 Key Success Factors**
- Task subagent strategy proven reliable over dormant agent waiting
- Boss Agent coordination effective when MCP tools accessible
- System admin proactive monitoring prevents escalation
- Documentation discipline maintains operational continuity

**📋 Handoff Notes**
Future system admins should maintain the established monitoring schedule and support the effective Boss Agent coordination patterns already in place. The current strategy is working well.