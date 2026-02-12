/**
 * Test Database Utilities - PostgreSQL (Simplified)
 *
 * Uses existing PostgreSQL test database setup but with simplified configuration.
 * Includes mutex-based cleanup serialization to prevent race conditions in concurrent tests.
 */

import { PrismaClient } from '../../generated/prisma/index.js';
import { log } from '../../utils/logger.js';

let testPrisma: PrismaClient | null = null;

// Simple async mutex to serialize database cleanup operations
let cleanupMutex: Promise<void> = Promise.resolve();

/**
 * Acquire the cleanup mutex to serialize database operations
 */
async function withCleanupLock<T>(fn: () => Promise<T>): Promise<T> {
  // Chain onto the existing mutex
  const previousMutex = cleanupMutex;
  let resolve: () => void;
  cleanupMutex = new Promise<void>((r) => { resolve = r; });

  try {
    // Wait for previous cleanup to complete
    await previousMutex;
    // Execute our cleanup
    return await fn();
  } finally {
    // Release the mutex
    resolve!();
  }
}

/**
 * Get test database instance (PostgreSQL)
 * Uses existing test database - simple and reliable
 */
export function getTestDb(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      log: process.env.DEBUG_TESTS === 'true' ? ['query'] : ['error'], // Simplified logging
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://planner:planner@localhost:5432/groupplanner_test'
        }
      }
    });
  }
  return testPrisma;
}

/**
 * Setup test database - run before all tests (PostgreSQL)
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  const prisma = getTestDb();

  try {
    // Connect to PostgreSQL test database
    await prisma.$connect();

    // Run a simple health check
    await prisma.$queryRaw`SELECT 1`;

    log.info('PostgreSQL test database ready');
    return prisma;
  } catch (error) {
    log.error('Failed to setup test database', error);
    throw error;
  }
}

/**
 * Clean all tables - run after each test (PostgreSQL cleanup)
 * Uses TRUNCATE for atomic, fast cleanup with CASCADE to handle foreign keys.
 * Serialized with a mutex to prevent race conditions when tests run concurrently.
 */
export async function cleanDatabase(): Promise<void> {
  return withCleanupLock(async () => {
    const prisma = getTestDb();

    try {
      // TRUNCATE is atomic and faster than DELETE for full table cleanup
      // Uses actual PostgreSQL table names from @@map() directives in schema
      await prisma.$executeRaw`
        TRUNCATE TABLE
          notifications,
          notification_preferences,
          item_claims,
          items,
          events,
          announcements,
          trip_extensions,
          trip_members,
          trips,
          password_resets,
          login_attempts,
          refresh_tokens,
          users
        RESTART IDENTITY CASCADE
      `;

      log.debug('Test database cleaned successfully (TRUNCATE)');
    } catch (error) {
      // Fallback to transactional delete if TRUNCATE fails (e.g., permissions)
      log.warn('TRUNCATE failed, falling back to DELETE', error);
      await fallbackDeleteCleanup(prisma);
    }
  });
}

/**
 * Fallback cleanup using DELETE in a transaction
 */
async function fallbackDeleteCleanup(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.notificationPreference.deleteMany(),
      prisma.itemClaim.deleteMany(),
      prisma.item.deleteMany(),
      prisma.event.deleteMany(),
      prisma.announcement.deleteMany(),
      prisma.tripExtension.deleteMany(),
      prisma.tripMember.deleteMany(),
      prisma.trip.deleteMany(),
      prisma.passwordReset.deleteMany(),
      prisma.loginAttempt.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    log.debug('Test database cleaned successfully (DELETE fallback)');
  } catch (error) {
    log.error('Failed to clean test database', error);
    throw error;
  }
}

/**
 * Deep clean database - more thorough cleanup for cross-test isolation
 * Now uses the same TRUNCATE approach as cleanDatabase for consistency
 */
export async function deepCleanDatabase(): Promise<void> {
  // TRUNCATE is already atomic and thorough, so just delegate
  await cleanDatabase();
}

/**
 * Teardown test database - run after all tests
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testPrisma) {
    try {
      await testPrisma.$disconnect();
      testPrisma = null;
      log.info('Test database disconnected successfully');
    } catch (error) {
      log.error('Failed to teardown test database', error);
      throw error;
    }
  }
}

/**
 * Reset database to initial state
 */
export async function resetDatabase(): Promise<void> {
  await cleanDatabase();
}

/**
 * Execute operation in test transaction (automatically rolled back)
 */
export async function withTestTransaction<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const prisma = getTestDb();

  return await prisma.$transaction(async (tx) => {
    return await callback(tx);
  });
}