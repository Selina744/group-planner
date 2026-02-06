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

## Documentation

Comprehensive project documentation is organized in the [`docs/`](docs/) directory:

- **[Development Guide](docs/development/)** - Setup, Docker, testing, and authentication
- **[Planning & Roadmap](docs/planning/)** - MVP, phases, and feature planning
- **[Completion Tracking](docs/completion/)** - Progress checklists and status
- **[Architecture](docs/architecture/)** - Technical design and testing architecture
- **[Agent Coordination](docs/agents/)** - Agent descriptions and activity logs

📖 **[Browse Full Documentation →](docs/README.md)**

## Testing

The Group Planner project includes comprehensive testing setup for both backend and frontend with **100% test success rates**.

### Backend Testing (✅ Production Ready)

The backend has a complete testing setup with **124 tests** covering all functionality:

#### Prerequisites

Before running tests, ensure you have the required test environment:

1. **Create `.env.test` file** in the `backend/` directory with:
   ```env
   DATABASE_URL="postgresql://test_user:test_password@localhost:5433/group_planner_test"
   JWT_SECRET="test_jwt_secret_must_be_at_least_32_characters_long_for_security_requirements"
   JWT_ACCESS_SECRET="test_access_secret_must_be_32_chars_minimum_for_security"
   JWT_REFRESH_SECRET="test_refresh_secret_must_be_32_chars_minimum_for_security"
   # ... other required environment variables
   ```

2. **Docker test database** must be running on port **5433** (not 5432)

#### Quick Setup & Testing

```bash
# From project root (recommended)
bun run test:setup     # One-command setup (creates .env.test, starts Docker, sets up database)
bun run test:all       # Run all tests (168 total: 124 backend + 44 frontend)
bun run test:teardown  # Clean up test environment when done

# Or from backend directory (alternative)
cd backend
bun run test:setup     # Same setup command
bun run test:all       # Run backend tests only (124 tests)
bun test              # Run main tests only (96 tests)
bun run test:examples  # Run example tests only (28 tests)
```

#### Manual Setup Steps

If the automated setup fails, you can run these steps manually:

```bash
cd backend

# 1. Start Docker test database (port 5433)
docker-compose -f docker-compose.test.yml up -d

# 2. Create .env.test with DATABASE_URL pointing to localhost:5433
# 3. Generate Prisma client and apply schema
NODE_ENV=test bun prisma generate
NODE_ENV=test bun prisma db push --force-reset

# 4. Run tests
bun run test:all
```

**Testing Stack:**
- **Bun Test** - Native TypeScript test runner
- **Supertest** - HTTP assertion library
- **Docker PostgreSQL** - Real database for integration tests (port 5433)
- **Prisma ORM** - Type-safe database operations
- **Custom Fixtures** - Reusable test data factories

**Key Features:**
- ✅ One-command setup with Docker
- ✅ Real PostgreSQL database (not mocks)
- ✅ Complete API endpoint coverage
- ✅ Authentication and authorization testing
- ✅ Database operation testing
- ✅ Type-safe with Prisma ORM
- ✅ Test isolation (no cross-test contamination)

### Frontend Testing (✅ Production Ready)

The frontend has been fully migrated to Bun test framework with **44 tests** and **100% pass rate**:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
bun install

# Run tests (44 tests, ~8.48 seconds)
bun test

# Run tests in watch mode
bun test --watch
```

**Testing Stack:**
- **Bun Test** - Native TypeScript test runner (80% faster than Vitest)
- **@testing-library/react** - React DOM testing utilities
- **JSDOM** - DOM implementation with comprehensive browser API mocks
- **Material-UI compatible** - Defensive testing patterns for MUI components

**Migration Benefits:**
- ✅ **100% success rate** (44 pass, 0 fail)
- ✅ **80% performance improvement** (42+ seconds → 8.48 seconds)
- ✅ **Zero configuration** - No complex setup files needed
- ✅ **Reliable execution** - No more timeout issues
- ✅ **TypeScript native** - No build step required

### Testing Documentation

Comprehensive testing guides are available:

- **`backend/TESTING.md`** - Complete backend testing guide with setup, patterns, and troubleshooting
- **`frontend/TESTING.md`** - Frontend testing guide with React patterns, examples, and best practices
- **`frontend/TESTING_MIGRATION_SUMMARY.md`** - Detailed migration guide from Vitest to Bun

### Quick Test Status

| Component | Tests | Status | Execution Time | Success Rate |
|-----------|-------|--------|----------------|--------------|
| **Backend API** | 96 tests | ✅ Passing | ~15 seconds | 100% |
| **Backend Examples** | 28 tests | ✅ Passing | ~6 seconds | 100% |
| **Frontend Components** | 44 tests | ✅ Passing | ~8.48 seconds | 100% |
| **Total** | **168 tests** | **✅ All passing** | **~30 seconds** | **100%** |

### Running All Tests

```bash
# Complete test cycle from root (recommended)
bun run test:setup    # One-time setup (starts Docker, creates .env.test, etc.)
bun run test:all      # Run all tests (168 total: 124 backend + 44 frontend)

# Individual test suites
bun --filter backend test:all   # Backend only (124 tests)
bun --filter frontend test      # Frontend only (44 tests)
bun test                        # Both workspaces (default behavior)

# Alternative: from specific directories
cd backend && bun run test:all  # Backend tests (requires test:setup first)
cd frontend && bun test         # Frontend tests (no setup needed)

# Cleanup when done
bun run test:teardown    # Stop test database and clean up
```

### Troubleshooting

**Common Issues:**

1. **"Connection refused" errors**: Ensure Docker test database is running on port 5433
   ```bash
   cd backend && bun run test:setup
   ```

2. **"Database does not exist" errors**: Missing `.env.test` file or wrong DATABASE_URL
   ```bash
   # Check .env.test exists in backend/ with correct port 5433
   ```

3. **Permission errors**: Docker not running or insufficient permissions
   ```bash
   sudo systemctl start docker  # Linux
   # Or restart Docker Desktop on macOS/Windows
   ```

The testing setup provides a robust, fast, and maintainable foundation for ensuring code quality as the project grows.
