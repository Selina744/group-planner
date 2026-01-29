/**
 * Health check service for Group Planner API
 *
 * This service provides comprehensive health monitoring including
 * database connectivity, memory usage, and system status checks.
 */

import { prisma } from '../lib/prisma.js';
import { log } from '../utils/logger.js';
import type { AuthenticatedRequest } from '../types/middleware.js';

/**
 * Health status types
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Individual service health check result
 */
export interface ServiceHealth {
  status: HealthStatus;
  message: string;
  responseTime?: number | undefined;
  details?: Record<string, unknown> | undefined;
}

/**
 * Overall health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    memory: ServiceHealth;
    disk?: ServiceHealth | undefined;
  };
  metadata: {
    nodeVersion: string;
    platform: string;
    requestId?: string | undefined;
    pid: number;
  };
}

/**
 * Health check service
 */
export class HealthService {
  /**
   * Check database connectivity
   */
  static async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Test basic database connectivity
      await prisma.$queryRaw`SELECT 1`;

      // Test a simple query to ensure database is functional
      const userCount = await prisma.user.count();

      const responseTime = Date.now() - startTime;

      log.debug('Database health check completed', {
        responseTime,
        userCount,
      });

      return {
        status: 'healthy',
        message: 'Database is accessible and functional',
        responseTime,
        details: {
          userCount,
          connection: 'active',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      log.error('Database health check failed', error, {
        responseTime,
      });

      return {
        status: 'unhealthy',
        message: 'Database connectivity issues',
        responseTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connection: 'failed',
        },
      };
    }
  }

  /**
   * Check memory usage
   */
  static checkMemory(): ServiceHealth {
    try {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      };

      // Memory thresholds (MB)
      const WARNING_THRESHOLD = 512;  // 512MB
      const CRITICAL_THRESHOLD = 1024; // 1GB

      let status: HealthStatus = 'healthy';
      let message = 'Memory usage is normal';

      if (memUsageMB.heapUsed > CRITICAL_THRESHOLD) {
        status = 'unhealthy';
        message = 'High memory usage detected';
      } else if (memUsageMB.heapUsed > WARNING_THRESHOLD) {
        status = 'degraded';
        message = 'Elevated memory usage';
      }

      return {
        status,
        message,
        details: {
          ...memUsageMB,
          unit: 'MB',
          thresholds: {
            warning: WARNING_THRESHOLD,
            critical: CRITICAL_THRESHOLD,
          },
        },
      };
    } catch (error) {
      log.error('Memory health check failed', error);

      return {
        status: 'unhealthy',
        message: 'Failed to check memory usage',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(req?: AuthenticatedRequest): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // Run all health checks concurrently
    const [databaseHealth, memoryHealth] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(this.checkMemory()),
    ]);

    // Determine overall status
    const services = { database: databaseHealth, memory: memoryHealth };
    const overallStatus = this.determineOverallStatus(services);

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        requestId: req?.requestId,
        pid: process.pid,
      },
    };

    const totalResponseTime = Date.now() - startTime;

    log.debug('Health check completed', {
      status: overallStatus,
      responseTime: totalResponseTime,
      requestId: req?.requestId,
    });

    return result;
  }

  /**
   * Determine overall health status from individual services
   */
  private static determineOverallStatus(services: Record<string, ServiceHealth>): HealthStatus {
    const statuses = Object.values(services).map(service => service.status);

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Quick health check for readiness probe
   */
  static async quickHealthCheck(): Promise<{ status: HealthStatus; message: string }> {
    try {
      // Just test database connectivity quickly
      await prisma.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        message: 'Service is ready',
      };
    } catch (error) {
      log.error('Quick health check failed', error);

      return {
        status: 'unhealthy',
        message: 'Service is not ready',
      };
    }
  }

  /**
   * Get basic server info
   */
  static getServerInfo(): {
    version: string;
    environment: string;
    uptime: number;
    timestamp: string;
  } {
    return {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Initialize health monitoring
   */
  static initialize(): void {
    // Log initial system info
    log.info('Health monitoring initialized', {
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV,
      pid: process.pid,
    });

    // Set up periodic health logging (every 5 minutes in production)
    if (process.env.NODE_ENV === 'production') {
      setInterval(async () => {
        try {
          const health = await this.performHealthCheck();
          log.info('Periodic health check', {
            status: health.status,
            uptime: health.uptime,
            memoryUsage: health.services.memory.details,
          });
        } catch (error) {
          log.error('Periodic health check failed', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  }
}