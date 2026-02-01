# Phase 1.2 Completion Plan - Foundation for Phase 2

**Date:** 2026-02-01
**Status:** Critical Prerequisites for Phase 2
**Timeline:** Complete before Phase 2 agents begin work
**Estimated Duration:** 4-6 hours focused work

---

## Executive Summary

Phase 1.2 addresses **critical blockers and architectural decisions** that must be resolved before Phase 2 development begins. These items were identified through expert review analysis and represent the difference between smooth Phase 2 execution and immediate roadblocks.

**Core Objectives:**
1. **Remove Development Blockers** - Install missing dependencies that prevent agent work
2. **Make Architectural Decisions** - Choose simplified homelab-appropriate architecture
3. **Set Project Scope** - Remove enterprise complexity inappropriate for homelab deployment
4. **Establish Testing Foundation** - Create config files and database setup for immediate TDD

**Why Phase 1.2 is Essential:**
- Phase 2 agents **cannot start** without frontend dependencies installed
- Architectural decisions prevent overengineering during development
- Scope clarity keeps agents focused on homelab-appropriate features
- Testing foundation enables immediate TDD in Week 1

---

## 🚨 Critical Blockers (Must Complete First)

### 1. Frontend Dependencies Installation
**Problem:** PHASE2_EXPERT_REVIEW.md identified that TanStack Query, Zustand, React Router, React Hook Form, Zod, and Axios are **completely missing** from frontend/package.json despite being specified in the Phase 2 plan.

**Impact:** Agents literally cannot start bd-20t task without these dependencies.

**Solution:**
```bash
cd frontend

# Core state management and routing (MISSING)
bun add react-router-dom@^6.21.0
bun add @tanstack/react-query@^5.17.0  # Use v5, not v4 as per expert review
bun add zustand@^4.4.7

# Form handling and validation (MISSING)
bun add react-hook-form@^7.49.0
bun add zod@^3.22.4
bun add @hookform/resolvers@^3.3.4

# HTTP client and utilities (MISSING)
bun add axios@^1.6.5
bun add date-fns@^3.0.6

# Development dependencies for immediate TDD (MISSING)
bun add -d @tanstack/react-query-devtools@^5.17.0
bun add -d vitest@^1.2.0
bun add -d @vitest/ui@^1.2.0
bun add -d jsdom@^23.2.0
bun add -d @testing-library/react@^14.1.2
bun add -d @testing-library/jest-dom@^6.2.0
bun add -d @testing-library/user-event@^14.5.2
bun add -d msw@^2.0.11
bun add -d @playwright/test@^1.41.0
```

**Verification:** Run `bun install` and confirm all dependencies resolve without errors.

### 2. Backend Dependencies (Simplified for Homelab)
**Problem:** Socket.io and related dependencies not installed.

**Decision:** Use single-server Socket.io configuration (no Redis initially).

```bash
cd backend

# Real-time communication (simplified homelab approach)
bun add socket.io@^4.6.0
# Skip Redis adapter for Phase 2 - single server deployment
# Skip @socket.io/redis-adapter redis - defer to Phase 3 scaling

# Monitoring and error tracking (basic homelab setup)
bun add @sentry/node@^7.99.0
bun add winston@^3.11.0

# Development and testing
bun add -d @types/socket.io@^3.0.0
```

---

## 🏗️ Architectural Decisions (Homelab-Optimized)

### 3. Simplified Real-time Architecture
**Decision:** Single-server Socket.io without Redis adapter initially.

**Rationale for Homelab:**
- Most homelab deployments run on single server
- Redis adds complexity without immediate benefit
- Can add Redis scaling later if needed
- Reduces resource requirements and maintenance overhead

**Implementation Guidance for Phase 2 Agents:**
```typescript
// /backend/src/websocket/socket.ts
// Use simple in-memory Socket.io server
// Skip Redis adapter configuration
// Focus on basic room management and JWT auth
```

### 4. Simplified Docker Architecture
**Decision:** Basic multi-stage build without complex orchestration.

**Homelab Docker Strategy:**
- Single docker-compose.yml (not separate dev/staging/production)
- Basic health checks and restart policies
- Resource limits appropriate for homelab hardware (8GB RAM)
- Simple volume mounts for data persistence

**Skip Complex Features:**
- Multiple backend instances with load balancing
- Complex nginx configurations with upstream servers
- Database clustering or advanced connection pooling

### 5. Testing Strategy Simplification
**Decision:** Focus on essential test coverage without enterprise test infrastructure.

**Homelab Testing Approach:**
- Unit tests for core business logic
- Integration tests for critical user flows
- Basic E2E tests for smoke testing
- **Skip:** Complex performance testing, load testing beyond basic validation

---

## 📋 Project Scope Decisions (Remove Enterprise Complexity)

### 6. Features Deferred to Phase 3
**Remove from Phase 2 scope** to keep focused on homelab MVP:

**Deferred Infrastructure:**
- ❌ Redis clustering and advanced scaling
- ❌ Multiple backend instances with load balancing
- ❌ Advanced monitoring (Prometheus/Grafana)
- ❌ Complex CI/CD with blue-green deployment
- ❌ Enterprise-grade backup and disaster recovery

**Deferred Features:**
- ❌ Push notifications (requires service worker complexity)
- ❌ File uploads (profile pictures, trip photos)
- ❌ Email digest system (not MVP critical)
- ❌ Advanced user presence features
- ❌ Offline PWA capabilities

**Keep in Phase 2 (Simplified):**
- ✅ Basic real-time updates via Socket.io
- ✅ Essential authentication and authorization
- ✅ Core trip/event/item management
- ✅ Basic email notifications
- ✅ Simple Docker deployment
- ✅ Essential testing coverage

### 7. Updated Phase 2 Success Criteria
**Simplified for Homelab MVP:**

**Technical Targets:**
- Backend test coverage: 70% (reduced from 80%)
- Frontend test coverage: 65% (reduced from 75%)
- Support 25-50 concurrent users (reduced from 100+)
- Core Web Vitals: Basic performance (not aggressive optimization)

**Deployment Targets:**
- Single-server Docker deployment
- Basic health monitoring
- Simple backup strategy
- SSL termination with automatic renewal

---

## 🔧 Testing Infrastructure Foundation

### 8. Create Vitest Configuration Files
**Purpose:** Enable immediate TDD when Phase 2 begins.

**Frontend Test Config:**
```typescript
// /frontend/vitest.config.ts (CREATE)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 65,      // Homelab-appropriate target
        functions: 65,
        branches: 60,
        statements: 65
      }
    }
  }
})
```

**Backend Test Config:**
```typescript
// /backend/vitest.config.ts (CREATE)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,      // Homelab-appropriate target
        functions: 70,
        branches: 65,
        statements: 70
      }
    }
  }
})
```

### 9. Test Database Configuration
**Purpose:** Enable database tests without setup friction.

**Test Database Setup:**
```bash
# Ensure test database exists (already created during previous testing work)
# Verify connection with: bunx prisma db push --schema=./prisma/schema.prisma
```

**Test Environment File:**
```env
# /.env.test (UPDATE if needed)
NODE_ENV=test
DATABASE_URL="postgresql://test_user:test_password@localhost:5432/group_planner_test"
JWT_ACCESS_SECRET="test_access_secret_must_be_32_chars_minimum"
JWT_REFRESH_SECRET="test_refresh_secret_must_be_32_chars_minimum"
```

### 10. Basic GitHub Actions Workflow
**Purpose:** Enable CI/CD from Phase 2 start.

```yaml
# /.github/workflows/test.yml (CREATE BASIC)
name: Test Suite

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: group_planner_test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd backend && bunx prisma migrate deploy
      - run: bun --filter backend test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun --filter frontend test
```

---

## 📝 Documentation Updates

### 11. Update Phase 2 Plan References
**Update UNIFIED_PHASE2_PLAN.md:**
- Remove Redis adapter references in Week 3
- Update dependency lists to reflect actual installations
- Adjust test coverage targets to homelab-appropriate levels
- Remove enterprise infrastructure from Phase 2E
- Add reference to Phase 1.2 completion as prerequisite

### 12. Create Architecture Decision Record
**Create ADR-001-HOMELAB_ARCHITECTURE.md:**
- Document decision to use single-server deployment
- Rationale for deferring Redis and scaling features
- Performance expectations for homelab hardware
- Migration path for future scaling needs

---

## ✅ Phase 1.2 Completion Checklist

**Critical Blockers (Must Complete):**
- [ ] Frontend dependencies installed (all 15+ packages)
- [ ] Backend dependencies installed (Socket.io, Sentry, Winston)
- [ ] All `bun install` commands complete successfully
- [ ] No dependency resolution errors

**Architectural Decisions (Document & Implement):**
- [ ] Vitest config files created (frontend + backend)
- [ ] Test database connection verified
- [ ] Basic GitHub Actions workflow created
- [ ] Docker approach decided (simple multi-stage)
- [ ] Socket.io approach decided (single-server, no Redis)

**Scope Management (Update Documentation):**
- [ ] UNIFIED_PHASE2_PLAN.md updated with homelab scope
- [ ] Enterprise features moved to "Phase 3" or "Deferred"
- [ ] Success criteria adjusted to homelab targets
- [ ] ADR document created for architecture decisions

**Verification (Test Setup):**
- [ ] `bun run test` works in both frontend and backend
- [ ] TypeScript compilation succeeds with no errors
- [ ] Basic test infrastructure functional
- [ ] Development environment fully operational

---

## 🚀 Handoff to Phase 2

**When Phase 1.2 is complete:**
1. **All dependencies installed** - Agents can immediately start bd-20t
2. **Architecture decided** - Agents know to build simple, homelab-appropriate features
3. **Testing ready** - Agents can write tests from Day 1
4. **Scope clear** - Agents focus on MVP features, not enterprise complexity

**Phase 2 agents should:**
- Reference this document for architectural decisions
- Use simplified approaches documented here
- Focus on homelab deployment requirements
- Build with testing from the start (infrastructure ready)

**Success Metric:** Phase 2 agents can begin productive work immediately without setup friction or architectural uncertainty.

---

**Phase 1.2 Success Definition:** All technical blockers removed, architectural decisions made, and testing infrastructure ready for immediate Phase 2 TDD development with homelab-appropriate scope and complexity.