# group-planner

## Docker Compose development environment

- `api` (backend) runs under `bun` and exposes `4000`.
- `web` (frontend) runs under `bun` and exposes `5173`.
- `postgres:16-alpine` provides persistent data on `5432`.
- `redis:7-alpine` serves in-memory stores on `6379`.
Both services rely on local workspace mounts for hot reload and a shared `bun-cache` volume to keep `bun install` artifacts between restarts.

### Running locally

1. Create a `.env` file with the required variables listed below.
2. Build and start everything with `docker compose up --build`.
3. Stop with `docker compose down` when you are done.

### Required environment variables

The API service reads the following from `.env`:

- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `REDIS_URL`
- `JWT_SECRET`

Add additional runtime configuration here if later issues require it.
