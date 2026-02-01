/**
 * Test Database Utilities
 *
 * Provides database setup, cleanup, and management utilities for tests
 */

import { PrismaClient } from '../../generated/prisma/index.js';
import { log } from '../../utils/logger.js';

let testPrisma: PrismaClient | null = null;

/**
 * Get test database instance
 */
export function getTestDb(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      log: process.env.DEBUG_TESTS === 'true' ? ['query', 'info', 'warn', 'error'] : ['error'],
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
 * Setup test database - run before all tests
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  const prisma = getTestDb();

  try {
    // Connect to database
    await prisma.$connect();

    // Run a simple health check
    await prisma.$queryRaw`SELECT 1`;

    log.info('Test database connected successfully');
    return prisma;
  } catch (error) {
    log.error('Failed to setup test database', error);
    throw error;
  }
}

/**
 * Clean all tables - run after each test
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getTestDb();

  try {
    // Delete in reverse dependency order
    await prisma.item.deleteMany();
    await prisma.event.deleteMany();
    await prisma.tripMember.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();

    log.debug('Test database cleaned successfully');
  } catch (error) {
    log.error('Failed to clean test database', error);
    throw error;
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