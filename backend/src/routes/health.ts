/**
 * Health check routes for Group Planner API
 *
 * This module provides health monitoring endpoints for system status,
 * database connectivity, and service availability checks.
 */

import express from 'express';
import { HealthController } from '../controllers/health.js';
import { wrapAsync } from '../utils/wrapAsync.js';
import { middleware, type AuthenticatedRequest } from '../middleware/index.js';

const router: express.Router = express.Router();

/**
 * GET /health - Comprehensive health check
 */
router.get(
  '/',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(HealthController.getHealth) as any
);

/**
 * GET /health/ready - Readiness probe
 */
router.get(
  '/ready',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(HealthController.getReadiness) as any
);

/**
 * GET /health/live - Liveness probe
 */
router.get(
  '/live',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(HealthController.getLiveness) as any
);

/**
 * GET /health/database - Database health check
 */
router.get(
  '/database',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(HealthController.getDatabaseHealth) as any
);

/**
 * GET /health/version - Version information
 */
router.get(
  '/version',
  middleware.context as any,
  HealthController.getVersion as any
);

/**
 * GET /health/process - Process health and metrics
 */
router.get(
  '/process',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(HealthController.getProcessHealth) as any
);

/**
 * GET /health/metrics - Process metrics only
 */
router.get(
  '/metrics',
  middleware.context as any,
  HealthController.getProcessMetrics as any
);

/**
 * GET /health/comprehensive - Complete health status
 */
router.get(
  '/comprehensive',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(HealthController.getComprehensiveHealth) as any
);

/**
 * GET /ping - Simple ping endpoint
 */
router.get('/ping', middleware.context as any, HealthController.ping as any);

export default router;