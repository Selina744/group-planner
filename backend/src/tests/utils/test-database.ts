/**
 * Test Database Utilities - PostgreSQL (Simplified)
 *
 * Uses existing PostgreSQL test database setup but with simplified configuration
 */

import { PrismaClient } from '../../generated/prisma/index.js';
import { log } from '../../utils/logger.js';

let testPrisma: PrismaClient | null = null;

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
          url: process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/group_planner_test'
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
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getTestDb();

  try {
    // Delete in reverse dependency order with explicit cleanup
    await prisma.itemClaim.deleteMany();
    await prisma.item.deleteMany();
    await prisma.event.deleteMany();
    await prisma.tripMember.deleteMany();
    await prisma.trip.deleteMany();

    // Clean authentication-related tables thoroughly
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    log.debug('Test database cleaned successfully');
  } catch (error) {
    log.error('Failed to clean test database', error);
    throw error;
  }
}

/**
 * Deep clean database - more thorough cleanup for cross-test isolation
 */
export async function deepCleanDatabase(): Promise<void> {
  const prisma = getTestDb();

  try {
    // More thorough cleanup - delete in multiple passes to handle race conditions
    for (let i = 0; i < 2; i++) {
      await prisma.itemClaim.deleteMany();
      await prisma.item.deleteMany();
      await prisma.event.deleteMany();
      await prisma.tripMember.deleteMany();
      await prisma.trip.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();

      // Small delay between passes to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    log.debug('Deep database cleanup completed');
  } catch (error) {
    log.error('Failed to perform deep database cleanup', error);
    // Fallback to regular cleanup
    await cleanDatabase();
  }
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