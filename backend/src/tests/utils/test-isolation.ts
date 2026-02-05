/**
 * Test Isolation Utilities
 *
 * Provides utilities for better test isolation across files
 */

import { cleanDatabase, deepCleanDatabase } from './test-database.js';

/**
 * Generate unique test identifiers for each test file
 */
export function generateTestFileId(): string {
  const timestamp = Date.now().toString().slice(-6); // Use last 6 digits of timestamp
  const random = Math.random().toString(36).substring(2, 5); // 3 random chars
  const processId = process.pid.toString().slice(-2); // 2 digits of process ID
  return `${timestamp}${random}${processId}`;
}

/**
 * Create unique user data for a specific test file
 */
export function createUniqueTestUser(fileId: string, baseName = 'test') {
  // Keep username under 20 chars: baseName (4) + fileId (9) = 13 chars max
  const shortBaseName = baseName.substring(0, 4);
  return {
    email: `${shortBaseName}${fileId}@example.com`,
    username: `${shortBaseName}${fileId}`,
    password: 'StrongPassword123!',
    displayName: `Test User ${fileId}`,
  };
}

/**
 * Setup test file with proper isolation
 */
export async function setupTestFile(fileName: string) {
  const fileId = generateTestFileId();

  // Perform deep clean before starting this test file
  await deepCleanDatabase();

  return {
    fileId,
    createUser: (baseName?: string) => createUniqueTestUser(fileId, baseName),
    cleanup: async () => {
      try {
        await deepCleanDatabase();
      } catch (error) {
        console.warn(`Cleanup failed for test file ${fileName}:`, error);
      }
    }
  };
}

/**
 * Test file wrapper that ensures proper setup and cleanup
 */
export function withTestIsolation(fileName: string, testFn: (utils: any) => void) {
  let testUtils: any;

  beforeAll(async () => {
    testUtils = await setupTestFile(fileName);
  });

  afterAll(async () => {
    if (testUtils?.cleanup) {
      await testUtils.cleanup();
    }
  });

  testFn(testUtils);
}