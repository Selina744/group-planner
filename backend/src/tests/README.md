# Backend Test Setup - Complete Documentation

This directory contains the comprehensive test setup for the Group Planner backend API, implementing **Bun Test + Supertest + Test Database** with native Bun testing framework.

## 🏗️ Test Infrastructure Overview

### Core Components

1. **Bun Native Testing** - Ultra-fast test runner with built-in TypeScript support
2. **Supertest** - HTTP assertion library for API endpoint testing
3. **Test Database Configuration** - Isolated database for tests
4. **Test Utilities & Fixtures** - Reusable test data creation and helpers
5. **Comprehensive Examples** - Demonstrating all testing patterns

## 📁 Directory Structure

```
src/tests/
├── README.md                    # This documentation
├── setup.ts                     # Global test configuration
├── utils/                       # Test utilities and helpers
│   ├── index.ts                # Central exports
│   ├── test-database.ts        # Database management utilities
│   ├── test-fixtures.ts        # Test data creation helpers
│   └── test-helpers.ts         # General test utilities
├── examples/                    # Example tests demonstrating capabilities
│   ├── health-api.test.ts      # Basic API endpoint testing
│   ├── auth-service.test.ts    # Service testing with mocking
│   └── full-integration.test.ts # Complete integration testing
└── [existing test files]       # Your actual test files
```

## ⚙️ Configuration Files

### Test Environment (`.env.test`)
```bash
NODE_ENV=test
DATABASE_URL="postgresql://test_user:test_password@localhost:5432/group_planner_test"
JWT_SECRET="test-jwt-secret-with-sufficient-length..."
# ... other test-specific configuration
```

### Bun Test Configuration (native)
- ✅ No configuration file needed - works out of the box
- ✅ Native TypeScript support
- ✅ Built-in test discovery and execution
- ✅ Fast startup and execution
- ✅ Test environment variables loaded via setup.ts
- ✅ Integrated with Bun runtime for optimal performance

## 🛠️ Test Utilities

### Database Management

```typescript
import {
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
  getTestDb,
  withTestTransaction
} from './utils/test-database.js';

// Use in tests
useDatabaseHooks(); // Automatic setup/cleanup
```

### Test Fixtures

```typescript
import { UserFixtures, TripFixtures, ScenarioFixtures } from './utils/test-fixtures.js';

// Create test data
const user = await UserFixtures.createUser();
const { trip, membership } = await TripFixtures.createTrip(user.id);
const fullScenario = await ScenarioFixtures.createFullTripScenario();
```

### API Testing Helpers

```typescript
import { ApiTestHelpers } from './utils/test-helpers.js';

// Test API responses
ApiTestHelpers.expectSuccessResponse(response, 201);
ApiTestHelpers.expectErrorResponse(response, 400, 'Validation failed');
ApiTestHelpers.expectPaginationResponse(response, 5);
```

## 📋 Test Patterns

### 1. Unit Tests (Service Layer)

```typescript
describe('AuthService', () => {
  it('should hash passwords securely', async () => {
    // Mock external dependencies
    mock.module('bcrypt', () => ({ default: { hash: mock() } }));

    // Test your service logic
    const result = await AuthService.hashPassword('password');
    expect(result).toBeDefined();
  });
});
```

### 2. Integration Tests (API Endpoints)

```typescript
describe('Trip API', () => {
  useDatabaseHooks();

  it('should create trip successfully', async () => {
    const { user, token } = await UserFixtures.createAuthenticatedUser();

    const response = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(tripData)
      .expect(201);

    ApiTestHelpers.expectSuccessResponse(response, 201);
  });
});
```

### 3. Database Transaction Tests

```typescript
describe('Complex Scenarios', () => {
  it('should handle concurrent operations', async () => {
    await withTestTransaction(async (prisma) => {
      // Your test logic here
      // Transaction automatically rolls back
    });
  });
});
```

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run specific test file
bun test src/tests/examples/health-api.test.ts

# Run with debug output
DEBUG_TESTS=true bun test

# Run with coverage (if configured)
bun test --coverage
```

### Test Database Setup

The tests require a PostgreSQL test database. Update your `.env.test` file with appropriate connection details:

```bash
DATABASE_URL="postgresql://test_user:test_password@localhost:5432/group_planner_test"
```

**Important**: Tests automatically clean the database between test runs, so use a dedicated test database.

## 🔧 Development Workflow

### Adding New Tests

1. **Create test file**: `src/tests/your-feature.test.ts`
2. **Import utilities**:
   ```typescript
   import { useDatabaseHooks, UserFixtures, ApiTestHelpers } from './utils/index.js';
   ```
3. **Use database hooks**: `useDatabaseHooks();` for integration tests
4. **Follow naming conventions**: Descriptive test names with clear expectations

### Best Practices

#### ✅ Do:
- Use `useDatabaseHooks()` for tests that need database access
- Create test data with fixtures rather than hardcoded values
- Test both success and error scenarios
- Use descriptive test names that explain the expected behavior
- Clean up test data automatically with database hooks
- Mock external services and dependencies
- Test authentication/authorization scenarios

#### ❌ Don't:
- Rely on test execution order
- Leave test data in the database
- Test implementation details rather than behavior
- Skip error handling tests
- Use production database for testing
- Hardcode sensitive data in test files

## 📊 Test Coverage Areas

### ✅ Implemented Examples

1. **API Endpoint Testing**
   - Health endpoints with comprehensive checks
   - Authentication and authorization flows
   - CRUD operations with proper validation
   - Error handling and edge cases

2. **Service Layer Testing**
   - Password hashing and verification
   - JWT token generation and validation
   - User management operations
   - Mocking external dependencies

3. **Database Integration**
   - Complex query testing
   - Transaction handling
   - Data integrity verification
   - Concurrent operation testing

4. **Advanced Scenarios**
   - Complete workflow testing
   - Pagination and sorting
   - Search and filtering
   - Performance considerations

### 🎯 Testing Checklist

- [ ] Unit tests for service methods
- [ ] Integration tests for API endpoints
- [ ] Authentication/authorization testing
- [ ] Input validation testing
- [ ] Error handling and edge cases
- [ ] Database transaction integrity
- [ ] Performance and pagination
- [ ] Concurrent operation handling

## 🐛 Troubleshooting

### Common Issues

**Tests fail with JWT_SECRET error**
- Ensure `.env.test` file exists with proper JWT_SECRET
- Check test setup loads environment variables correctly

**Database connection issues**
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env.test`
- Ensure test database exists and is accessible

**Import errors in test files**
- Use `.js` extensions in imports (ESM requirement)
- Check file paths are correct relative to test files
- Verify test utilities are properly exported

**Timeout errors**
- Use `bun test --timeout 30000` for longer tests
- Check for unresolved promises in tests
- Ensure database operations complete properly

### Debug Mode

Enable debug output to troubleshoot test issues:

```bash
DEBUG_TESTS=true bun test
```

This provides:
- Database connection logs
- Test data creation details
- API request/response information

## 🎉 Success Metrics

The test setup provides:

- ✅ **Isolated Test Environment** - Each test runs in a clean database state
- ✅ **Comprehensive API Testing** - Full request/response cycle testing
- ✅ **Realistic Test Data** - Fixtures create valid, related test data
- ✅ **Error Scenario Coverage** - Authentication, validation, and edge cases
- ✅ **Performance Testing** - Pagination, sorting, and complex queries
- ✅ **Developer Experience** - Easy-to-use utilities and clear patterns
- ✅ **CI/CD Ready** - Environment-based configuration for different setups

## 📚 Additional Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Bun Testing Best Practices](https://bun.sh/guides/test/writing-tests)

---

**Testing Infrastructure Updated**: Backend test setup migrated to Bun Native Testing + Supertest + test DB with improved performance and simplified configuration. 🎯