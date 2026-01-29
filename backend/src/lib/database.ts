/**
 * Database initialization and management for Group Planner API
 *
 * This module provides database setup, connection management,
 * and migration utilities for the application.
 */

import { prisma, initializeDatabase, shutdownDatabase } from './prisma.js';
import { log } from '../utils/logger.js';

/**
 * Database status information
 */
export interface DatabaseStatus {
  connected: boolean;
  healthy: boolean;
  version?: string | undefined;
  tables?: string[] | undefined;
  lastMigration?: string | undefined;
  error?: string | undefined;
}

/**
 * Database management utilities
 */
export class DatabaseManager {
  /**
   * Initialize database connection and run health checks
   */
  static async initialize(): Promise<void> {
    try {
      log.info('Initializing database connection...');

      // Initialize Prisma connection
      await initializeDatabase();

      // Verify database setup
      const status = await this.getStatus();

      if (!status.healthy) {
        throw new Error(`Database health check failed: ${status.error}`);
      }

      log.info('Database initialized successfully', {
        connected: status.connected,
        version: status.version,
        tables: status.tables?.length,
      });
    } catch (error) {
      log.error('Database initialization failed', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown database connections
   */
  static async shutdown(): Promise<void> {
    try {
      log.info('Shutting down database connections...');
      await shutdownDatabase();
      log.info('Database connections closed successfully');
    } catch (error) {
      log.error('Error during database shutdown', error);
      throw error;
    }
  }

  /**
   * Get database status and health information
   */
  static async getStatus(): Promise<DatabaseStatus> {
    try {
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`;

      // Get database version
      const versionResult = await prisma.$queryRaw<Array<{ version: string }>>`
        SELECT version() as version
      `;
      const version = versionResult[0]?.version;

      // Get table information
      const tables = await this.getTables();

      // Check for migrations table and get last migration
      let lastMigration: string | undefined;
      try {
        const migrationResult = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date }>>`
          SELECT migration_name, finished_at
          FROM "_prisma_migrations"
          ORDER BY finished_at DESC
          LIMIT 1
        `;
        lastMigration = migrationResult[0]?.migration_name;
      } catch {
        // Migrations table might not exist yet
        lastMigration = 'No migrations found';
      }

      return {
        connected: true,
        healthy: true,
        version,
        tables,
        lastMigration,
      };
    } catch (error) {
      log.error('Database status check failed', error);

      return {
        connected: false,
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get list of database tables
   */
  static async getTables(): Promise<string[]> {
    try {
      const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      return result.map(row => row.table_name);
    } catch (error) {
      log.error('Failed to get database tables', error);
      return [];
    }
  }

  /**
   * Check if database migrations are up to date
   */
  static async checkMigrations(): Promise<{
    upToDate: boolean;
    pendingMigrations?: string[] | undefined;
    error?: string | undefined;
  }> {
    try {
      // This is a placeholder for migration checking logic
      // In a real implementation, you might compare local migration files
      // with the _prisma_migrations table

      const migrationResult = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
        ORDER BY migration_name
      `;

      // For now, assume migrations are up to date if the table exists
      // and has at least one migration
      const upToDate = migrationResult.length > 0;

      log.debug('Migration check completed', {
        upToDate,
        appliedMigrations: migrationResult.length,
      });

      return { upToDate };
    } catch (error) {
      log.error('Migration check failed', error);

      return {
        upToDate: false,
        error: error instanceof Error ? error.message : 'Migration check failed',
      };
    }
  }

  /**
   * Create database backup (placeholder for future implementation)
   */
  static async createBackup(): Promise<{
    success: boolean;
    backupPath?: string | undefined;
    error?: string | undefined;
  }> {
    // This is a placeholder for backup functionality
    log.warn('Database backup functionality not implemented yet');

    return {
      success: false,
      error: 'Backup functionality not implemented',
    };
  }

  /**
   * Get database metrics
   */
  static async getMetrics(): Promise<{
    userCount: number;
    refreshTokenCount: number;
    connectionCount?: number | undefined;
  }> {
    try {
      const [userCount, refreshTokenCount] = await Promise.all([
        prisma.user.count(),
        prisma.refreshToken.count({
          where: {
            revoked: false,
            expiresAt: { gt: new Date() },
          },
        }),
      ]);

      return {
        userCount,
        refreshTokenCount,
      };
    } catch (error) {
      log.error('Failed to get database metrics', error);

      return {
        userCount: 0,
        refreshTokenCount: 0,
      };
    }
  }

  /**
   * Cleanup expired tokens and old data
   */
  static async cleanup(): Promise<{
    expiredTokensRemoved: number;
    oldDataRemoved: number;
  }> {
    try {
      log.info('Starting database cleanup...');

      // Remove expired refresh tokens
      const expiredTokens = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      // Remove old password reset tokens (older than 24 hours)
      const oldPasswordResets = await prisma.passwordReset.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      log.info('Database cleanup completed', {
        expiredTokensRemoved: expiredTokens.count,
        oldPasswordResets: oldPasswordResets.count,
      });

      return {
        expiredTokensRemoved: expiredTokens.count,
        oldDataRemoved: oldPasswordResets.count,
      };
    } catch (error) {
      log.error('Database cleanup failed', error);

      return {
        expiredTokensRemoved: 0,
        oldDataRemoved: 0,
      };
    }
  }

  /**
   * Setup periodic cleanup job
   */
  static setupPeriodicCleanup(): void {
    // Run cleanup every hour
    const cleanupInterval = 60 * 60 * 1000; // 1 hour

    setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        log.error('Periodic cleanup failed', error);
      }
    }, cleanupInterval);

    log.info('Periodic database cleanup scheduled', {
      intervalMinutes: cleanupInterval / (60 * 1000),
    });
  }
}

/**
 * Export database instance for direct access
 */
export { prisma as database };