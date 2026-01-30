/**
 * Prisma client configuration and utilities for Group Planner API
 *
 * This module provides a centralized Prisma client instance with proper
 * configuration for development and production environments.
 */

import { PrismaClient } from '../generated/prisma/index.js';
import { log } from '../utils/logger.js';

/**
 * Extended Prisma client with enhanced logging and error handling
 */
class ExtendedPrismaClient extends PrismaClient {
  constructor() {
    // Use stdout logging for simplicity with Prisma v6
    const logLevel: Array<'query' | 'info' | 'warn' | 'error'> =
      process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'];

    super({
      log: logLevel,
    });
  }

  /**
   * Connect to database with retry logic
   */
  async connect(): Promise<void> {
    try {
      await this.$connect();
      log.info('Database connected successfully');
    } catch (error) {
      log.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      await this.$disconnect();
      log.info('Database disconnected successfully');
    } catch (error) {
      log.error('Failed to disconnect from database', error);
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      log.error('Database health check failed', error);
      return false;
    }
  }
}

/**
 * Global Prisma client instance
 */
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

/**
 * Singleton Prisma client instance
 */
export const prisma =
  globalForPrisma.prisma ??
  new ExtendedPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Helper function to handle database transaction with error logging
 */
export async function withTransaction<T>(
  callback: (prisma: ExtendedPrismaClient) => Promise<T>
): Promise<T> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      return await callback(tx as ExtendedPrismaClient);
    });

    log.db('Transaction completed successfully');
    return result;
  } catch (error) {
    log.error('Transaction failed', error);
    throw error;
  }
}

/**
 * Helper to safely execute Prisma operations with enhanced error handling
 */
export async function safePrismaOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;

    log.db(`${operationName} completed successfully`, {
      duration: `${duration}ms`,
    });

    return result;
  } catch (error) {
    log.error(`${operationName} failed`, error, {
      operation: operationName,
    });

    // Re-throw to be handled by the calling code
    throw error;
  }
}

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await prisma.connect();

    // Run health check
    const isHealthy = await prisma.healthCheck();
    if (!isHealthy) {
      throw new Error('Database health check failed after connection');
    }

    log.info('Database initialized successfully');
  } catch (error) {
    log.error('Failed to initialize database', error);
    throw error;
  }
}

/**
 * Gracefully shutdown database connection
 */
export async function shutdownDatabase(): Promise<void> {
  try {
    await prisma.disconnect();
    log.info('Database shutdown completed');
  } catch (error) {
    log.error('Error during database shutdown', error);
    throw error;
  }
}

// Default export
export default prisma;