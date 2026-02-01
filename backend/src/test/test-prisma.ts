/**
 * Centralized Test Database Instance
 *
 * This ensures all tests use the same database instance and configuration.
 * Import this instead of '../lib/prisma.js' in test files.
 */

import { PrismaClient } from '../generated/prisma/index.js'

// Singleton test database instance
let testPrismaInstance: PrismaClient | null = null

export function getTestPrisma(): PrismaClient {
  if (!testPrismaInstance) {
    testPrismaInstance = new PrismaClient({
      log: process.env.DEBUG_TESTS === 'true' ? ['query', 'info'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/group_planner_test'
        }
      }
    })
  }
  return testPrismaInstance
}

// Export as default prisma instance for easy test imports
export const prisma = getTestPrisma()

// Cleanup function for test teardown
export async function disconnectTestPrisma() {
  if (testPrismaInstance) {
    await testPrismaInstance.$disconnect()
    testPrismaInstance = null
  }
}

// Database cleanup function for between tests
export async function cleanTestDatabase() {
  const prisma = getTestPrisma()

  // Clean in reverse dependency order to avoid foreign key constraint errors
  await prisma.itemClaim.deleteMany()
  await prisma.item.deleteMany()
  await prisma.event.deleteMany()
  await prisma.tripMember.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.user.deleteMany()
}