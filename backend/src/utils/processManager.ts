/**
 * Process management utilities for Group Planner API
 *
 * Provides process monitoring, health checks, and resource management
 * for production deployments and development environments.
 */

import { log } from './logger.js';
import type { GroupPlannerServer } from '../server.js';

/**
 * Process metrics interface
 */
export interface ProcessMetrics {
  pid: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  version: string;
  platform: string;
  arch: string;
  nodeVersion: string;
}

/**
 * Process health status
 */
export interface ProcessHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHealthCheck: Date;
  issues: string[];
}

/**
 * Process manager configuration
 */
interface ProcessManagerConfig {
  healthCheckInterval: number;
  memoryThreshold: number; // MB
  cpuThreshold: number; // Percentage
  maxRestarts: number;
  enableMetricsCollection: boolean;
  enableAutoRestart: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ProcessManagerConfig = {
  healthCheckInterval: 30000, // 30 seconds
  memoryThreshold: 512, // 512 MB
  cpuThreshold: 80, // 80%
  maxRestarts: 3,
  enableMetricsCollection: process.env.NODE_ENV === 'production',
  enableAutoRestart: process.env.NODE_ENV === 'production',
};

/**
 * Process manager singleton
 */
export class ProcessManager {
  private static instance: ProcessManager | null = null;
  private static server: GroupPlannerServer | null = null;

  private config: ProcessManagerConfig;
  private startTime: Date;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private memoryPressureTimer: NodeJS.Timeout | null = null;
  private metrics: ProcessMetrics[] = [];
  private restartCount = 0;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;

  private constructor(config: Partial<ProcessManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();
    this.setupProcessHandlers();
    this.startHealthChecks();

    log.info('Process manager initialized', {
      pid: process.pid,
      config: this.config,
    });
  }

  /**
   * Get or create process manager instance
   */
  static getInstance(config?: Partial<ProcessManagerConfig>): ProcessManager {
    if (!this.instance) {
      this.instance = new ProcessManager(config);
    }
    return this.instance;
  }

  /**
   * Register server instance
   */
  static registerServer(server: GroupPlannerServer): void {
    this.server = server;
    this.getInstance(); // Ensure process manager is initialized
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    // Monitor process warnings
    process.on('warning', (warning) => {
      log.warn('Process warning', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
      });
    });

    // Monitor memory pressure (if available)
    if (process.memoryUsage().rss) {
      this.memoryPressureTimer = setInterval(() => {
        this.checkMemoryPressure();
      }, 60000); // Check every minute
    }

    // Setup exit handlers
    process.on('beforeExit', (code) => {
      log.info('Process beforeExit', { code });
    });

    process.on('exit', (code) => {
      log.info('Process exit', { code });
      this.cleanup();
    });
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (!this.config.enableMetricsCollection) {
      return;
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    log.debug('Health checks started', {
      interval: this.config.healthCheckInterval,
    });
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    try {
      const metrics = this.collectMetrics();
      const health = this.analyzeHealth(metrics);

      // Store metrics (keep last 50 entries)
      this.metrics.push(metrics);
      if (this.metrics.length > 50) {
        this.metrics.shift();
      }

      // Log health status if degraded or unhealthy
      if (health.status !== 'healthy') {
        log.warn('Process health degraded', health);

        // Auto-restart if configured and conditions are met
        if (
          this.config.enableAutoRestart &&
          health.status === 'unhealthy' &&
          this.restartCount < this.config.maxRestarts
        ) {
          this.attemptRestart();
        }
      }
    } catch (error) {
      log.error('Health check failed', error);
    }
  }

  /**
   * Collect process metrics
   */
  collectMetrics(): ProcessMetrics {
    const memUsage = process.memoryUsage();
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    return {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: memUsage,
      cpuUsage: currentCpuUsage,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
    };
  }

  /**
   * Analyze process health
   */
  private analyzeHealth(metrics: ProcessMetrics): ProcessHealth {
    const issues: string[] = [];
    let status: ProcessHealth['status'] = 'healthy';

    // Check memory usage
    const memoryMB = metrics.memoryUsage.rss / 1024 / 1024;
    if (memoryMB > this.config.memoryThreshold) {
      issues.push(`High memory usage: ${memoryMB.toFixed(2)}MB`);
      status = memoryMB > this.config.memoryThreshold * 1.5 ? 'unhealthy' : 'degraded';
    }

    // Check CPU usage (simplified calculation)
    const totalCpuTime = metrics.cpuUsage.user + metrics.cpuUsage.system;
    const cpuPercent = (totalCpuTime / 1000000) / metrics.uptime * 100;

    if (cpuPercent > this.config.cpuThreshold) {
      issues.push(`High CPU usage: ${cpuPercent.toFixed(2)}%`);
      if (status === 'healthy') {
        status = 'degraded';
      }
    }

    // Check uptime and restart count
    if (this.restartCount >= this.config.maxRestarts) {
      issues.push(`Maximum restarts reached: ${this.restartCount}`);
      status = 'unhealthy';
    }

    return {
      status,
      uptime: metrics.uptime,
      memoryUsage: memoryMB,
      cpuUsage: cpuPercent,
      lastHealthCheck: new Date(),
      issues,
    };
  }

  /**
   * Check for memory pressure
   */
  private checkMemoryPressure(): void {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed / 1024 / 1024;
    const heapTotal = usage.heapTotal / 1024 / 1024;
    const external = usage.external / 1024 / 1024;

    // Log memory pressure warning
    if (heapUsed / heapTotal > 0.9) {
      log.warn('High heap usage detected', {
        heapUsed: `${heapUsed.toFixed(2)}MB`,
        heapTotal: `${heapTotal.toFixed(2)}MB`,
        external: `${external.toFixed(2)}MB`,
        percentage: `${((heapUsed / heapTotal) * 100).toFixed(1)}%`,
      });

      // Force garbage collection if available
      if (global.gc) {
        log.info('Running garbage collection...');
        global.gc();
      }
    }
  }

  /**
   * Attempt process restart
   */
  private attemptRestart(): void {
    this.restartCount++;

    log.warn('Attempting process restart', {
      restartCount: this.restartCount,
      maxRestarts: this.config.maxRestarts,
    });

    if (ProcessManager.server) {
      ProcessManager.server.forceShutdown().catch((error) => {
        log.error('Failed to shutdown server during restart', error);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  }

  /**
   * Get current process health
   */
  getHealth(): ProcessHealth {
    const metrics = this.collectMetrics();
    return this.analyzeHealth(metrics);
  }

  /**
   * Get process metrics
   */
  getMetrics(): ProcessMetrics {
    return this.collectMetrics();
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics(): ProcessMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get process information
   */
  getProcessInfo() {
    const metrics = this.collectMetrics();
    const health = this.analyzeHealth(metrics);

    return {
      pid: process.pid,
      startTime: this.startTime,
      uptime: process.uptime(),
      restartCount: this.restartCount,
      metrics,
      health,
      config: this.config,
      environment: {
        nodeVersion: process.versions.node,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV,
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ProcessManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart health checks if interval changed
    if (newConfig.healthCheckInterval && this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.startHealthChecks();
    }

    log.info('Process manager configuration updated', {
      config: this.config,
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.memoryPressureTimer) {
      clearInterval(this.memoryPressureTimer);
      this.memoryPressureTimer = null;
    }

    log.info('Process manager cleaned up');
  }

  /**
   * Static method to get process information
   */
  static getProcessInfo() {
    return ProcessManager.getInstance().getProcessInfo();
  }

  /**
   * Static method to get health status
   */
  static getHealth() {
    return ProcessManager.getInstance().getHealth();
  }

  /**
   * Static method to get metrics
   */
  static getMetrics() {
    return ProcessManager.getInstance().getMetrics();
  }
}