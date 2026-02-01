/**
 * Simplified Test Setup - PostgreSQL
 * Uses existing test database setup for reliability
 */

import { beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '../tests/utils/test-database.js'
import { PrismaClient } from '../generated/prisma/index.js'

let testPrisma: PrismaClient

beforeAll(async () => {
  // Setup PostgreSQL test database
  testPrisma = await setupTestDatabase()
  console.log('📂 PostgreSQL test database ready')
})

afterAll(async () => {
  // Cleanup PostgreSQL connection
  await teardownTestDatabase()
  console.log('🧹 PostgreSQL test database cleaned up')
})

beforeEach(async () => {
  // Clean all data between tests
  await cleanDatabase()
})

// Export test database instance for test files
export { testPrisma }