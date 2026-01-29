/**
 * Server entry point for Group Planner API
 *
 * Handles server startup, graceful shutdown, and process management
 * with proper error handling and resource cleanup.
 */

import { createServer, type Server } from 'http';
import { app, getAppConfig, initializeServices, shutdownServices } from './app.js';
import { log } from './utils/logger.js';
import { ProcessManager } from './utils/processManager.js';

/**
 * Server configuration interface
 */
interface ServerConfig {
  port: number;
  host: string;
  environment: string;
  gracefulShutdownTimeout: number;
  keepAliveTimeout: number;
  headersTimeout: number;
}

/**
 * Server instance and state management
 */
class GroupPlannerServer {
  private server: Server | null = null;
  private isShuttingDown = false;
  private connections = new Set<import('net').Socket>();
  private config: ServerConfig;

  constructor() {
    const appConfig = getAppConfig();
    this.config = {
      port: appConfig.port,
      host: appConfig.host,
      environment: appConfig.environment,
      gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '30000', 10),
      keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '65000', 10),
      headersTimeout: parseInt(process.env.HEADERS_TIMEOUT || '66000', 10),
    };
  }

  /**
   * Start the server with proper initialization
   */
  async start(): Promise<void> {
    try {
      log.info('Starting Group Planner API server...', {
        environment: this.config.environment,
        port: this.config.port,
        host: this.config.host,
      });

      // Initialize application services
      await initializeServices();

      // Create HTTP server
      this.server = createServer(app);

      // Configure server timeouts
      this.server.keepAliveTimeout = this.config.keepAliveTimeout;
      this.server.headersTimeout = this.config.headersTimeout;

      // Track connections for graceful shutdown
      this.server.on('connection', (socket) => {
        this.connections.add(socket);
        socket.on('close', () => {
          this.connections.delete(socket);
        });
      });

      // Handle server errors
      this.server.on('error', this.handleServerError.bind(this));

      // Setup graceful shutdown handlers
      this.setupGracefulShutdown();

      // Start listening
      await this.listen();

      log.info('Group Planner API server started successfully', {
        port: this.config.port,
        host: this.config.host,
        environment: this.config.environment,
        processId: process.pid,
      });

      // Register with process manager
      ProcessManager.registerServer(this);

    } catch (error) {
      log.error('Failed to start server', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Start listening on configured port and host
   */
  private listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        return reject(new Error('Server not created'));
      }

      this.server.listen(this.config.port, this.config.host, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Handle server errors
   */
  private handleServerError(error: Error & { code?: string }): void {
    if (error.code === 'EADDRINUSE') {
      log.error(`Port ${this.config.port} is already in use`, error);
    } else if (error.code === 'EACCES') {
      log.error(`Permission denied for port ${this.config.port}`, error);
    } else {
      log.error('Server error', error);
    }

    process.exit(1);
  }

  /**
   * Setup graceful shutdown signal handlers
   */
  private setupGracefulShutdown(): void {
    // Handle termination signals
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach((signal) => {
      process.on(signal, () => {
        log.info(`Received ${signal}, initiating graceful shutdown...`);
        this.gracefulShutdown().catch((error) => {
          log.error('Error during graceful shutdown', error);
          process.exit(1);
        });
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      log.error('Uncaught Exception', error);
      this.gracefulShutdown().catch(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled Rejection', {
        reason,
        promise: promise.toString(),
      });
      this.gracefulShutdown().catch(() => {
        process.exit(1);
      });
    });
  }

  /**
   * Perform graceful shutdown
   */
  async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      log.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    const shutdownStart = Date.now();

    log.info('Initiating graceful shutdown...', {
      activeConnections: this.connections.size,
    });

    try {
      // Set shutdown timeout
      const shutdownTimeout = setTimeout(() => {
        log.error('Graceful shutdown timeout reached, forcing exit');
        process.exit(1);
      }, this.config.gracefulShutdownTimeout);

      // Stop accepting new connections
      await this.stopServer();

      // Close existing connections
      await this.closeConnections();

      // Shutdown application services
      await shutdownServices();

      // Clear shutdown timeout
      clearTimeout(shutdownTimeout);

      const shutdownTime = Date.now() - shutdownStart;
      log.info('Graceful shutdown completed', {
        shutdownTime: `${shutdownTime}ms`,
      });

      process.exit(0);
    } catch (error) {
      log.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  }

  /**
   * Stop the HTTP server
   */
  private stopServer(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        return resolve();
      }

      this.server.close((error) => {
        if (error) {
          log.error('Error closing server', error);
        } else {
          log.info('HTTP server closed');
        }
        resolve();
      });
    });
  }

  /**
   * Close all active connections
   */
  private closeConnections(): Promise<void> {
    return new Promise((resolve) => {
      if (this.connections.size === 0) {
        return resolve();
      }

      log.info(`Closing ${this.connections.size} active connections...`);

      let closedConnections = 0;
      const totalConnections = this.connections.size;

      // Set timeout for forceful connection closure
      const forceCloseTimeout = setTimeout(() => {
        log.warn('Forcing connection closure');
        this.connections.forEach((socket) => {
          socket.destroy();
        });
        resolve();
      }, 10000); // 10 seconds

      this.connections.forEach((socket) => {
        socket.end(() => {
          closedConnections++;
          if (closedConnections === totalConnections) {
            clearTimeout(forceCloseTimeout);
            log.info('All connections closed gracefully');
            resolve();
          }
        });

        // Destroy the socket if it doesn't close within 5 seconds
        setTimeout(() => {
          if (!socket.destroyed) {
            socket.destroy();
          }
        }, 5000);
      });
    });
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: !!this.server && this.server.listening,
      isShuttingDown: this.isShuttingDown,
      activeConnections: this.connections.size,
      config: this.config,
      address: this.server?.address(),
    };
  }

  /**
   * Force shutdown (for emergency cases)
   */
  async forceShutdown(): Promise<void> {
    log.warn('Force shutdown initiated');

    if (this.server) {
      this.connections.forEach((socket) => {
        socket.destroy();
      });
      this.server.close();
    }

    try {
      await shutdownServices();
    } catch (error) {
      log.error('Error during force shutdown', error);
    }

    process.exit(1);
  }

  /**
   * Graceful shutdown method (for external calls)
   */
  async shutdown(): Promise<void> {
    return this.gracefulShutdown();
  }
}

/**
 * Start the server if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new GroupPlannerServer();
  server.start().catch((error) => {
    log.error('Failed to start server', error);
    process.exit(1);
  });
}

export { GroupPlannerServer };