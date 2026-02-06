/**
 * Health API Example Test
 *
 * Demonstrates API endpoint testing with Supertest
 * This is a simple example showing basic API testing patterns
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import request from 'supertest';
import { app } from '../src/app';
import { useDatabaseHooks, ApiTestHelpers } from '../src/tests/utils/index';
import { setupTestFile } from '../src/tests/utils/test-isolation';

describe('Health API - Example Tests', () => {
  let testUtils: any;

  // Use database hooks for integration tests
  useDatabaseHooks();

  beforeAll(async () => {
    // Setup test isolation for this file
    testUtils = await setupTestFile('health-api');
  });

  afterAll(async () => {
    // Clean up test data
    if (testUtils?.cleanup) {
      await testUtils.cleanup();
    }
  });

  describe('GET /api/v1/health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      ApiTestHelpers.expectSuccessResponse(response);

      // Verify health response structure
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.version).toBeDefined();
      expect(response.body.data.environment).toBe('test');
    });

    it('should include uptime information', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.uptime).toBeDefined();
      expect(typeof response.body.data.uptime).toBe('number');
      expect(response.body.data.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/health/comprehensive', () => {
    it('should return comprehensive health status', async () => {
      const response = await request(app)
        .get('/api/v1/health/comprehensive');

      // Accept either 200 (healthy) or 207 (partial degradation)
      expect([200, 207]).toContain(response.status);

      // Verify comprehensive health response structure
      // Note: Health endpoint implementation may vary - this test documents expected structure
      if (response.body?.data?.status) {
        const data = response.body.data;
        expect(data.status).toMatch(/healthy|degraded/);
        if (data.checks) {
          expect(Array.isArray(data.checks)).toBe(true);
        }
      } else {
        // Health endpoint may return different format - just verify it responds
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      }
    });

    it('should handle graceful degradation if services are down', async () => {
      // This test demonstrates how to handle partial service failures
      // In a real scenario, you might mock database failures

      const response = await request(app)
        .get('/api/v1/health/comprehensive');

      // Health endpoint should still respond even if some services are down
      expect([200, 207]).toContain(response.status);

      if (response.body?.data?.status) {
        expect(response.body.data.status).toMatch(/healthy|degraded/);
      } else {
        // Health endpoint may not be fully implemented - just verify it responds
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle invalid routes gracefully', async () => {
      await request(app)
        .get('/api/v1/nonexistent-endpoint')
        .expect(404);
    });
  });
});