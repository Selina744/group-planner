/**
 * Authentication middleware for Group Planner API
 *
 * This module provides JWT-based authentication middleware for Express.js,
 * including token verification, user context injection, and flexible
 * authentication requirements for different routes.
 */

import type { Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.js';
import { AuthService } from '../services/auth.js';
import { JwtUtils } from '../lib/jwt.js';
import { log } from '../utils/logger.js';
import {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors.js';
import { getSecureClientIp } from '../utils/ipUtils.js';
import type {
  AuthenticatedRequest,
  AuthMiddlewareConfig,
  MiddlewareFunction,
  SecurityAuditEntry,
} from '../types/middleware.js';
import type { UserProfile } from '../types/auth.js';
import type { AccessTokenPayload } from '../types/jwt.js';

/**
 * Default authentication middleware configuration
 */
const DEFAULT_AUTH_CONFIG: AuthMiddlewareConfig = {
  required: true,
  checkRevocation: false,
  skipPaths: [],
  unauthorizedMessage: 'Authentication required',
  forbiddenMessage: 'Insufficient permissions',
};

/**
 * Security audit logger
 */
class SecurityAudit {
  /**
   * Log security event
   */
  static log(entry: SecurityAuditEntry): void {
    log.auth('Security audit event', {
      event: entry.event,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      severity: entry.severity,
      context: entry.context,
    });

    // In production, you might want to send this to a dedicated security monitoring service
    if (entry.severity === 'HIGH' || entry.severity === 'CRITICAL') {
      log.error('High severity security event', {
        event: entry.event,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        context: entry.context,
      });
    }
  }

  /**
   * Log unauthorized access attempt
   */
  static logUnauthorizedAccess(
    req: AuthenticatedRequest,
    reason: string,
    context?: Record<string, unknown>
  ): void {
    this.log({
      event: 'UNAUTHORIZED_ACCESS',
      ipAddress: req.clientIp || req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      severity: 'MEDIUM',
      context: {
        path: req.path,
        method: req.method,
        reason,
        ...context,
      },
    });
  }

  /**
   * Log successful token verification
   */
  static logTokenVerification(
    req: AuthenticatedRequest,
    userId: string
  ): void {
    this.log({
      event: 'LOGIN_SUCCESS',
      userId,
      ipAddress: req.clientIp || req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      severity: 'LOW',
      context: {
        path: req.path,
        method: req.method,
        via: 'jwt_token',
      },
    });
  }
}

/**
 * Auth middleware utilities
 */
export class AuthMiddleware {
  /**
   * Extract token from request
   */
  private static extractToken(req: AuthenticatedRequest): string | null {
    // Try Authorization header first
    const authHeader = req.get('Authorization');
    if (authHeader) {
      const token = JwtUtils.extractFromAuthHeader(authHeader);
      if (token) {
        return token;
      }
    }

    // Try cookie as fallback (if using cookie-based auth)
    const cookieToken = req.cookies?.accessToken;
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  /**
   * Verify JWT token and load user context
   */
  private static async verifyTokenAndLoadUser(
    token: string,
    checkRevocation = false
  ): Promise<{
    valid: boolean;
    user?: UserProfile | undefined;
    jwt?: AccessTokenPayload | undefined;
    error?: string | undefined;
  }> {
    try {
      // Verify JWT token structure
      const verification = JwtService.verifyAccessToken(token);

      if (!verification.valid || !verification.payload) {
        return {
          valid: false,
          error: verification.error || 'Invalid token',
        };
      }

      // Optionally check token revocation (expensive operation)
      if (checkRevocation) {
        // For access tokens, we don't store them in the database
        // but we can check if all user tokens have been revoked
        try {
          const user = await AuthService.getUserById(verification.payload.sub);
          if (!user) {
            return {
              valid: false,
              error: 'User not found',
            };
          }
        } catch (error) {
          return {
            valid: false,
            error: 'User validation failed',
          };
        }
      }

      // Load full user profile
      try {
        const user = await AuthService.getUserById(verification.payload.sub);

        return {
          valid: true,
          user,
          jwt: verification.payload,
        };
      } catch (error) {
        log.warn('Failed to load user profile for valid token', {
          userId: verification.payload.sub,
          error,
        });

        return {
          valid: false,
          error: 'Failed to load user profile',
        };
      }
    } catch (error) {
      log.debug('Token verification failed', { error });

      return {
        valid: false,
        error: 'Token verification failed',
      };
    }
  }

  /**
   * Create authentication middleware with configuration
   */
  static create(config: Partial<AuthMiddlewareConfig> = {}): MiddlewareFunction {
    const finalConfig: AuthMiddlewareConfig = {
      ...DEFAULT_AUTH_CONFIG,
      ...config,
    };

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Set client IP for logging (secure extraction to prevent spoofing)
        req.clientIp = getSecureClientIp(req);

        // Check if path should be skipped
        if (finalConfig.skipPaths?.some(path => req.path.startsWith(path))) {
          req.auth = { user: null, isAuthenticated: false };
          return next();
        }

        // Extract token from request
        const token = this.extractToken(req);

        if (!token) {
          if (finalConfig.required) {
            SecurityAudit.logUnauthorizedAccess(req, 'Missing authentication token');
            throw new UnauthorizedError(finalConfig.unauthorizedMessage);
          } else {
            // Set unauthenticated context
            req.auth = { user: null, isAuthenticated: false };
            return next();
          }
        }

        // Verify token and load user
        const verification = await this.verifyTokenAndLoadUser(
          token,
          finalConfig.checkRevocation
        );

        if (!verification.valid || !verification.user || !verification.jwt) {
          if (finalConfig.required) {
            SecurityAudit.logUnauthorizedAccess(req, 'Invalid authentication token', {
              error: verification.error,
            });
            throw new UnauthorizedError(finalConfig.unauthorizedMessage);
          } else {
            // Set unauthenticated context
            req.auth = { user: null, isAuthenticated: false };
            return next();
          }
        }

        // Check role-based access control
        if (finalConfig.allowedRoles && finalConfig.allowedRoles.length > 0) {
          // For now, we don't have roles in the user model
          // This can be implemented later when roles are added to the schema
          log.debug('Role-based access control not implemented yet', {
            allowedRoles: finalConfig.allowedRoles,
            userId: verification.user.id,
          });
        }

        // Check custom permission function
        if (finalConfig.customPermissionCheck) {
          const hasPermission = finalConfig.customPermissionCheck(verification.user);
          if (!hasPermission) {
            SecurityAudit.logUnauthorizedAccess(req, 'Custom permission check failed', {
              userId: verification.user.id,
            });
            throw new ForbiddenError(finalConfig.forbiddenMessage);
          }
        }

        // Set authenticated context
        req.auth = { user: verification.user, isAuthenticated: true };
        req.user = verification.user;
        req.jwt = verification.jwt;

        // Log successful authentication
        SecurityAudit.logTokenVerification(req, verification.user.id);

        log.debug('Request authenticated successfully', {
          userId: verification.user.id,
          email: verification.user.email,
          path: req.path,
          method: req.method,
        });

        next();
      } catch (error) {
        if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
          return next(error);
        }

        log.error('Authentication middleware error', error, {
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
        });

        next(new UnauthorizedError('Authentication failed'));
      }
    };
  }

  /**
   * Middleware that requires authentication
   */
  static requireAuth(config: Omit<AuthMiddlewareConfig, 'required'> = {}): MiddlewareFunction {
    return this.create({ ...config, required: true });
  }

  /**
   * Middleware that allows optional authentication
   */
  static optionalAuth(config: Omit<AuthMiddlewareConfig, 'required'> = {}): MiddlewareFunction {
    return this.create({ ...config, required: false });
  }

  /**
   * Middleware for admin-only routes
   */
  static requireAdmin(config: Partial<AuthMiddlewareConfig> = {}): MiddlewareFunction {
    return this.create({
      ...config,
      required: true,
      customPermissionCheck: (user: UserProfile) => {
        // SECURITY: Proper admin role checking
        // Use environment-configured admin users until proper role system is implemented
        const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
        const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];

        // Check if user is in admin whitelist by email or user ID
        const isAdminByEmail = adminEmails.includes(user.email);
        const isAdminByUserId = adminUserIds.includes(user.id);

        if (!isAdminByEmail && !isAdminByUserId) {
          log.warn('Unauthorized admin access attempt', {
            userId: user.id,
            email: user.email,
            adminEmails: adminEmails.length,
            adminUserIds: adminUserIds.length,
          });
          return false;
        }

        log.info('Admin access granted', {
          userId: user.id,
          email: user.email,
          method: isAdminByEmail ? 'email' : 'userId',
        });

        return true;
      },
      forbiddenMessage: 'Admin access required',
    });
  }

  /**
   * Type guard to check if request is authenticated
   */
  static isAuthenticated(req: AuthenticatedRequest): req is AuthenticatedRequest & {
    auth: { user: UserProfile; isAuthenticated: true };
    user: UserProfile;
    jwt: AccessTokenPayload;
  } {
    return req.auth?.isAuthenticated === true && !!req.user && !!req.jwt;
  }

  /**
   * Get user from authenticated request (with type safety)
   */
  static getUser(req: AuthenticatedRequest): UserProfile | null {
    return this.isAuthenticated(req) ? req.user : null;
  }

  /**
   * Get user ID from authenticated request
   */
  static getUserId(req: AuthenticatedRequest): string | null {
    return this.getUser(req)?.id || null;
  }

  /**
   * Check if user has specific permission (extensible for future role system)
   */
  static hasPermission(
    req: AuthenticatedRequest,
    permission: string | string[]
  ): boolean {
    if (!this.isAuthenticated(req)) {
      return false;
    }

    // Placeholder implementation - extend when role/permission system is added
    const permissions = Array.isArray(permission) ? permission : [permission];

    // For now, all authenticated users have basic permissions
    const basicPermissions = ['read:profile', 'write:profile', 'create:trip', 'join:trip'];

    return permissions.every(perm => basicPermissions.includes(perm));
  }
}

/**
 * Export commonly used middleware functions
 */
export const requireAuth = AuthMiddleware.requireAuth;
export const optionalAuth = AuthMiddleware.optionalAuth;
export const requireAdmin = AuthMiddleware.requireAdmin;

// Export middleware utilities
export { SecurityAudit };

// Default export
export default AuthMiddleware;