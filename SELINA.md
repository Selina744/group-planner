# SELINA Notes

## 2026-01-29T06:25Z
- Added the Prisma demo seed script, but I could not execute `bun run seed` because the `postgres:5432` service from `docker compose` isn't running in this workspace, so the connection would fail. Having a lightweight local Postgres (or a mock) available would let us verify new seeds and migrations without manual intervention.

## 2026-01-29T06:40Z
- The remaining ready beads are mostly epics (e.g., authentication system, frontend foundations) that depend on additional controllers, routes, and frontend scaffolding that either aren't present yet or go beyond the current scope. If you want me to keep chipping away, it would help to break the epics into smaller tasks or point me to whichever submodule should be scaffolded next.
