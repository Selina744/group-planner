/**
 * Role-Based Access Control (RBAC) middleware for Group Planner API
 *
 * This module provides a flexible RBAC system that can be extended
 * as the application grows. Currently implements basic permission
 * checking with plans for future role/permission expansion.
 */

import type { Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { AuthMiddleware } from './auth.js';
import type {
  AuthenticatedRequest,
  MiddlewareFunction,
} from '../types/middleware.js';
import type { UserProfile } from '../types/auth.js';

/**
 * Permission types for the application
 */
export type Permission =
  // Profile permissions
  | 'read:profile'
  | 'write:profile'
  | 'delete:profile'
  // Trip permissions
  | 'create:trip'
  | 'read:trip'
  | 'write:trip'
  | 'delete:trip'
  | 'join:trip'
  | 'leave:trip'
  | 'invite:trip'
  | 'manage:trip'
  // Admin permissions
  | 'read:users'
  | 'write:users'
  | 'delete:users'
  | 'admin:system'
  | 'admin:analytics';

/**
 * User roles (for future implementation)
 */
export type Role = 'user' | 'trip_admin' | 'admin' | 'super_admin';

/**
 * Role-permission mapping (future expansion)
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [
    'read:profile',
    'write:profile',
    'create:trip',
    'read:trip',
    'join:trip',
    'leave:trip',
  ],
  trip_admin: [
    'read:profile',
    'write:profile',
    'create:trip',
    'read:trip',
    'write:trip',
    'join:trip',
    'leave:trip',
    'invite:trip',
    'manage:trip',
  ],
  admin: [
    'read:profile',
    'write:profile',
    'delete:profile',
    'create:trip',
    'read:trip',
    'write:trip',
    'delete:trip',
    'join:trip',
    'leave:trip',
    'invite:trip',
    'manage:trip',
    'read:users',
    'write:users',
    'admin:analytics',
  ],
  super_admin: [
    'read:profile',
    'write:profile',
    'delete:profile',
    'create:trip',
    'read:trip',
    'write:trip',
    'delete:trip',
    'join:trip',
    'leave:trip',
    'invite:trip',
    'manage:trip',
    'read:users',
    'write:users',
    'delete:users',
    'admin:system',
    'admin:analytics',
  ],
};

/**
 * Resource ownership check function
 */
export type ResourceOwnershipCheck = (
  user: UserProfile,
  resourceId: string,
  req: AuthenticatedRequest
) => Promise<boolean>;

/**
 * RBAC configuration for specific endpoints
 */
export interface RbacConfig {
  /** Required permissions */
  permissions?: Permission[] | undefined;
  /** Required roles (for future use) */
  roles?: Role[] | undefined;
  /** Resource ownership check */
  resourceOwnership?: {
    /** Parameter name containing resource ID */
    paramName: string;
    /** Function to check ownership */
    checkOwnership: ResourceOwnershipCheck;
  } | undefined;
  /** Custom permission check function */
  customCheck?: ((user: UserProfile, req: AuthenticatedRequest) => boolean | Promise<boolean>) | undefined;
  /** Error message for forbidden access */
  forbiddenMessage?: string | undefined;
}

/**
 * RBAC middleware class
 */
export class RbacMiddleware {
  /**
   * Get user permissions based on current implementation
   * (This will be enhanced when roles are added to the database)
   */
  private static getUserPermissions(user: UserProfile): Permission[] {
    // Temporary implementation based on email domain
    // This should be replaced with actual role-based logic
    if (user.email.endsWith('@admin.example.com')) {
      return ROLE_PERMISSIONS.admin;
    }

    // Default user permissions
    return ROLE_PERMISSIONS.user;
  }

  /**
   * Check if user has required permission
   */
  private static hasPermission(user: UserProfile, permission: Permission): boolean {
    const userPermissions = this.getUserPermissions(user);
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has any of the required permissions
   */
  private static hasAnyPermission(user: UserProfile, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user has all required permissions
   */
  private static hasAllPermissions(user: UserProfile, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Create RBAC middleware
   */
  static create(config: RbacConfig): MiddlewareFunction {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Check if user is authenticated
        if (!AuthMiddleware.isAuthenticated(req)) {
          throw new UnauthorizedError('Authentication required');
        }

        const { user } = req;

        // Check required permissions
        if (config.permissions && config.permissions.length > 0) {
          if (!this.hasAllPermissions(user, config.permissions)) {
            log.auth('Permission denied', {
              userId: user.id,
              email: user.email,
              requiredPermissions: config.permissions,
              userPermissions: this.getUserPermissions(user),
              path: req.path,
              method: req.method,
            });

            throw new ForbiddenError(
              config.forbiddenMessage || 'Insufficient permissions'
            );
          }
        }

        // Check resource ownership
        if (config.resourceOwnership) {
          const { paramName, checkOwnership } = config.resourceOwnership;
          const resourceId = req.params[paramName];

          if (!resourceId) {
            throw new ForbiddenError('Resource ID required');
          }

          const isOwner = await checkOwnership(user, resourceId, req);
          if (!isOwner) {
            log.auth('Resource access denied - not owner', {
              userId: user.id,
              email: user.email,
              resourceId,
              paramName,
              path: req.path,
              method: req.method,
            });

            throw new ForbiddenError('Access denied - insufficient privileges');
          }
        }

        // Custom permission check
        if (config.customCheck) {
          const hasCustomPermission = await config.customCheck(user, req);
          if (!hasCustomPermission) {
            log.auth('Custom permission check failed', {
              userId: user.id,
              email: user.email,
              path: req.path,
              method: req.method,
            });

            throw new ForbiddenError(
              config.forbiddenMessage || 'Access denied'
            );
          }
        }

        // All checks passed
        log.debug('RBAC check passed', {
          userId: user.id,
          permissions: config.permissions,
          path: req.path,
          method: req.method,
        });

        next();
      } catch (error) {
        if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
          return next(error);
        }

        log.error('RBAC middleware error', error, {
          path: req.path,
          method: req.method,
        });

        next(new ForbiddenError('Access control error'));
      }
    };
  }

  /**
   * Require specific permissions
   */
  static requirePermissions(...permissions: Permission[]): MiddlewareFunction {
    return this.create({ permissions });
  }

  /**
   * Require any of the specified permissions
   */
  static requireAnyPermission(...permissions: Permission[]): MiddlewareFunction {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!AuthMiddleware.isAuthenticated(req)) {
          throw new UnauthorizedError('Authentication required');
        }

        if (!this.hasAnyPermission(req.user, permissions)) {
          throw new ForbiddenError('Insufficient permissions');
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Require admin access
   */
  static requireAdmin(): MiddlewareFunction {
    return this.requirePermissions('admin:system', 'admin:analytics');
  }

  /**
   * Require resource ownership or admin access
   */
  static requireOwnershipOrAdmin(
    paramName: string,
    checkOwnership: ResourceOwnershipCheck
  ): MiddlewareFunction {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!AuthMiddleware.isAuthenticated(req)) {
          throw new UnauthorizedError('Authentication required');
        }

        const { user } = req;

        // Check if user is admin
        if (this.hasPermission(user, 'admin:system')) {
          return next();
        }

        // Check resource ownership
        const resourceId = req.params[paramName];
        if (!resourceId) {
          throw new ForbiddenError('Resource ID required');
        }

        const isOwner = await checkOwnership(user, resourceId, req);
        if (!isOwner) {
          throw new ForbiddenError('Access denied - insufficient privileges');
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user can access specific trip
   */
  static canAccessTrip(): MiddlewareFunction {
    return this.requireOwnershipOrAdmin('tripId', async (user, tripId) => {
      // This would check if user is a member of the trip
      // For now, return true as placeholder
      // TODO: Implement trip membership check
      log.debug('Trip access check placeholder', { userId: user.id, tripId });
      return true;
    });
  }

  /**
   * Check if user can manage specific trip
   */
  static canManageTrip(): MiddlewareFunction {
    return this.create({
      permissions: ['manage:trip'],
      resourceOwnership: {
        paramName: 'tripId',
        checkOwnership: async (user, tripId) => {
          // This would check if user is the trip creator or admin
          // TODO: Implement trip management check
          log.debug('Trip management check placeholder', { userId: user.id, tripId });
          return true;
        },
      },
    });
  }

  /**
   * Get user permissions (utility function)
   */
  static getUserPermissions(user: UserProfile): Permission[] {
    return this.getUserPermissions(user);
  }
}

/**
 * Utility functions for permission checking
 */
export const checkPermission = (user: UserProfile, permission: Permission): boolean => {
  return RbacMiddleware.getUserPermissions(user).includes(permission);
};

export const checkAnyPermission = (user: UserProfile, permissions: Permission[]): boolean => {
  const userPermissions = RbacMiddleware.getUserPermissions(user);
  return permissions.some(permission => userPermissions.includes(permission));
};

export const checkAllPermissions = (user: UserProfile, permissions: Permission[]): boolean => {
  const userPermissions = RbacMiddleware.getUserPermissions(user);
  return permissions.every(permission => userPermissions.includes(permission));
};

/**
 * Export commonly used RBAC middleware
 */
export const requirePermissions = RbacMiddleware.requirePermissions;
export const requireAnyPermission = RbacMiddleware.requireAnyPermission;
export const requireAdmin = RbacMiddleware.requireAdmin;
export const requireOwnershipOrAdmin = RbacMiddleware.requireOwnershipOrAdmin;
export const canAccessTrip = RbacMiddleware.canAccessTrip;
export const canManageTrip = RbacMiddleware.canManageTrip;

// Default export
export default RbacMiddleware;