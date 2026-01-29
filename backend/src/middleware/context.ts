/**
 * Auth context injection utilities for Group Planner API
 *
 * This module provides helper functions and decorators for route handlers
 * to easily access authentication context and perform common auth operations.
 */

import crypto from 'crypto';
import type { Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';
import { AuthMiddleware } from './auth.js';
import { getSecureClientIp } from '../utils/ipUtils.js';
import { RbacMiddleware, type Permission } from './rbac.js';
import { BadRequestError, InternalServerError } from '../utils/errors.js';
import type {
  AuthenticatedRequest,
  MiddlewareFunction,
  RequestContext,
} from '../types/middleware.js';
import type { UserProfile } from '../types/auth.js';

/**
 * Auth context utilities
 */
export class AuthContext {
  /**
   * Get authenticated user from request (throws if not authenticated)
   */
  static requireUser(req: AuthenticatedRequest): UserProfile {
    if (!AuthMiddleware.isAuthenticated(req)) {
      throw new Error('Request must be authenticated to access user context');
    }
    return req.user;
  }

  /**
   * Get authenticated user ID from request (throws if not authenticated)
   */
  static requireUserId(req: AuthenticatedRequest): string {
    return this.requireUser(req).id;
  }

  /**
   * Get authenticated user from request (returns null if not authenticated)
   */
  static getUser(req: AuthenticatedRequest): UserProfile | null {
    return AuthMiddleware.getUser(req);
  }

  /**
   * Get user ID from request (returns null if not authenticated)
   */
  static getUserId(req: AuthenticatedRequest): string | null {
    return AuthMiddleware.getUserId(req);
  }

  /**
   * Check if user has permission
   */
  static hasPermission(req: AuthenticatedRequest, permission: Permission): boolean {
    const user = this.getUser(req);
    if (!user) return false;

    return RbacMiddleware.getUserPermissions(user).includes(permission);
  }

  /**
   * Check if user has any of the permissions
   */
  static hasAnyPermission(req: AuthenticatedRequest, permissions: Permission[]): boolean {
    const user = this.getUser(req);
    if (!user) return false;

    const userPermissions = RbacMiddleware.getUserPermissions(user);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user owns resource (utility for common ownership patterns)
   */
  static async checkResourceOwnership(
    req: AuthenticatedRequest,
    resourceUserId: string
  ): Promise<boolean> {
    const userId = this.getUserId(req);
    if (!userId) return false;

    return userId === resourceUserId;
  }

  /**
   * Check if user can access resource (ownership or admin)
   */
  static async canAccessResource(
    req: AuthenticatedRequest,
    resourceUserId: string
  ): Promise<boolean> {
    // Admin can access any resource
    if (this.hasPermission(req, 'admin:system')) {
      return true;
    }

    // User can access their own resources
    return await this.checkResourceOwnership(req, resourceUserId);
  }
}

/**
 * Request context injection middleware
 */
export class ContextMiddleware {
  /**
   * Inject request ID and timing information
   */
  static injectRequestContext(): MiddlewareFunction {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      // Generate unique request ID
      req.requestId = crypto.randomBytes(8).toString('hex');

      // Set request start time
      req.startTime = Date.now();

      // Set client IP (secure extraction to prevent spoofing)
      req.clientIp = getSecureClientIp(req);

      // Add request ID to response headers for debugging
      res.set('X-Request-ID', req.requestId);

      // Log request start
      log.debug('Request started', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        ip: req.clientIp,
        userAgent: req.get('User-Agent'),
      });

      next();
    };
  }

  /**
   * Create request context object for logging
   */
  static createRequestContext(req: AuthenticatedRequest): RequestContext {
    return {
      id: req.requestId || 'unknown',
      userId: AuthContext.getUserId(req) || undefined,
      method: req.method,
      path: req.path,
      ip: req.clientIp || req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
    };
  }

  /**
   * Log request completion
   */
  static logRequestCompletion(): MiddlewareFunction {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      // Override res.end to log completion
      const originalEnd = res.end;

      res.end = function(chunk?: any, encoding?: any): any {
        const duration = req.startTime ? Date.now() - req.startTime : undefined;
        const context = ContextMiddleware.createRequestContext(req);

        log.debug('Request completed', {
          ...context,
          statusCode: res.statusCode,
          duration: duration ? `${duration}ms` : 'unknown',
        });

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }
}

/**
 * Higher-order function to create route handlers with auth context
 */
export type AuthenticatedRouteHandler<T = any> = (
  req: AuthenticatedRequest,
  res: Response,
  user: UserProfile,
  context: RequestContext
) => Promise<T> | T;

export type OptionalAuthRouteHandler<T = any> = (
  req: AuthenticatedRequest,
  res: Response,
  user: UserProfile | null,
  context: RequestContext
) => Promise<T> | T;

/**
 * Create route handler with authentication context injection
 */
export function withAuthContext<T>(
  handler: AuthenticatedRouteHandler<T>
): MiddlewareFunction {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = AuthContext.requireUser(req);
      const context = ContextMiddleware.createRequestContext(req);

      await handler(req, res, user, context);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create route handler with optional authentication context
 */
export function withOptionalAuthContext<T>(
  handler: OptionalAuthRouteHandler<T>
): MiddlewareFunction {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = AuthContext.getUser(req);
      const context = ContextMiddleware.createRequestContext(req);

      await handler(req, res, user, context);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Route parameter validation utilities
 */
export class ParamValidation {
  /**
   * Validate UUID parameter
   */
  static validateUuid(paramName: string): MiddlewareFunction {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      const value = req.params[paramName];

      if (!value) {
        throw new BadRequestError(`Missing required parameter: ${paramName}`);
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new BadRequestError(`Invalid ${paramName} format`);
      }

      next();
    };
  }

  /**
   * Validate that parameter matches authenticated user ID
   */
  static validateOwnUserId(paramName: string = 'userId'): MiddlewareFunction {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      const paramUserId = req.params[paramName];
      const authenticatedUserId = AuthContext.requireUserId(req);

      if (paramUserId !== authenticatedUserId) {
        // Check if user has admin permissions to access other user's data
        if (!AuthContext.hasPermission(req, 'admin:system')) {
          throw new BadRequestError('Access denied - can only access your own data');
        }
      }

      next();
    };
  }

  /**
   * Validate that user can access the resource
   */
  static validateResourceAccess(paramName: string, resourceType: string): MiddlewareFunction {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const resourceId = req.params[paramName];

        if (!resourceId) {
          throw new BadRequestError(`Missing required parameter: ${paramName}`);
        }

        // This is a placeholder for resource-specific validation
        // In a real implementation, you would check database for resource ownership
        log.debug('Resource access validation placeholder', {
          userId: AuthContext.getUserId(req),
          resourceId,
          resourceType,
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

/**
 * Error handling utilities for auth context
 */
export class AuthErrorHandler {
  /**
   * Handle authentication errors consistently
   */
  static handleAuthError(error: Error): Error {
    log.debug('Handling auth error', { error: error.message });

    if (error.message.includes('authentication')) {
      return error;
    }

    return new InternalServerError('Authentication system error');
  }
}

/**
 * Convenience middleware combinations
 */
export const middleware = {
  // Basic request context
  context: ContextMiddleware.injectRequestContext(),

  // Optional authentication
  optionalAuth: AuthMiddleware.optionalAuth(),

  // Required authentication
  requireAuth: AuthMiddleware.requireAuth(),

  // Admin only
  requireAdmin: AuthMiddleware.requireAdmin(),

  // Request logging
  logging: ContextMiddleware.logRequestCompletion(),

  // Parameter validation
  validateUuid: ParamValidation.validateUuid,
  validateOwnUserId: ParamValidation.validateOwnUserId,
  validateResourceAccess: ParamValidation.validateResourceAccess,
};

// All exports are handled above