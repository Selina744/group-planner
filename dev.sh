#!/usr/bin/env bash
set -euo pipefail

# Development startup script for Group Planner
# Starts all services via Docker Compose and initializes the database schema.

COMPOSE_FILE="docker-compose.yml"

echo "==> Starting infrastructure services (postgres, redis)..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis

echo "==> Waiting for Postgres to be ready..."
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U planner -d groupplanner > /dev/null 2>&1; do
  sleep 1
done
echo "    Postgres is ready."

echo "==> Pushing Prisma schema to database..."
docker compose -f "$COMPOSE_FILE" run --rm -T \
  -e DATABASE_URL="postgresql://planner:planner@postgres:5432/groupplanner" \
  api bunx prisma db push --schema=./prisma/schema.prisma --skip-generate

echo "==> Generating Prisma client..."
docker compose -f "$COMPOSE_FILE" run --rm -T \
  api bunx prisma generate --schema=./prisma/schema.prisma

echo "==> Starting all services..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "All services are running:"
echo "  API:      http://localhost:4000"
echo "  Swagger:  http://localhost:4000/docs"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Use 'docker compose logs -f api' to tail API logs."
