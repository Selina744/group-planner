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

## Testing

The Group Planner project includes comprehensive testing setup for both backend and frontend.

### Backend Testing (✅ Production Ready)

The backend has a complete testing setup with **124 tests** covering all functionality:

```bash
# Navigate to backend directory
cd backend

# One-command setup (Docker + Database + Environment)
bun run test:setup

# Run all tests (124 tests)
bun run test:all

# Run main tests only (96 tests)
bun test

# Run example tests only (28 tests)
bun run test:examples
```

**Testing Stack:**
- **Bun Test** - Native TypeScript test runner
- **Supertest** - HTTP assertion library
- **Docker PostgreSQL** - Real database for integration tests
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

### Frontend Testing (🚧 In Development)

The frontend has testing infrastructure set up with example tests:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
bun install

# Run tests
bun test

# Run with coverage
bun run test:coverage
```

**Testing Stack:**
- **Vitest** - Fast test runner with TypeScript support
- **@testing-library/react** - React DOM testing utilities
- **@testing-library/jest-dom** - Custom matchers
- **@testing-library/user-event** - User interaction simulation
- **JSDOM** - DOM implementation for Node.js

**Current Status:**
- ✅ Testing infrastructure configured
- ✅ Example utility function tests working
- ✅ Mock patterns and async testing examples
- ✅ TypeScript support and type testing
- 🚧 Component testing (JSDOM environment setup in progress)
- 🚧 Integration testing with Material-UI
- 🚧 Authentication flow testing

### Testing Documentation

Comprehensive testing guides are available:

- **`backend/TESTING.md`** - Complete backend testing guide with setup, patterns, and troubleshooting
- **`frontend/TESTING.md`** - Frontend testing guide with React patterns, examples, and best practices

### Quick Test Status

| Component | Tests | Status | Coverage |
|-----------|-------|--------|----------|
| **Backend API** | 96 tests | ✅ Passing | Complete |
| **Backend Examples** | 28 tests | ✅ Passing | Documentation |
| **Frontend Utils** | 17 tests | ✅ Passing | Basic patterns |
| **Frontend Components** | 0 tests | 🚧 Setup | In progress |
| **Total** | **141 tests** | **✅ 124 passing** | **Backend complete** |

### Running All Tests

```bash
# Run backend tests only
cd backend && bun run test:all

# Run frontend tests only
cd frontend && bun test

# Run both (from project root)
bun run test  # Runs workspace-wide tests
```

The testing setup provides a solid foundation for maintaining code quality and preventing regressions as the project grows.
