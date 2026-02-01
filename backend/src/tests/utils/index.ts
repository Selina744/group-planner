/**
 * Test Utilities Index
 *
 * Central exports for all test utilities
 */

// Database utilities
export {
  getTestDb,
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
  resetDatabase,
  withTestTransaction
} from './test-database.js';

// Test fixtures
export {
  UserFixtures,
  TripFixtures,
  EventFixtures,
  ItemFixtures,
  ScenarioFixtures
} from './test-fixtures.js';

// Test helpers
export {
  setupTestEnvironment,
  useDatabaseHooks,
  createMockRequest,
  createMockResponse,
  createMockNext,
  ApiTestHelpers,
  expectAsyncError,
  mockConsole,
  TimeHelpers,
  ValidationHelpers
} from './test-helpers.js';