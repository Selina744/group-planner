/**
 * Health check routes for Group Planner API
 *
 * This module provides health monitoring endpoints for system status,
 * database connectivity, and service availability checks.
 */

import express from 'express';
import { HealthController } from '../controllers/health.js';
import { wrapAsync } from '../utils/wrapAsync.js';
import { middleware } from '../middleware/index.js';

const router = express.Router();

/**
 * GET /health - Comprehensive health check
 */
router.get(
  '/',
  middleware.context,
  wrapAsync(HealthController.getHealth)
);

/**
 * GET /health/ready - Readiness probe
 */
router.get(
  '/ready',
  middleware.context,
  wrapAsync(HealthController.getReadiness)
);

/**
 * GET /health/live - Liveness probe
 */
router.get(
  '/live',
  middleware.context,
  wrapAsync(HealthController.getLiveness)
);

/**
 * GET /health/database - Database health check
 */
router.get(
  '/database',
  middleware.context,
  wrapAsync(HealthController.getDatabaseHealth)
);

/**
 * GET /health/version - Version information
 */
router.get(
  '/version',
  middleware.context,
  HealthController.getVersion
);

/**
 * GET /health/process - Process health and metrics
 */
router.get(
  '/process',
  middleware.context,
  wrapAsync(HealthController.getProcessHealth)
);

/**
 * GET /health/metrics - Process metrics only
 */
router.get(
  '/metrics',
  middleware.context,
  HealthController.getProcessMetrics
);

/**
 * GET /health/comprehensive - Complete health status
 */
router.get(
  '/comprehensive',
  middleware.context,
  wrapAsync(HealthController.getComprehensiveHealth)
);

/**
 * GET /ping - Simple ping endpoint
 */
router.get('/ping', middleware.context, HealthController.ping);

export default router;