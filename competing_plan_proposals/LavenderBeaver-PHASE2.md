# LavenderBeaver – Phase 2 Development Plan

## Executive Summary
Phase 2 moves Group Planner from foundational scaffolding to coordinated real-time planning and polished UX. The focus is on syncing frontend and backend, driving high-impact features (timeline, item coordination, notifications), and supporting ongoing Boss Agent coordination through clearer logging/delivery loops.

## Technical Architecture Strategy
- **Backend/API**: Build upon the existing Express + Zod + Prisma stack by adding dedicated controllers for timeline polling, item claim telemetry (via `backend/src/services`), and a WebSocket relay (`backend/src/websocket`) that shares the `AuthContext`/JWT slice so trip rooms remain secure.
- **Frontend integration**: Use the `/backend` API base from `backend/README.md`, expose auth-aware Axios interceptors, and hydrate trip snapshots through new Zustand stores so the React shell can display timeline/item data efficiently.
- **Real-time features**: Socket.io will broadcast events/items via trip-specific rooms, using Redis (placeholder adapter) for publish/subscribe bridging; the frontend will subscribe with an authenticated token and expect message acknowledgements logged via `LavenderBeaver-CODERLOG.md`.
- **Mobile readiness**: Design APIs with REST + WebSocket so future Android clients reuse the same endpoints and inference patterns; keep payloads lightweight and optional (e.g., locale/timezone in event payloads).
- **Scalability**: Keep rate limiting and token rotation active (`backend/src/middleware/rateLimit.ts`, `JwtService`) while scaling WebSocket connections with Redis adapter and TTL-based file reservations to avoid conflicts.

## Feature Implementation Roadmap
1. **Phase 2 Launchpad** – Prioritize finishing frontend scaffold (`bd-20t`) to open UI real estate for timeline and items. Tie in new Zod schemas (already added).
2. **Timeline + Items** – Implement backend endpoints to fetch/reserve timeline slots (with conflicts) and item lists; expose them via `/api/trips/:id` and `/api/items`.
3. **Notification/digest foundation** – Extend email/notification services (`bd-2qq`, `bd-yfz`) to push updates when new events/items change and send digest reminders (per `bd-7d8`).
4. **Coordination/Real-time** – Finish `bd-2iy` to stream events; tie broadcast actions to Win32-level watchers so the dashboard gets live updates.

## Development Process & Coordination
- **Task assignment**: Continue clearing `br ready` output, claim `bd-20t`, `bd-v8v`, or other high-impact tasks. Run `br update <id> --status in_progress`, and post updates in Agent Mail thread `[bd-###] …`.
- **File reservations**: Before editing backend/websocket files, call `file_reservation_paths(... paths)` with reason referencing plan sections.
- **CODERLOG tracking**: Every mail check, task start, release, and completion goes into `LavenderBeaver-CODERLOG.md` with UTC timestamps.
- **QA pipeline**: After each change, run `ubs <files>` and `bun test`/`bun prisma run` as needed, then message Boss Agent with summary + checklist before requesting next assignment.
- **Deployment readiness**: Keep documentation up to date (`backend/README.md`, `AUTHENTICATION_CHECKS.md`, etc.) and log any migrations/seeds run.

## Risk Assessment & Mitigation
- **Frontend blockers**: If the React scaffold is partially implemented, work closely with `bd-1cx` to finalize route shells before wiring timeline components.
- **Token/coordination drift**: Rely on current JWT service to rotate tokens; monitor `LavenderBeaver-CODERLOG.md` for missed mails and respond within 5 minutes.
- **File conflicts**: Use Agent Mail reservations and release them when switching tasks to reduce concurrency issues.

## Success Metrics
- High-priority tasks completed (e.g., timeline, item claims, digest service).  
- Real-time updates delivered without duplication (Socket.io handshake test results).  
- Documented Phase 2 plan submitted as `competing_plan_proposals/LavenderBeaver-PHASE2.md`.  
- Coordination protocols followed: mail checks every 2 min, CODERLOG entries, timely replies to Boss Agent.

## Timeline & Milestones
1. **Day 1** – Submit Phase 2 plan file (this document) + confirm with Boss Agent.  
2. **Day 2** – Finish frontend trip shells and timeline endpoints; push initial digest + item list endpoints.  
3. **Day 3** – Launch WebSocket broadcast plus coordination docs; ship summary log entry to Boss Agent.

