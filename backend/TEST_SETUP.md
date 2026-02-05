# Test Setup Requirements

This document outlines all setup requirements needed before running tests successfully in the Group Planner Backend.

## 🔧 Prerequisites

### 1. **PostgreSQL Database**
Tests require a running PostgreSQL instance with a dedicated test database.

**Required:**
- PostgreSQL server running locally on port 5432
- Test database: `group_planner_test`
- Test user: `test_user` with password `test_password`

**Setup Commands:**
```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create test database and user
CREATE USER test_user WITH PASSWORD 'test_password';
CREATE DATABASE group_planner_test;
GRANT ALL PRIVILEGES ON DATABASE group_planner_test TO test_user;
GRANT ALL ON SCHEMA public TO test_user;

# Exit PostgreSQL
\q
```

### 2. **Environment Configuration**
Tests use a dedicated `.env.test` file that's already configured.

**Verify configuration:**
```bash
# Check if .env.test exists and has proper settings
cat .env.test
```

**Key environment variables:**
- `NODE_ENV=test`
- `DATABASE_URL="postgresql://test_user:test_password@localhost:5432/group_planner_test"`
- `JWT_SECRET` and related JWT configurations
- SMTP settings for email testing (can be mocked)

### 3. **Database Schema Setup**
The database schema must be applied before tests run.

**Setup Commands:**
```bash
# Apply Prisma schema to test database
NODE_ENV=test bun prisma db push

# Alternative: Generate and apply migrations
NODE_ENV=test bun prisma migrate dev --name init
```

### 4. **Dependencies Installation**
All project dependencies must be installed.

**Setup Commands:**
```bash
# Install all dependencies
bun install

# Verify Prisma client is generated
bun prisma generate
```

## 🏃‍♂️ Complete Setup Procedure

Follow these steps for a clean setup:

### Step 1: Install Dependencies
```bash
bun install
```

### Step 2: Setup PostgreSQL Database
```bash
# Start PostgreSQL (if not running)
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS

# Create test database and user
psql -U postgres -c "CREATE USER test_user WITH PASSWORD 'test_password';"
psql -U postgres -c "CREATE DATABASE group_planner_test;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE group_planner_test TO test_user;"
psql -U postgres -d group_planner_test -c "GRANT ALL ON SCHEMA public TO test_user;"
```

### Step 3: Apply Database Schema
```bash
# Set test environment and apply schema
NODE_ENV=test bun prisma db push
```

### Step 4: Verify Test Configuration
```bash
# Check environment configuration
cat .env.test

# Test database connection
NODE_ENV=test bun prisma db seed --preview-feature  # Optional: seed test data
```

### Step 5: Run Tests
```bash
# Run main tests only (recommended)
bun test src/tests/database.test.ts src/tests/item.test.ts src/tests/simple.test.ts src/tests/trip-integration.test.ts src/tests/trip.test.ts

# Run example tests separately
bun run test:examples:sequential

# Run all (includes cross-test contamination issue)
bun test  # ⚠️ May fail due to parallel execution
```

## ✅ Verification Steps

### Test Database Connection
```bash
# Quick connection test
NODE_ENV=test bun -e "
import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});
await prisma.\$connect();
console.log('✅ Database connection successful');
await prisma.\$disconnect();
"
```

### Test Environment Variables
```bash
# Check JWT secret is available
NODE_ENV=test bun -e "
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
"
```

### Test Schema Application
```bash
# Verify tables exist in test database
psql -U test_user -d group_planner_test -c "\\dt"
```

## 🐛 Troubleshooting Common Issues

### Issue: "JWT_SECRET environment variable is required"
**Solution:**
```bash
# Ensure .env.test exists and has JWT_SECRET
echo 'JWT_SECRET="test_jwt_secret_must_be_at_least_32_characters_long_for_security_requirements"' >> .env.test
```

### Issue: "Database connection refused"
**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Check connection details
psql -U test_user -d group_planner_test -c "SELECT 1;"
```

### Issue: "relation does not exist" errors
**Solution:**
```bash
# Apply/reapply database schema
NODE_ENV=test bun prisma db push --force-reset
NODE_ENV=test bun prisma generate
```

### Issue: "Tests fail with unique constraint violations"
**Cause:** Cross-test contamination when running `bun test` (parallel execution)

**Solutions:**
1. **Run tests separately (recommended):**
   ```bash
   # Main tests
   bun test src/tests/database.test.ts src/tests/item.test.ts src/tests/simple.test.ts src/tests/trip-integration.test.ts src/tests/trip.test.ts

   # Example tests
   bun run test:examples:sequential
   ```

2. **Or exclude example tests from main run:**
   ```bash
   # Configuration needed to exclude examples.skip/ from default bun test
   ```

### Issue: "Port already in use" during tests
**Solution:**
```bash
# Kill processes on test port
lsof -ti:3001 | xargs kill -9
```

## 📋 Pre-Test Checklist

Before running tests, verify:

- [ ] **PostgreSQL running** - `sudo systemctl status postgresql`
- [ ] **Test database exists** - `psql -U test_user -d group_planner_test -c "SELECT 1;"`
- [ ] **Dependencies installed** - `ls node_modules/`
- [ ] **Environment configured** - `.env.test` file exists with proper values
- [ ] **Schema applied** - `NODE_ENV=test bun prisma db push`
- [ ] **Prisma generated** - `bun prisma generate`

## 🎯 Success Criteria

When setup is complete:

✅ **Database connection successful** - No connection errors
✅ **Schema tables created** - All Prisma models exist in test DB
✅ **Environment variables loaded** - JWT secrets and config available
✅ **Dependencies ready** - All packages installed and Prisma client generated

## 📊 Expected Test Results

After proper setup:

| Test Suite | Command | Expected Result |
|------------|---------|-----------------|
| **Main Tests** | `bun test src/tests/*.test.ts` | ✅ 96/96 pass |
| **Example Tests** | `bun run test:examples:sequential` | ✅ 28/28 pass |
| **Combined Total** | When run separately | ✅ 124/124 pass (100%) |
| **Default Command** | `bun test` | ❌ 115/116 pass (contamination) |

## 🚀 Quick Setup Script

For automated setup, create and run:

```bash
#!/bin/bash
# setup-tests.sh

set -e

echo "🚀 Setting up test environment..."

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Setup PostgreSQL test database
echo "🗄️ Setting up test database..."
psql -U postgres -c "CREATE USER IF NOT EXISTS test_user WITH PASSWORD 'test_password';" 2>/dev/null || true
psql -U postgres -c "CREATE DATABASE group_planner_test;" 2>/dev/null || true
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE group_planner_test TO test_user;"
psql -U postgres -d group_planner_test -c "GRANT ALL ON SCHEMA public TO test_user;"

# Apply schema
echo "🏗️ Applying database schema..."
NODE_ENV=test bun prisma db push

# Verify setup
echo "✅ Verifying setup..."
NODE_ENV=test bun -e "
import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();
await prisma.\$connect();
console.log('✅ Database connection successful');
await prisma.\$disconnect();
"

echo "🎉 Test environment ready!"
echo "Run tests with:"
echo "  bun test src/tests/*.test.ts  # Main tests"
echo "  bun run test:examples:sequential  # Example tests"
```

Save as `setup-tests.sh`, make executable (`chmod +x setup-tests.sh`), and run (`./setup-tests.sh`).