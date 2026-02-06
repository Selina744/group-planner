# Group Planner - Unified Phase 2 Development Plan

**Prepared by:** LilacBeacon (Boss Agent)
**Based on:** ../../archive/competing_plans/AzurePuma-PHASE2.md (foundation) + ../../archive/competing_plans/LavenderBeaver-PHASE2.md (coordination) + PHASE2_EXPERT_REVIEW.md analysis
**Date:** 2026-02-01
**Status:** Updated for Homelab Deployment - Expert Review Integrated
**Prerequisites:** **../completion/PHASE1_2_COMPLETION_PLAN.md must be completed first**

---

## Executive Summary

Phase 2 transforms Group Planner from backend-heavy prototype to **homelab-ready, real-time collaborative platform**. Building on the excellent Phase 1 foundation (authentication, CRUD APIs, security), Phase 2 prioritizes **frontend implementation, simplified real-time coordination, and homelab-appropriate production deployment**.

**Strategic Priorities (Homelab-Focused):**
1. **Frontend Development** - Complete React application with Material-UI
2. **Real-time Collaboration** - Socket.io with simplified single-server architecture
3. **Homelab Production Readiness** - Essential CI/CD, testing, and simple deployment
4. **Agent Coordination Excellence** - Seamless multi-agent development workflows

**Key Changes from Expert Review Integration:**
- **Simplified Architecture**: Single-server deployment, no Redis scaling initially
- **Homelab-Appropriate Scope**: Removed enterprise features inappropriate for self-hosting
- **Early Testing Strategy**: TDD from Week 1, not Week 4
- **Security Fundamentals**: CSRF protection, token refresh, input validation

## Technical Architecture Strategy

### Frontend Architecture (Expert Review Updated)
**Technology Stack:**
- **React 18** + **TypeScript** + **Material-UI v5**
- **React Router v6** - Client-side routing and navigation
- **TanStack Query v5** - Server state management and caching (upgraded from v4 per expert review)
- **Zustand** - Lightweight client state management (~1KB bundle)
- **React Hook Form** + **Zod** - Form validation matching backend schemas
- **Axios** - HTTP client with interceptors for auth and error handling

**Note:** All dependencies installed in ../completion/PHASE1_2_COMPLETION_PLAN.md - agents can begin work immediately.

### Backend Enhancements (Integrated Approach)
**Current Status**: Backend 85% complete with robust foundations
**Phase 2 Additions:**
- **Socket.io Integration** (`bd-2iy`): Real-time trip updates using secure JWT authentication
- **Item Service Completion** (`bd-v8v`): Full CRUD with claim/reserve functionality
- **Background Jobs**: Email digests, reminders, cleanup tasks using node-cron
- **File Upload**: Profile pictures and trip photos via multer + storage
- **Enhanced Audit Logging**: Activity tracking for coordination and debugging

### Real-time Architecture (Homelab-Simplified)
**WebSocket Strategy:**
- **Socket.io Server**: Authenticated rooms per trip using JWT validation
- **Trip-Specific Rooms**: Users only join trips they're members of (security-first)
- **Event Broadcasting**: Trip updates, member joins/leaves, event changes, item claims
- **Single-Server Architecture**: In-memory store for homelab deployment (25-50 concurrent users)
- **Connection Management**: Auto-reconnection, heartbeat monitoring with acknowledgments

**Scaling Strategy:** Redis adapter can be added in Phase 3 if horizontal scaling needed.

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

### Day 0: Prerequisites Verification (MANDATORY)
**Timeline: Before Day 1**
**Prerequisite:** ../completion/PHASE1_2_COMPLETION_PLAN.md must be completed

**Verification Checklist:**
- ✅ All frontend dependencies installed (TanStack Query v5, Zustand, React Router, etc.)
- ✅ All backend dependencies installed (Socket.io, Sentry, Winston)
- ✅ Vitest configurations created for both frontend and backend
- ✅ Test database operational and schema deployed
- ✅ Basic GitHub Actions workflow functional
- ✅ Architectural decisions documented (single-server, homelab-focused)

**If Phase 1.2 incomplete:** Agents must complete ../completion/PHASE1_2_COMPLETION_PLAN.md before beginning Phase 2 work.

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

5. **Early TDD Implementation** (Days 5-7)
   - Write tests for authentication UI components (already configured via Phase 1.2)
   - MSW setup for API mocking during frontend development
   - Component testing with React Testing Library
   - Basic security implementation: CSRF protection middleware
   - JWT token refresh interceptor for auth resilience

6. **Security Fundamentals Integration** (Days 6-7)
   - CSRF protection middleware implementation
   - Input validation with Zod schemas
   - Environment variable validation
   - XSS prevention for user-generated content

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
   - Single-server Socket.io with JWT authentication and secure room management
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
   - In-memory connection state management (homelab-appropriate for 25-50 users)
   - Auto-reconnection and heartbeat monitoring
   - Message acknowledgment and basic conflict resolution

   **Note:** Redis adapter deferred to Phase 3 scaling as per homelab architecture decision.

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

### Phase 2D: Testing & Quality Assurance (Homelab-Focused)
**Timeline: Days 22-28**
**All Agents: Quality Excellence for Homelab Deployment**

1. **Test Coverage Gap Fill** (Target: 70%/65% backend/frontend - homelab appropriate)
   - Fill coverage gaps identified during TDD development (Week 1-3)
   - API endpoint testing for critical user flows
   - Component testing for complex UI interactions
   - WebSocket connection and basic real-time feature tests

2. **Essential E2E and Performance Testing**
   - Critical user journey E2E tests with Playwright (register → login → create trip → invite)
   - Basic load testing for homelab capacity (25-50 concurrent users)
   - Core Web Vitals baseline (reasonable homelab targets, not aggressive optimization)
   - Basic accessibility validation with automated tools

3. **Security & Homelab Production Readiness**
   - Security validation of authentication flows and JWT handling
   - Basic WebSocket security verification
   - Database query performance for homelab hardware
   - Error handling and recovery for single-server deployment

### Phase 2E: Homelab Deployment & Essential Infrastructure
**Timeline: Days 29-35**
**Simple, Reliable Homelab Production Deployment**

1. **Basic Production Infrastructure** (Days 29-31)
   - **Simple Docker Compose**: Single-server deployment with health checks and restart policies
   - **SSL Setup**: Basic Traefik or nginx with Let's Encrypt automatic certificate renewal
   - **Database Configuration**: PostgreSQL tuning for homelab hardware (8GB RAM minimum)
   - **Security Basics**: Container non-root users, basic firewall rules, environment validation
   - **Skip Redis**: Single-server Socket.io deployment (can add Redis later if scaling needed)

2. **Essential Monitoring & Backup** (Days 32-33)
   - **Health Checks**: Basic endpoint monitoring (`/health/live`, `/health/ready`)
   - **Simple Logging**: Structured logs with basic retention (no complex aggregation)
   - **Daily Backups**: PostgreSQL backups with 7-day retention (sufficient for homelab)
   - **Basic Alerting**: Email notifications for critical failures
   - **Skip Complex Monitoring**: No Prometheus/Grafana (overkill for homelab MVP)

3. **Simple CI/CD & Documentation** (Days 34-35)
   - **GitHub Actions**: Basic test, build, and deployment pipeline
   - **Self-Hosting Guide**: Complete documentation for homelab deployment
   - **Database Migrations**: Automated schema updates with manual rollback procedures
   - **Environment Templates**: Example `.env` files and configuration guides
   - **Smoke Testing**: Basic deployment verification and health checks

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

### Technical Excellence (Homelab-Appropriate)
- **Test Coverage**: Backend 70%+, Frontend 65%+ (focused on critical paths)
- **Performance**: Core Web Vitals - Basic targets for homelab hardware
- **API Performance**: Response times <500ms P95, WebSocket latency <200ms (homelab network)
- **Security**: Zero critical vulnerabilities, essential authentication security
- **TypeScript**: Zero compilation errors, minimal ESLint warnings
- **Accessibility**: Basic keyboard navigation and screen reader support

### Multi-Agent Coordination
- **Response Time**: <5min response to Boss Agent priority messages
- **Task Completion**: 95% of assigned tasks completed on schedule
- **File Conflicts**: <2 conflicts per week through reservation discipline
- **Documentation**: 100% of activities logged in CODERLOG files

### Business Readiness (Homelab MVP Targets)
- **Feature Completeness**: 100% of core homelab MVP features implemented
- **Deployment**: Successful single-server homelab deployment with health monitoring
- **Scalability**: System handles 25-50 concurrent users (homelab baseline)
- **Backup/Recovery**: Daily automated backups with documented restore procedures
- **Self-Hosting Ready**: Complete documentation and setup guides for individual homelab owners

**Future Scaling Goals** (Phase 3+):
- **Multi-Server Scalability**: Redis adapter and load balancing for 100+ users
- **Advanced Monitoring**: Prometheus/Grafana stack for detailed analytics
- **High Availability**: Database replication and automated failover
- **Enterprise Features**: Advanced audit logging, compliance features, SSO integration

## Timeline & Milestones

### Week 1: Foundation Excellence (Enhanced with TDD)
**Days 1-7** | **Lead: AzurePuma** | **Support: LavenderBeaver**
- ✅ Phase 1.2 prerequisites verified (Day 1)
- 🎯 Authentication UI with security basics complete (Day 3)
- 🎯 Dashboard and trip list functional with tests (Day 5)
- 🎯 API integration layer with TDD implemented (Day 7)

**Key Deliverable**: Users can register, login, view trips with test coverage and basic security

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

### Week 4: Quality Assurance (Coverage Gap Fill)
**Days 22-28** | **All Agents: Testing Focus**
- 🎯 Backend test coverage gap fill to 70% (Day 24)
- 🎯 Frontend test coverage gap fill to 65% (Day 26)
- 🎯 E2E critical flow coverage and homelab load testing (Day 28)

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

**Phase 2 Success Definition**: A homelab-deployed, real-time collaborative group planning application with essential testing, basic monitoring, and multi-agent development excellence that provides complete MVP functionality for self-hosting enthusiasts.

**Prerequisites:** ../completion/PHASE1_2_COMPLETION_PLAN.md must be completed before Phase 2 execution begins.

This unified plan combines technical excellence with practical homelab deployment requirements, ensuring a maintainable, secure, and efficient application suitable for individual self-hosting without enterprise complexity.