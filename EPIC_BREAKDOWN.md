# Epic Breakdown

This document translates the current Beads epics into smaller, implementation-ready pieces so we can open/claim `bd-###` tasks without ambiguity.

## Authentication System (`bd-22o`)
- **Login/Register API** – complete the controller, Zod validation, and route wiring for `/auth/login` and `/auth/register`, including `express-rate-limit` middleware (see `bd-306`, `bd-b1d`, `bd-op9` for reference).  
- **Token lifecycle** – finish access/refresh generation + rotation, revoke on logout, and refresh endpoint guards.  
- **Verification & recovery flow** – add email verification, password reset endpoints, and Prisma-backed token tracking so onboarding is secure.  
- **RBAC wiring** – expose `requireAuth`/`requirePermissions` helpers on trip/event routes using context metadata.

## Trip Management (`bd-2dw`)
- **Trip CRUD** – implement `POST /trips`, `GET /trips/:id`, `PATCH /trips/:id`, `DELETE /trips/:id` with proper owner membership checks.  
- **Invite codes & joining** – add invite-generation logic, join flow (email/code) and `TripMember` state updates.  
- **Member roles** – surface `HOST`, `CO_HOST`, `MEMBER` role changes and co-host permissions (e.g., invite, manage events).  
- **Member list + notifications** – endpoints to list active members and trigger trip-level notifications on creates/role changes.

## Schedule & Events (`bd-122`)
- **Event CRUD + schema** – build `createEvent`/`updateEvent` with the Zod schema outlined in `bd-2xs`, ensure start/end validation, and allow optional location metadata.  
- **Conflict detection** – check overlapping events per trip and surface warnings in responses.  
- **Proposal workflow** – support `PROPOSED` → `APPROVED` transitions with approver audit trails and optional notifications.  
- **Event activity feed** – expose a timeline endpoint and consider WebSocket/notification hooks for live updates.

## Item Coordination (`bd-sog`)
- **Item CRUD** – endpoints for recommended/shared item creation, updates, and deletion with quantity tracking.  
- **Claim lifecycle** – allow claiming, updating quantities, cancelling, and mapping status (`CLAIMED`, `BROUGHT`, `CANCELLED`).  
- **Shared item view** – trip-level list showing who claimed what and what remains.  
- **Reminders** – hook into notification/digest jobs to ping claimants with upcoming due dates.

## Notification System (`bd-7d8`)
- **Email service** – Nodemailer + Handlebars templates for verification/reset/invite/memo/digest.  
- **Notification preferences** – per-user/per-trip toggles (email/push/schedule granularity) plus digest frequency settings.  
- **Digest jobs** – periodic job that aggregates new events/items/announcements and dispatches to opted-in users.  
- **In-app messages** – API for CRUD notifications, mark as read, and stream to WebSocket subscribers.

## Real-time (Socket.io) (`bd-mjy`)
- **Socket server + trip rooms** – room naming, join/leave handlers, and middleware that reuses the `AuthContext`.  
- **Event broadcasting** – emit event/item/notification updates to trip participants when backend state changes.  
- **Redis adapter stub** – placeholder adapter for scaling (pub/sub) plus tests mirroring the current job queue.  
- **Client reconnection & ack** – ensure the socket layer retries and reports errors to the frontend.

## Frontend Foundation (`bd-1cx`)
- **App scaffold** – setup Vite + MUI theme, Axios base client, Zustand stores, and route layout for `/auth`, `/trips`, `/dashboard`.  
- **Shared UI kit** – typography/colors, responsive grid, data table/list components for events/items.  
- **HTTP layer** – interceptors that attach JWT, refresh tokens, handle errors, and integrate with backend rate-limit headers.  
- **State hydration** – trip/member contexts to cache user/profile/trip data across pages.

## Frontend Auth Pages (`bd-2j2`)
- **Auth form flows** – login, register, magic link (verify email), and forgot/reset steps with client-side validation.  
- **UX messaging** – contextual titles/alerts, button states, and routing guards for authenticated users.  
- **Token storage** – hook that safely persists refresh tokens (e.g., HttpOnly cookie) while keeping UI reactive.

## Frontend Trip Pages (`bd-2go`)
- **Dashboard & trip list** – grid/cards with trip metadata, statuses, and quick actions (create/join).  
- **Trip detail shell** – layout that hosts timeline, members, and item panels, with skeleton states for loading.  
- **Create/Join modals** – MUI dialogs that gather details (trip metadata, invite code) and call the API.  
- **Routing + guards** – protect trip detail routes and redirect to dashboard when not part of a trip.

## Frontend Schedule & Items (`bd-7up`)
- **Timeline view** – visualize events with status badges, date range filtering, and conflict indicators.  
- **Item coordination UI** – tables for recommended/shared items, claim buttons, quantity badges, and owner chips.  
- **Notifications feed** – list view for incoming updates, ability to mark read/ack, and integration with digest preferences.  
- **Conflict & reminder UI** – highlight overlapping claims/events and allow quick fixes (e.g., reassign claim).

Each bullet here can be converted into a dedicated `bd-###` task (type `task`) and referenced from its parent epic so other agents can claim concrete work without needing to interpret the full epic text.
