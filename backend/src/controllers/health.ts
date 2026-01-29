/**
 * Health controller for Group Planner API
 *
 * This controller provides health check endpoints for monitoring
 * system status, database connectivity, and overall service health.
 */

import type { Response } from 'express';
import { HealthService } from '../services/health.js';
import { ProcessManager } from '../utils/processManager.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { log } from '../utils/logger.js';
import type { AuthenticatedRequest } from '../types/middleware.js';

/**
 * Health controller class
 */
export class HealthController {
  /**
   * GET /health - Comprehensive health check
   */
  static async getHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const healthResult = await HealthService.performHealthCheck(req);

      // Determine HTTP status code based on health status
      let statusCode = 200;
      if (healthResult.status === 'degraded') {
        statusCode = 207; // Multi-Status
      } else if (healthResult.status === 'unhealthy') {
        statusCode = 503; // Service Unavailable
      }

      res.status(statusCode).json({
        success: true,
        message: `Service is ${healthResult.status}`,
        data: healthResult,
        requestId: req.requestId,
        timestamp: healthResult.timestamp,
      });
    } catch (error) {
      log.error('Health check endpoint failed', error, {
        requestId: req.requestId,
      });

      ApiResponse.error(res, 'Health check failed', 503);
    }
  }

  /**
   * GET /health/ready - Readiness probe
   *
   * Simple endpoint for Kubernetes readiness probes or load balancer checks
   */
  static async getReadiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const quickCheck = await HealthService.quickHealthCheck();

      if (quickCheck.status === 'healthy') {
        res.status(200).json({
          status: 'ready',
          message: quickCheck.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          message: quickCheck.message,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      log.error('Readiness probe failed', error, {
        requestId: req.requestId,
      });

      res.status(503).json({
        status: 'not_ready',
        message: 'Readiness check failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /health/live - Liveness probe
   *
   * Simple endpoint for Kubernetes liveness probes
   */
  static async getLiveness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Liveness just checks if the process is running and responsive
      const serverInfo = HealthService.getServerInfo();

      res.status(200).json({
        status: 'alive',
        message: 'Service is alive and responsive',
        ...serverInfo,
      });
    } catch (error) {
      log.error('Liveness probe failed', error, {
        requestId: req.requestId,
      });

      res.status(500).json({
        status: 'dead',
        message: 'Service is not responsive',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /health/database - Database-specific health check
   */
  static async getDatabaseHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const databaseHealth = await HealthService.checkDatabase();

      const statusCode = databaseHealth.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: databaseHealth.status === 'healthy',
        message: databaseHealth.message,
        data: {
          status: databaseHealth.status,
          responseTime: databaseHealth.responseTime,
          details: databaseHealth.details,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error('Database health check failed', error, {
        requestId: req.requestId,
      });

      ApiResponse.error(res, 'Database health check failed', 503);
    }
  }

  /**
   * GET /health/version - Version and build information
   */
  static getVersion(req: AuthenticatedRequest, res: Response): void {
    try {
      const serverInfo = HealthService.getServerInfo();

      ApiResponse.success(res, 'Version information retrieved', {
        ...serverInfo,
        build: {
          timestamp: process.env.BUILD_TIMESTAMP || 'unknown',
          commit: process.env.GIT_COMMIT || 'unknown',
          branch: process.env.GIT_BRANCH || 'unknown',
        },
        runtime: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
        },
      });
    } catch (error) {
      log.error('Version endpoint failed', error, {
        requestId: req.requestId,
      });

      ApiResponse.error(res, 'Version information unavailable', 500);
    }
  }

  /**
   * GET /health/process - Process health and metrics
   */
  static async getProcessHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const processInfo = ProcessManager.getProcessInfo();
      const statusCode = processInfo.health.status === 'healthy' ? 200 :
                        processInfo.health.status === 'degraded' ? 207 : 503;

      res.status(statusCode).json({
        success: processInfo.health.status !== 'unhealthy',
        message: `Process is ${processInfo.health.status}`,
        data: {
          health: processInfo.health,
          metrics: processInfo.metrics,
          uptime: processInfo.uptime,
          restartCount: processInfo.restartCount,
          environment: processInfo.environment,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error('Process health check failed', error, {
        requestId: req.requestId,
      });

      ApiResponse.error(res, 'Process health check failed', 500);
    }
  }

  /**
   * GET /health/metrics - Process metrics only
   */
  static getProcessMetrics(req: AuthenticatedRequest, res: Response): void {
    try {
      const metrics = ProcessManager.getMetrics();
      // Historical metrics not implemented yet
      // const historicalMetrics = ProcessManager.getHistoricalMetrics();

      ApiResponse.success(res, 'Process metrics retrieved', {
        current: metrics,
        // historical: historicalMetrics.slice(-10), // Last 10 entries
        summary: {
          uptimeSeconds: metrics.uptime,
          memoryUsageMB: metrics.memoryUsage.rss / 1024 / 1024,
          cpuUsage: metrics.cpuUsage,
        },
      });
    } catch (error) {
      log.error('Process metrics endpoint failed', error, {
        requestId: req.requestId,
      });

      ApiResponse.error(res, 'Process metrics unavailable', 500);
    }
  }

  /**
   * GET /health/comprehensive - Complete health status including process and services
   */
  static async getComprehensiveHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Get all health information
      const [healthResult, processInfo, databaseHealth] = await Promise.all([
        HealthService.performHealthCheck(req),
        Promise.resolve(ProcessManager.getProcessInfo()),
        HealthService.checkDatabase(),
      ]);

      // Determine overall health status
      const statuses = [
        healthResult.status,
        processInfo.health.status,
        databaseHealth.status,
      ];

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (statuses.includes('unhealthy')) {
        overallStatus = 'unhealthy';
      } else if (statuses.includes('degraded')) {
        overallStatus = 'degraded';
      }

      const statusCode = overallStatus === 'healthy' ? 200 :
                        overallStatus === 'degraded' ? 207 : 503;

      res.status(statusCode).json({
        success: overallStatus !== 'unhealthy',
        message: `Service is ${overallStatus}`,
        data: {
          overall: {
            status: overallStatus,
            timestamp: new Date().toISOString(),
          },
          application: healthResult,
          process: {
            health: processInfo.health,
            metrics: processInfo.metrics,
            uptime: processInfo.uptime,
          },
          database: databaseHealth,
          environment: processInfo.environment,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error('Comprehensive health check failed', error, {
        requestId: req.requestId,
      });

      ApiResponse.error(res, 'Comprehensive health check failed', 503);
    }
  }

  /**
   * GET /ping - Simple ping endpoint
   */
  static ping(req: AuthenticatedRequest, res: Response): void {
    res.status(200).json({
      message: 'pong',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }
}