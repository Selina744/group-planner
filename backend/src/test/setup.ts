/**
 * Simplified Test Setup - PostgreSQL with Centralized Database Management
 * Uses centralized test-prisma.ts for consistent database handling
 */

import { beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestPrisma, disconnectTestPrisma, cleanTestDatabase } from './test-prisma.js'

beforeAll(async () => {
  // Initialize test database connection
  const prisma = getTestPrisma()
  await prisma.$connect()
  console.log('📂 PostgreSQL test database ready')
})

afterAll(async () => {
  // Disconnect test database
  await disconnectTestPrisma()
  console.log('🧹 PostgreSQL test database cleaned up')
})

beforeEach(async () => {
  // Clean all data between tests using centralized cleanup
  try {
    await cleanTestDatabase()
    console.log('🧽 Test database cleaned between tests')
  } catch (error) {
    console.error('❌ Database cleanup failed:', error)
    throw error
  }
})