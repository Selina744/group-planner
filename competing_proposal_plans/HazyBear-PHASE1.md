# Phase 1 Implementation Design — HazyBear

**Scope**: deliver the core Group Trip Planner MVP (authentication, trip management, schedule coordination, item lists, notifications, and self-hosted deployment) with a Node.js backend, React web client, and Kotlin Android client. Phase 1 must stay simple enough for self-hosted operators while leaving clear hooks for future extensions (plugins, features from `FUTURE_FEATURES.md`).

### 1. High-Level Architecture

- **Backend:** Node.js + TypeScript service built with Express and Prisma. Provides REST endpoints enriched with WebSocket broadcasts (Socket.io) for schedule/item updates plus structured notification delivery. Redis caches sessions/tokens and powers pub/sub for real-time events. PostgreSQL stores relational data with JSONB columns for metadata/extensions.
- **Web client:** React 18 SPA (Next.js optional for routing) using React Query + Zustand for state, Material UI for layout, and Socket.io-client for live events.
- **Android client:** Kotlin MVVM app with Jetpack Compose, Retrofit, Room for offline data, and Firebase Cloud Messaging for push notifications.
- **Infrastructure:** Docker Compose stack (api, web, postgres, redis, nginx). Phase 1 includes Dockerfiles, dev scripts, and documentation to self-host.
- **Deployment:** Provide docker-compose.dev/prod, environment variable reference, and simple health-check endpoints. Document manual bootstrap steps (migrate, seed admin).

### 2. Data Models

#### Primary tables

| Table | Key Fields | Purpose |
|---|---|---|
| `users` | `id UUID PK`, `email`, `password_hash`, `display_name`, `timezone`, `preferences JSONB`, `created_at` | Authentication + profile data. Preferences store notification flags and default timezone. |
| `trips` | `id UUID PK`, `host_id FK users`, `title`, `description`, `start_date`, `end_date`, `location JSONB`, `metadata JSONB`, `created_at` | Trip metadata plus extensible JSON for future modules (weather, budgets). |
| `trip_members` | `trip_id`, `user_id`, `role ENUM(host, member)`, `joined_at` | Role & membership enrollment. Enforce unique `(trip_id,user_id)`. |
| `events` | `id UUID`, `trip_id`, `title`, `description`, `start_time`, `end_time`, `location JSONB`, `status ENUM(proposed, approved, cancelled)`, `suggested_by`, `approved_by`, `metadata JSONB` | Schedule entries with suggestion/approval metadata for host moderation. |
| `items` | `id UUID`, `trip_id`, `name`, `type ENUM(recommended, shared)`, `description`, `category`, `quantity_needed`, `metadata JSONB`, `created_by`, `created_at` | Both recommended and shared items stored here; `type` discriminates behavior. |
| `item_claims` | `id UUID`, `item_id FK`, `user_id FK`, `quantity`, `created_at` | Tracks who volunteers for shared items; ensure sum of `quantity <= quantity_needed`. |
| `notifications` | `id UUID`, `user_id`, `trip_id`, `type`, `payload JSONB`, `read BOOLEAN`, `created_at` | Stores user notifications to power inbox UI + push/email. |
| `notification_preferences` | `user_id`, `trip_id`, `email_enabled`, `push_enabled`, `schedule_changes`, `item_updates` | Allows per-trip opt-in (default true). |

#### Extension tables

- `trip_extensions` / `user_extensions`: store future data keyed by `extension_type`. Add `UNIQUE (trip_id, extension_type)` to avoid duplicates, cascade on trip/user delete.
- `audit_events`: optional audit trail with `trip_id`, `type`, `payload`, `created_at` for future compliance.

### 3. Backend Components

#### Core modules

1. **Auth module**
   - Controllers: register, login, refresh, logout, profile, password reset (email token).  
   - Libraries: `bcrypt`, `jsonwebtoken`, `express-validator`, `nodemailer`.  
   - Middleware: token validation, RBAC guard reading `trip_members.role`.  
   - Security: slug hashed short-lived tokens, refresh stored hashed in Redis.

2. **Trip service**
   - Routes: `POST /api/trips`, `GET /api/trips`, `GET /api/trips/:id`, `PUT`, `DELETE`, `POST /api/trips/:id/members` (invite link logic), `DELETE /api/trips/:id/members/:userId`.  
   - Validations using `zod` or `yup`.  
   - Business rules: host-only mutations; invitations generate tokens stored in Redis with expiration.  
   - Side effects: emit Socket.io `trip:updated` events.

3. **Schedule service**
   - Endpoints: `GET /api/trips/:id/events`, `POST`, `PUT`, `DELETE`, `POST /api/events/:id/approve`.  
   - Workflow: members create events default `status=proposed`; hosts can approve/reject; suggestions have `suggested_by`.  
   - Conflict detection: server validates overlapping events per traveler by comparing times; returns warnings but allows host override.  
   - Realtime: emit `schedule:updated`, `event:proposed` events to trip room.

4. **Item coordination**
   - Endpoints for recommended/shared/h claims.  
   - Shared items track `quantity_needed`; claims check availability.  
   - Emit `item:claimed`, `item:unclaimed` events.

5. **Notifications**
   - Service writes row + dispatches Socket.io message.  
   - Adapter for email (Nodemailer) and push (Firebase via backend push tokens).  
   - Configurable per user/trip via `notification_preferences`.

6. **WebSocket & Real-time**
   - Socket.io namespaces `/trips/:tripId`.  
   - Auth via JWT handshake.  
   - Events: `trip:updated`, `schedule:updated`, `event:approved`, `item:claimed`, `notification:new`.  
   - Redis adapter for scaling (phase 1 still single instance but set up adapter stub).

7. **Jobs/cron**
   - Minimal Phase 1 tasks: nightly digest builder, email reminder for unclaimed shared items (configurable).  
   - Use `node-cron` or `bullmq` (keeping simple).  
   - Jobs produce notifications via service layer so same API used for manual/push.

8. **Shared utilities**
   - `errorHandler`, `wrapAsync`, `requestLogger`.  
   - `ApiResponse` format standard (status, data, errors).  
   - `prisma` instance exported from `db.ts`, `zod` schemas in `/schemas`.

9. **Testing**
   - Unit: `vitest` for services, `supertest` for controllers.  
   - Integration: test database using `sqlite` or test Postgres container via `docker-compose.test.yml`.  
   - Hedge: fixture builder for trips/events to reuse.

### 4. Frontend Plan

#### Global structure

- **Libraries**
  - UI: Material UI v5 + theme provider.  
  - Data fetching: React Query + Axios (with interceptors for tokens).  
  - State: Zustand for top-level UI state (current trip, modals).  
  - Routing: React Router; guard routes with auth hook.  
  - Forms: React Hook Form + zod resolver.  
  - Realtime: Socket.io-client hooking into trip room.  
  - Utilities: `date-fns`, `clsx`, `notistack` for toast notifications.

#### Layout & pages

1. **Auth pages**
   - `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`.  
   - Shared component `AuthFormLayout`.  
   - Hook: `useAuth` for login/logout, `useToken` to refresh.  
   - Flow: On login, fetch user + trips; store tokens in `httpOnly` cookie (server) or secure storage.

2. **Dashboard**
   - Shows upcoming trips, quick actions, notifications teaser.  
   - Components: `TripCard`, `ActionMenu`, `SummaryChart` (counts events/items).  
   - Data: React Query `useGetTrips`, cache invalidated on create/edit.

3. **Trip detail shell**
   - Layout with sidebar (members, shared items summary) and navbar (trip name, host actions).  
   - Tabs: Schedule, Items, Notifications, Members, Settings.  
   - Hook `useTripContext` to provide trip info, membership role, permission checks.

4. **Schedule page**
   - Components: `ScheduleTimeline` (grouped by day), `EventCard`, `EventFormModal`.  
   - Host sees `Approve` button for proposed events; members see suggestion form.  
   - Conflict highlight: events overlapping show warning tag.  
   - Provide `AddEventPanel` for new events, `SuggestEventForm`.  
   - Real-time: subscribe to Socket.io; show toast on updates.

5. **Items page**
   - Sections: Recommended items checklist, shared items list.  
   - Shared items show claim buttons, remaining quantity indicator, claim history (user chip).  
   - Host controls to add/remove items, adjust quantity.  
   - Member view allows toggling personal checklist items, entering notes.  
   - Use `useItemClaims` hook interacting with API.

6. **Notifications inbox**
   - List of notifications with filters (all/unread).  
   - Buttons to mark read; toggles for email/push preferences.  
   - Real-time update for new notifications.

7. **Members page**
   - Show list with roles, join status, invite actions (copy link, send email).  
   - Host can remove members.  
   - Invite creation uses backend endpoint issuing short-lived tokens.

8. **Settings page**
   - Personal profile (display name, email).  
   - Notification preferences toggles per trip.  
   - Account actions (logout, delete account).  
   - Help doc snippet linking to self-host guide.

9. **Modals & UI primitives**
   - `ConfirmationDialog`, `Toast`, `ResponsiveDrawer`, `LoadingOverlay`.  
   - `FeatureFlagBanner` indicates upcoming plugin features.

#### Data flow

- React Query keys: `['trips']`, `['trip', tripId]`, `['events', tripId]`, `['items', tripId]`, `['notifications', userId]`.  
- Sync/invalidations triggered after mutations (create event, claim item).  
- Background polling for notifications using `refetchInterval`.  
- Shared state: `currentTrip`, `activeTab`, `socketConnected`.

### 5. Android Client (Kotlin)

#### Architecture

- **Stack:** Kotlin + Jetpack Compose, Hilt for DI, Retrofit + OkHttp for REST/websocket (via `okhttp-ws`), Room for caching, WorkManager for background sync/push.  
- **Modules:**  
  1. **Auth module:** login, refresh token via secure storage (EncryptedSharedPreferences).  
  2. **Trips module:** list + detail, uses repository pattern to combine Room + network.  
  3. **Schedule module:** Presents timeline (Compose `LazyColumn` grouping by day).  
  4. **Items module:** recommended/shared, claim flows with user-friendly confirmations.  
  5. **Notifications:** local/remote (FCM) bridging; toggles preferences.  

#### Navigation

- Use Jetpack Navigation Compose with routes: `auth/login`, `dashboard`, `trip/{id}/schedule`, `trip/{id}/items`, `notifications`, `settings`.

#### Sync strategy

- On login, fetch all trips/events/items/notifications; store in Room.  
- WorkManager job refreshes data hourly and marks stale via `last_sync` field.  
- Socket connection (OkHttp web socket) listens for events; update Room and show Compose `Snackbar`.

#### UI components

- Shared Compose components: `TripCard`, `EventCard`, `ItemCard`, `ClaimButton`.  
- Patterns: `Scaffold` with top bar/trailing actions, bottom navigation for dashboard/notifications/settings.  
- Offline: show data from Room; offer “Refresh” action when offline.  

### 6. Deployment & Infrastructure

- **Docker Compose files:**  
  - `docker-compose.yml` (dev) with Node, React dev server (Vite), Postgres, Redis, Socket.io server.  
  - `docker-compose.prod.yml` uses built assets, configures Nginx reverse proxy, health checks (`/health` endpoints).  
  - `Dockerfile.api`, `Dockerfile.web` for self-host usage.  
- **CI scripts:** `bun test`, `bun lint`, `bun build`.  
- **Health checks:**  
  - API: `/healthz` ping.  
  - DB: `SELECT 1`.  
  - Web: ensure React build served.  
- **Monitoring:** Basic logging to STDOUT/JSON; plan for hooking into Prometheus later.  
- **Backups:**  
  - Document `pg_dump`/`pg_restore` instructions in README.  
  - Optionally, `cron` job for nightly backups (scripts included).  

### 7. Security & Quality

- Use `helmet`, CORS config, rate limit on auth endpoints.  
- Input sanitization with `express-validator`/`zod`.  
- Hash passwords with `bcrypt` (cost 12).  
- JWT with 15-minute access, 7-day refresh; store refresh in Redis hashed.  
- Use `bun lint` + `bun test`.  
- Document security practices for self-hosters (env var guidance).  

### 8. Observability & Documentation

- Document architecture (this file plus README).  
- Provide `docs/self-hosting.md`, `docs/api.md` (OpenAPI stub).  
- Add `docs/development.md` for running backend/web/mobile locally, migrating DB, seeding data (`npm run seed`).  

### 9. Deliverables & Timeline

| Week | Focus | Deliverables |
|---|---|---|
| W1 | Backend scaffolding | Auth, trips, DB schema, Mutex job + tests |
| W2 | Schedule + items APIs | Events/claims, conflict detection, realtime |
| W3 | Web UI | Dashboard, trip shell, schedule/items pages, React Query |
| W4 | Android shell | Basic authentication, dashboard, schedule view |
| W5 | Notifications + deployment | Notification system, Docker compose, docs |
| W6 | Stabilization | Tests, docs, QA, prepare extension hooks |

This plan ensures Phase 1 finishes with working web/mobile clients, Node backend, and deployable stack while keeping sources ready for Phase 2 extensions.
