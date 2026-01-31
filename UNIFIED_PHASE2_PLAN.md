# Group Planner - Unified Phase 2 Development Plan

**Prepared by:** LilacBeacon (Boss Agent)
**Based on:** AzurePuma-PHASE2.md (foundation) + LavenderBeaver-PHASE2.md (coordination)
**Date:** 2026-01-30
**Status:** Draft for Expert Review

---

## Executive Summary

Phase 2 transforms Group Planner from backend-heavy prototype to production-ready, real-time collaborative platform. Building on the excellent Phase 1 foundation (authentication, CRUD APIs, security), Phase 2 prioritizes **frontend implementation, real-time coordination, and multi-agent development excellence**.

**Strategic Priorities:**
1. **Frontend Development** - Complete React application with Material-UI
2. **Real-time Collaboration** - Socket.io with secure trip-based rooms
3. **Production Readiness** - CI/CD, testing, monitoring, and scalability
4. **Agent Coordination Excellence** - Seamless multi-agent development workflows

This plan leverages AzurePuma's comprehensive technical roadmap while integrating LavenderBeaver's superior agent coordination protocols.

## Technical Architecture Strategy

### Frontend Architecture (Based on AzurePuma's Plan)
**Technology Stack:**
- **React 18** + **TypeScript** + **Material-UI v5**
- **React Router v6** - Client-side routing and navigation
- **TanStack Query v4** - Server state management and caching
- **Zustand** - Lightweight client state management (LavenderBeaver integration)
- **React Hook Form** + **Zod** - Form validation matching backend schemas
- **Axios** - HTTP client with interceptors for auth and error handling

### Backend Enhancements (Integrated Approach)
**Current Status**: Backend 85% complete with robust foundations
**Phase 2 Additions:**
- **Socket.io Integration** (`bd-2iy`): Real-time trip updates using secure JWT authentication
- **Item Service Completion** (`bd-v8v`): Full CRUD with claim/reserve functionality
- **Background Jobs**: Email digests, reminders, cleanup tasks using node-cron
- **File Upload**: Profile pictures and trip photos via multer + storage
- **Enhanced Audit Logging**: Activity tracking for coordination and debugging

### Real-time Architecture (LavenderBeaver WebSocket Insights + AzurePuma Scale)
**WebSocket Strategy:**
- **Socket.io Server**: Authenticated rooms per trip using JWT validation
- **Trip-Specific Rooms**: Users only join trips they're members of (security-first)
- **Event Broadcasting**: Trip updates, member joins/leaves, event changes, item claims
- **Redis Adapter**: Horizontal scaling preparation for production load
- **Connection Management**: Auto-reconnection, heartbeat monitoring with acknowledgments

### Multi-Agent Development Coordination (LavenderBeaver Excellence)
**File Reservation Protocol:**
- Use MCP file reservation system before editing shared files
- Reserve with specific reason referencing plan sections
- TTL-based reservations to avoid long-term conflicts
- Immediate release when switching tasks

**CODERLOG Tracking:**
- Every mail check, task start, release, and completion logged with UTC timestamps
- File: `{agent-name}-CODERLOG.md` for accountability and debugging
- Boss Agent communication every 5 minutes for priority tasks
- Progress summaries and blockers reported immediately

## Feature Implementation Roadmap

### Day 0: Infrastructure Prerequisites (MANDATORY)
**Timeline: Before Day 1**
**All Agents: Critical Setup**

**Frontend Dependencies Installation:**
```bash
cd frontend
bun add react-router-dom @tanstack/react-query@5 zustand react-hook-form zod @hookform/resolvers axios date-fns
bun add -d @tanstack/react-query-devtools vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw @playwright/test
```

**Backend Dependencies Installation:**
```bash
cd backend
bun add socket.io @socket.io/redis-adapter redis @sentry/node node-cron
```

**Production Infrastructure Setup (MVP-Critical):**
- Health check endpoints (`/health/live`, `/health/ready`, `/health/metrics`)
- Production Docker configurations with resource limits
- Basic reverse proxy setup (Traefik) with SSL automation
- Automated backup scripts for PostgreSQL and Redis
- Basic monitoring infrastructure (Prometheus metrics exposure)

**Testing Infrastructure Setup:**
- Vitest configurations for frontend and backend
- Test database isolation strategy
- MSW setup for API mocking
- GitHub Actions workflow definitions

### Phase 2A: Frontend Foundation (Priority 1)
**Timeline: Days 1-7**
**Primary Agent: AzurePuma** | **Support: LavenderBeaver (backend integration)**

**Core Task:** `bd-20t` (React+Vite+TypeScript scaffold) - **CRITICAL PATH UNLOCKER**

1. **Authentication UI** (`/frontend/src/pages/auth/`)
   - Login/Register forms with validation
   - Password reset flow and email verification
   - Social login preparation (Google OAuth integration)

2. **Core Navigation & Component Architecture** (`/frontend/src/components/`)
   - Atomic design methodology implementation:
     ```
     atoms/          # Basic UI elements (Button, Input, Icon)
     molecules/      # Simple combinations (SearchBox, FormField)
     organisms/      # Complex components (TripCard, EventTimeline)
     templates/      # Page layouts
     pages/          # Route-level components
     ```
   - App shell with responsive navigation (44px+ touch targets)
   - User menu with profile/logout
   - Comprehensive error boundaries and loading states
   - Accessibility-first design (WCAG 2.1 AA compliance)

3. **Dashboard & Trip List** (`/frontend/src/pages/dashboard/`)
   - Trip overview cards with status indicators
   - Create new trip modal with validation
   - Recent activity feed with real-time updates

4. **API Integration Layer** (`/frontend/src/services/`)
   - Axios client with auth interceptors
   - TypeScript API client generated from backend schemas
   - TanStack Query v5 setup for all endpoints with caching
   - MSW (Mock Service Worker) setup for development and testing

5. **Testing Infrastructure Setup** (Days 5-7)
   - Vitest configuration for unit and integration tests
   - React Testing Library setup for component testing
   - Test database isolation with Prisma
   - GitHub Actions CI/CD pipeline with coverage enforcement
   - Performance testing baseline (Core Web Vitals targets)

**Dependencies Resolved**: Unblocks 6+ downstream UI tasks and establishes TDD foundation

### Phase 2B: Core Trip Management (Priority 1)
**Timeline: Days 8-14**
**Parallel Development: Frontend (AzurePuma) + Backend APIs (LavenderBeaver)**

1. **Trip Detail Page** (`/frontend/src/pages/trip/`)
   - Trip information display and editing
   - Member management (invite, remove, role changes)
   - Trip status transitions with confirmations

2. **Event Management** (Integration of existing backend)
   - Calendar view for trip timeline
   - Event proposal and approval workflow (already implemented)
   - Conflict detection and resolution UI
   - Event details with cost estimates

3. **Item Management** (`bd-v8v` completion + frontend)
   - Shared item lists with categories
   - Claim/unclaim functionality with real-time updates
   - Quantity tracking and status updates
   - Item recommendations from hosts

4. **Mobile-First Design & Accessibility**
   - Responsive breakpoints: 320px/480px/768px/1024px/1440px
   - Touch-friendly interactions (44px+ touch targets, swipe gestures)
   - One-handed usage patterns (bottom navigation, reachable FABs)
   - Progressive Web App (PWA) with offline-first trip data
   - WCAG 2.1 AA compliance (color contrast 4.5:1+, keyboard navigation)
   - Screen reader optimization with ARIA labels
   - Focus management for real-time updates
   - Error recovery flows and user-friendly error messages

### Phase 2C: Real-time & Notifications (Priority 2)
**Timeline: Days 15-21**
**Primary Agent: LavenderBeaver** | **Support: AzurePuma (frontend integration)**

**Core Task:** `bd-2iy` (Socket.io server setup with JWT)

1. **Socket.io Integration** (`/backend/src/websocket/`)
   - Socket.io server with JWT authentication and secure room management
   - TypeScript event schema and validation:
     ```typescript
     interface SocketEvents {
       'trip:update': { tripId: string; changes: TripUpdate }
       'member:join': { tripId: string; member: Member }
       'item:claim': { tripId: string; itemId: string; claimerId: string }
       'presence:update': { tripId: string; userId: string; status: 'online' | 'away' }
     }
     ```
   - Trip-specific rooms with role-based broadcasting
   - Connection state management with auto-reconnection
   - Redis adapter for horizontal scaling
   - Message acknowledgment, retry logic, and conflict resolution

2. **Real-time Frontend** (`/frontend/src/hooks/useSocket.ts`)
   - Socket.io client with auto-reconnection and presence indicators
   - Real-time trip updates with conflict resolution UX
   - Live member activity indicators with online/away status
   - Optimistic updates with rollback mechanisms
   - Connection status UI (connected/connecting/disconnected/error)
   - Offline queue for failed operations with retry
   - User presence management for collaborative editing

3. **Notification System**
   - In-app notification center with read states
   - Email digest system with user preferences
   - Push notification preparation
   - Notification history and preferences

### Phase 2D: Advanced Testing & Quality Assurance (Priority 2)
**Timeline: Days 22-28**
**All Agents: Comprehensive Quality Excellence**

1. **Test Coverage Completion** (Target: 80%/75% backend/frontend)
   - Complete test suite development using TDD foundation
   - API endpoint comprehensive testing with Supertest
   - Component integration testing with React Testing Library
   - WebSocket connection, room management, and real-time feature tests

2. **E2E and Performance Testing**
   - Critical user flow E2E tests with Playwright
   - Load testing for real-time collaboration (100+ concurrent users)
   - Core Web Vitals optimization (FCP <1.8s, LCP <2.5s, FID <100ms)
   - Accessibility audit with automated testing tools

3. **Security & Production Readiness**
   - Security audit of authentication flows and JWT handling
   - Penetration testing for WebSocket security
   - Database query performance optimization
   - Error handling and recovery flow validation

### Phase 2E: Production Deployment & Infrastructure (Priority 3)
**Timeline: Days 29-35**
**Homelab-Ready Production Deployment**

1. **Production Infrastructure Deployment** (Days 29-31)
   - **Traefik Reverse Proxy**: SSL termination, automatic certificate renewal
   - **Production Docker Compose**: Resource limits, health checks, restart policies
   - **Database Optimization**: PostgreSQL tuning for homelab hardware (8GB RAM config)
   - **Redis Configuration**: Memory limits (256MB), persistence, LRU eviction
   - **Security Hardening**: Firewall rules, container security, non-root users

2. **Monitoring & Backup Systems** (Days 32-33)
   - **Basic Monitoring Stack**: Prometheus metrics collection, Grafana dashboards
   - **Health Monitoring**: Service health checks, database connectivity checks
   - **Automated Backups**: Daily PostgreSQL/Redis backups with 30-day retention
   - **Alerting Rules**: Critical service failures, high error rates, resource exhaustion
   - **Log Management**: Structured JSON logging, basic log aggregation

3. **CI/CD & Deployment Automation** (Days 34-35)
   - **GitHub Actions Pipeline**: Automated testing, security scanning, deployment
   - **Production Deployment**: Automated deployment to homelab environment
   - **Database Migrations**: Automated schema updates with rollback capability
   - **Environment Validation**: Configuration validation, dependency checking
   - **Deployment Verification**: Health checks, smoke tests, rollback procedures

**Homelab Requirements Met:**
- **Hardware**: 4 cores, 8GB RAM minimum (16GB recommended)
- **Network**: Static IP capability, port 80/443 forwarding
- **Storage**: 100GB SSD minimum (500GB recommended for logs/backups)
- **Estimated Cost**: $800-1500 hardware + $25-40/month operating

**Infrastructure Scope Boundaries:**
- ✅ **Phase 2 (MVP-Ready)**: Basic reverse proxy, health checks, automated backups, basic monitoring
- 🔄 **Post-MVP Enhancements**: Advanced monitoring, Redis clustering, load balancing, disaster recovery
- 📋 **See**: `POST_MVP_INFRASTRUCTURE_PLAN.md` for enterprise-grade infrastructure roadmap

## Multi-Agent Development Process & Coordination

### Daily Workflow (LavenderBeaver Excellence)
1. **Morning Sync**: Check Agent Mail every 5 minutes during active work
2. **File Reservations**: Use MCP file reservation system with specific reasons
3. **Progress Logging**: All activities in `{agent-name}-CODERLOG.md` with UTC timestamps
4. **Boss Agent Communication**: Daily progress summaries and immediate blocker reporting

### Task Prioritization (Intelligent Assignment)
- Continue using `bv --robot-triage` for data-driven task analysis
- **Critical Path**: `bd-20t` → `bd-2iy` → `bd-v8v` (unlockers first)
- **Parallel Tracks**: Frontend/backend development when dependencies allow
- **Quality Gates**: UBS scanning + testing before task completion

### Code Quality Standards (Production Excellence)
**TypeScript & Validation:**
- Maintain 100% TypeScript strict mode compliance
- Zod schemas for runtime validation matching backend exactly
- Generate TypeScript types from Prisma schema
- Comprehensive error boundaries and error handling

**Testing Strategy:**
- Test-driven development for critical user flows
- Component testing for all reusable UI components
- Integration testing for API endpoints and WebSocket functionality
- E2E testing for complete user journeys

**Documentation:**
- Update API documentation as features are implemented
- Maintain setup guides for development and production
- Document component library and design system decisions
- Keep architectural decision records (ADRs) updated

### Infrastructure Integration (Homelab-Ready)
**Production Infrastructure Tasks** (Integrated with development):
- **Health Check Implementation**: Add `/health/live`, `/health/ready`, `/health/metrics` endpoints
- **Docker Production Builds**: Multi-stage Dockerfiles with security hardening and resource limits
- **Environment Configuration**: Zod-based environment validation and configuration management
- **Backup Integration**: Database backup scripts with automated scheduling and restoration testing
- **Monitoring Endpoints**: Prometheus metrics exposure and basic alerting rules

**Infrastructure Coordination:**
- Backend agents implement health checks and metrics endpoints
- DevOps-focused agents handle Docker configurations and deployment automation
- All agents follow production-ready coding standards (logging, error handling, security)
- Coordinate infrastructure testing with application testing for integrated validation

## Risk Assessment & Mitigation

### Technical Risks (AzurePuma Analysis + LavenderBeaver Coordination)

**Risk 1: Frontend Development Complexity**
- **Impact**: High - Frontend is greenfield development
- **Mitigation**: Break into small components, use Material-UI patterns, MVP-first approach

**Risk 2: Agent Coordination Conflicts**
- **Impact**: Medium - File conflicts and duplicate work
- **Mitigation**: Strict file reservation protocol, clear task boundaries, 5-minute Boss Agent sync

**Risk 3: Real-time Performance & Scaling**
- **Impact**: Medium - Socket.io connections and database load
- **Mitigation**: Load testing, Redis adapter, database optimization, monitoring

### Project Risks

**Risk 4: Phase 2 Scope Creep**
- **Impact**: High - Could delay MVP delivery
- **Mitigation**: Maintain strict MVP definition, defer non-essentials to Phase 3

**Risk 5: Testing Coverage Gaps**
- **Impact**: High - Production bugs impact user experience
- **Mitigation**: Mandatory coverage thresholds, automated CI/CD testing

## Success Metrics

### Technical Excellence
- **Test Coverage**: Backend 80%+, Frontend 75%+
- **Performance**: Core Web Vitals - FCP <1.8s, LCP <2.5s, FID <100ms, CLS <0.1
- **API Performance**: Response times <200ms P95, WebSocket latency <100ms
- **Security**: Zero critical vulnerabilities, comprehensive authentication audit
- **TypeScript**: Zero compilation errors, minimal ESLint warnings
- **Accessibility**: WCAG 2.1 AA compliance for all user-facing features

### Multi-Agent Coordination
- **Response Time**: <5min response to Boss Agent priority messages
- **Task Completion**: 95% of assigned tasks completed on schedule
- **File Conflicts**: <2 conflicts per week through reservation discipline
- **Documentation**: 100% of activities logged in CODERLOG files

### Business Readiness (MVP Targets)
- **Feature Completeness**: 100% of core MVP features implemented
- **Deployment**: Successful homelab production deployment with basic monitoring
- **Scalability**: System handles 50+ concurrent users (MVP baseline)
- **Backup/Recovery**: Daily automated backups with tested restore procedures
- **Infrastructure Foundation**: Ready for post-MVP enterprise scaling

**Post-MVP Infrastructure Goals** (See POST_MVP_INFRASTRUCTURE_PLAN.md):
- **Enterprise Scalability**: 1000+ concurrent users with load balancing
- **High Availability**: 99.9% uptime with automated failover
- **Advanced Monitoring**: Comprehensive alerting and performance analytics
- **Disaster Recovery**: < 4 hour RTO, < 1 hour RPO capabilities

## Timeline & Milestones

### Week 1: Foundation Excellence
**Days 1-7** | **Lead: AzurePuma** | **Support: LavenderBeaver**
- ✅ Unified plan expert review complete (Day 1)
- 🎯 Authentication UI complete (Day 3)
- 🎯 Dashboard and trip list functional (Day 5)
- 🎯 API integration layer implemented (Day 7)

**Key Deliverable**: Users can register, login, view trips with real-time updates

### Week 2: Core Features
**Days 8-14** | **Parallel Development**
- 🎯 Trip detail pages with member management (Day 10)
- 🎯 Event management UI leveraging existing backend (Day 12)
- 🎯 Item management with claims (`bd-v8v`) functional (Day 14)

**Key Deliverable**: Complete trip management workflow operational

### Week 3: Real-time Excellence
**Days 15-21** | **Lead: LavenderBeaver** | **Support: AzurePuma**
- 🎯 Socket.io integration complete (`bd-2iy`) (Day 17)
- 🎯 Real-time updates in frontend (Day 19)
- 🎯 Notification system operational (Day 21)

**Key Deliverable**: Real-time collaborative experience fully functional

### Week 4: Quality Assurance
**Days 22-28** | **All Agents: Testing Focus**
- 🎯 Backend test suite 80% coverage (Day 24)
- 🎯 Frontend test suite 75% coverage (Day 26)
- 🎯 E2E critical flow coverage (Day 28)

**Key Deliverable**: Production-ready quality with comprehensive testing

### Week 5: Production Ready
**Days 29-35** | **Deployment Excellence**
- 🎯 CI/CD pipeline operational (Day 31)
- 🎯 Monitoring and alerting configured (Day 33)
- 🎯 Production deployment successful (Day 35)

**Key Deliverable**: Live, scalable Group Planner MVP

## Emergency Acceleration Options
If timeline pressure increases:
1. **Parallel Agent Development**: Split frontend/backend cleanly between agents
2. **MVP Scope Reduction**: Defer advanced features to Phase 2.5
3. **Template Acceleration**: Use Material-UI templates for rapid UI development
4. **Testing Triage**: Focus on critical path coverage first, expand iteratively

---

**Phase 2 Success Definition**: A production-deployed, real-time collaborative group planning application with comprehensive testing, monitoring, and multi-agent development excellence that demonstrates the full value proposition of the platform.

This unified plan combines AzurePuma's technical excellence with LavenderBeaver's coordination mastery for optimal Phase 2 execution.