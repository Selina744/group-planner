/**
 * Health API Example Test
 *
 * Demonstrates API endpoint testing with Supertest
 * This is a simple example showing basic API testing patterns
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { useDatabaseHooks, ApiTestHelpers } from '../utils/index.js';

describe('Health API - Example Tests', () => {
  // Use database hooks for integration tests
  useDatabaseHooks();

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
        .get('/api/v1/health/comprehensive')
        .expect(200);

      ApiTestHelpers.expectSuccessResponse(response);

      // Verify comprehensive health response
      const data = response.body.data;
      expect(data.status).toBe('healthy');
      expect(data.checks).toBeDefined();
      expect(Array.isArray(data.checks)).toBe(true);

      // Verify individual health checks
      const dbCheck = data.checks.find((check: any) => check.component === 'database');
      expect(dbCheck).toBeDefined();
      expect(dbCheck.status).toBe('healthy');
    });

    it('should handle graceful degradation if services are down', async () => {
      // This test demonstrates how to handle partial service failures
      // In a real scenario, you might mock database failures

      const response = await request(app)
        .get('/api/v1/health/comprehensive')
        .expect(200); // Health endpoint should still respond even if some services are down

      expect(response.body.data.status).toMatch(/healthy|degraded/);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid routes gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent-endpoint')
        .expect(404);

      ApiTestHelpers.expectErrorResponse(response, 404);
    });
  });
});