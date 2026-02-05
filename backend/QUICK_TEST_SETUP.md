# ⚡ Quick Test Setup - One Command

This document provides the fastest way to get tests running with a single command.

## 🚀 One-Command Setup

```bash
bun run test:setup
```

That's it! This command will:
- ✅ Install all dependencies
- ✅ Start PostgreSQL test database in Docker
- ✅ Apply database schema
- ✅ Configure environment variables
- ✅ Verify everything works

## 🏃‍♂️ Running Tests After Setup

```bash
# Run all tests properly (124 tests, 100% success)
bun run test:all

# Or run test suites individually:
bun run test:main       # Main tests (96 tests)
bun run test:examples   # Example tests (28 tests)

# Default bun test now excludes examples to prevent contamination
bun test               # Only main tests (96 tests) ✅
```

## 🔧 Test Management Commands

| Command | Description |
|---------|-------------|
| `bun run test:setup` | **One-command setup** - Does everything |
| `bun run test:all` | Run all tests properly (124 tests) |
| `bun run test:main` | Run main tests only (96 tests) |
| `bun run test:examples` | Run example tests (28 tests) |
| `bun run test:reset` | Reset and restart test environment |
| `bun run test:teardown` | Stop test database |
| `bun run test:logs` | View PostgreSQL logs |

## 🐳 What the Setup Does

### 1. **Docker PostgreSQL** (Automatic)
- Starts PostgreSQL 15 in Docker container
- Uses port 5433 (avoids conflicts with local dev DB)
- Isolated test database with proper permissions
- Health checks ensure DB is ready before continuing

### 2. **Schema & Environment** (Automatic)
- Applies Prisma schema to test database
- Configures `.env.test` with Docker database URL
- Generates Prisma client for test environment

### 3. **Test Configuration** (Automatic)
- Configures Bun to exclude examples from default `bun test`
- Sets up proper test timeouts and environment
- Enables isolated test execution

## 🎯 Prerequisites

**Required:**
- Docker (for PostgreSQL container)
- Bun runtime

**That's it!** No manual database setup, no environment configuration, no schema application.

## 🚀 From Zero to Testing

```bash
# Clone repo (if needed)
git clone <repo-url>
cd backend

# One command setup
bun run test:setup

# Run all tests
bun run test:all
```

## 📊 Expected Results

After setup:
- ✅ **96/96 main tests pass** (`bun run test:main`)
- ✅ **28/28 example tests pass** (`bun run test:examples`)
- ✅ **124/124 total tests pass** (`bun run test:all`)
- ✅ **96/96 default tests pass** (`bun test` - excludes examples)

## 🔧 Troubleshooting

**If setup fails:**
```bash
# Check Docker is running
docker --version

# Reset everything and try again
bun run test:reset
```

**If tests fail:**
```bash
# View database logs
bun run test:logs

# Reset test environment
bun run test:reset
```

## 💡 Key Improvements

1. **Docker Isolation** - No local PostgreSQL setup needed
2. **Single Command** - Everything automated in `test:setup`
3. **Fixed Default Behavior** - `bun test` now works correctly
4. **Easy Management** - Simple commands for all test operations
5. **Port Isolation** - Test DB on 5433, dev DB on 5432
6. **Environment Separation** - Docker-specific test configuration

This setup eliminates all manual configuration and provides a consistent, reliable test environment for all developers.