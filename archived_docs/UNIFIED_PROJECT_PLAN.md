# Group Trip Planner — Unified Implementation Plan

This plan merges the original `PROJECT_PLAN.md` and the agent-collaborative `GROUP_PLANNER_SPECIFICATION_V2.md` to create a single, self-hostable roadmap that balances practical engineering with scalability, security, and usability.

## Purpose & Scope
- Provide a self-hosted hub where hosts and members co-plan camping trips, road trips, and other adventures.
- Enable hosts to author schedules, recommend personal gear, and define shared necessities while group members suggest add-ons and claim responsibilities.
- Offer configurable notifications, real-time feedback, and cross-platform clients (web + Android) backed by a resilient service layer.

## Architecture & Core Stack

1. **Backend services**
   - **Node.js core API**: Express (or Fastify) provides the REST surface, Prisma or TypeORM connects to PostgreSQL, Socket.io handles real-time updates, and Redis/MinIO support caching and file storage. This layer covers all user-facing functionality (authentication, trips, schedules, item coordination, notifications) and satisfies the original Node.js requirement.
   - **Optional Go microservices**: For power users who need extra scalability or event-driven operations, deploy Go-based services (API Gateway, event stream processors, notification workers) adjacent to the Node API. These services talk over NATS/Redis and are introduced in later phases so teams can start with a Node-only deployment and grow into a hybrid architecture.

2. **Web client (Node.js + React)**  
   - Built with Next.js (React 18, TypeScript) to support SSR/PWA capabilities that share Graph/Q real-time hooks.  
   - Communication: TanStack Query + Axios/Socket.io-client for REST + WebSocket events.  
   - UI: Material Design (MUI) with accessibility-first components and offline caching via Workbox.  
   - State: Shared data (Zustand) + server cache (React Query) to reflect live schedule and item claims.

3. **Android client (Kotlin)**  
   - MVVM with Jetpack Compose, Retrofit for REST, WebSocket (okhttp/Socket.io) for live state.  
   - Local storage: Room DB + WorkManager for background sync and notification scheduling.  
   - Notifications: Firebase Cloud Messaging for push, supplemented by in-app reminders for schedule changes and item assignments.

4. **Infrastructure**  
   - Containerized via Docker Compose (web, gateway, services, Postgres, Redis, MinIO, NATS, Prometheus, Grafana).  
   - Reverse proxy (Nginx) with automated Let’s Encrypt certs; ability to run behind bare-metal or Kubernetes.  
   - CI/CD: blue/green deployments or GitHub Actions pipeline with security scans, tests, and optional deployment script.

## Core Capabilities

- **Trip & Member Management**  
  - Hosts create trips with overview, dates, location, privacy, and invite codes.  
  - Members join via links, view host timeline, and see aggregated statuses (confirmed, tentative).  
  - Host role grants edit/delete access, member approvals, and announcement control.

- **Schedule Planning**  
  - Timeline view per day/phase with events (title, location, duration, description).  
  - Members suggest events/places; hosts approve/modify or vote to accept.  
  - Conflict detection highlights overlapping items, optional auto-rescheduling hints, and map integration for geo-based logistics.

- **Item Coordination**  
  - **Recommended lists**: hosts publish categorized packing suggestions (e.g., clothing, safety, food) with optional/required flags.  
  - **Shared (needed) items**: hosts mark communal gear (tents, stoves, first aid kits) with quantity and priority; group members claim and mark availability.  
  - Claims prevent overbooking and send alerts when items remain unclaimed or quantities change.  
  - Members maintain personal packing checklists synchronized across web + mobile.

- **Notifications & Communication**  
  - Configurable preferences (email, push, in-app) for plan changes, schedule alerts, and item claims.  
  - Real-time events via WebSocket (schedule:updated, item:claimed, announcement).  
  - Digest emails or in-app summaries when major edits occur; optional Slack/webhook for ops.

- **Security & Operations**  
  - Input validation, JWTs with refresh tokens, CSRF protection (where applicable), and sanitization.  
  - Monitoring via OpenTelemetry/Prometheus + Grafana dashboards, plus structured logging for audits.  
  - Automated backups (Postgres base backup + WAL, MinIO mirroring) with disaster recovery scripts.

## Data Model & API Surface

- **Core tables**: `users`, `organizations`, `trips`, `trip_members`, `events`, `items`, `item_claims`, `notifications`, `preferences`, `trip_events` (audit).  
- **Notable entities**: `items` spans recommended/shared/personal; `item_claims` link users; `events` include suggestion metadata plus approval state.

- **Key REST endpoints** (mirror both specs):  
  - Auth: register, login, refresh, logout, profile.  
  - Trips: list, create, detail, update, delete, invite, analytics.  
  - Schedule: fetch, suggest, approve, vote.  
  - Items: list by type, create/update/delete, claim/unclaim, assign multiple users, dependencies.  
  - Notifications: preferences, mark read, paged fetch.  
  - Organizations: management and member hierarchies for multi-group deployments.

- **Real-time events**: schedule changes, item claims/releases, member joins, votes, announcements.  
- **Optional GraphQL layer** for advanced dashboards (trip timelines, aggregate analytics) and subscriptions.

## Self-Hosting & Deployment Notes

- Requirements: Linux server (2+ cores, 4GB RAM), Docker/Docker Compose, domain/static IP, SMTP config for emails.  
- Environment variables: `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `SMTP_*`, `MINIO_*`, `OIDC_*` for optional login providers.  
- Deployment steps: clone repo → configure `.env` → `docker compose up -d` → run migrations/seeds via Go CLI → configure reverse proxy + certs.  
- Observability: health-check endpoints, readiness/liveness for each service, aggregated metrics in Grafana, alerting via Prometheus rules.

## Development Phases

1. **Phase 1 – Foundation**  
   - Build Go auth + trip services, Postgres schema, event sourcing table, and basic API/gateway.  
   - Web app login/dashboard skeleton, mobile onboarding screens.  
   - CI pipeline with lint/test.

2. **Phase 2 – Scheduling & Items**  
   - Schedule event flows (suggest/approve/vote), item lists (recommended/shared/personal), and claim logic.  
   - Real-time updates (WebSocket + local caching) and notification preferences.  
   - Host and member dashboards, offline-first concerns.

3. **Phase 3 – UX & Mobile polish**  
   - Android app MVVM flows for timelines, item checklists, and notifications.  
   - React PWA improvements, accessibility compliance, responsive layout, micro-interactions.  
   - Add digest emails or summary notifications.

4. **Phase 4 – Ops & Extensions**  
   - Containerization, admin tooling, monitoring, backup automation, plugin/extension hooks (e.g., weather, payments).  
   - Multi-org support, analytics views, advanced RBAC from V2 spec.

## Validation & Documentation

- Automated tests: Go unit/integration tests, React component tests, Android instrumentation/unit, API contract tests.  
- Documentation: OpenAPI/Swagger, self-host guide, onboarding checklist, security practices, troubleshooting.  
- Issue tracking via Beads; plan to document follow-up work in `.beads/` and create bead entries for each phase.
