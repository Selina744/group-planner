/**
 * Middleware module exports for Group Planner API
 *
 * This module provides centralized exports for all middleware components
 * including authentication, authorization, rate limiting, and context injection.
 */

// Auth middleware exports
export {
  AuthMiddleware,
  requireAuth,
  optionalAuth,
  requireAdmin,
  SecurityAudit,
} from './auth.js';

// RBAC middleware exports
export {
  RbacMiddleware,
  requirePermissions,
  requireAnyPermission,
  requireOwnershipOrAdmin,
  canAccessTrip,
  canManageTrip,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  type Permission,
  type Role,
} from './rbac.js';

// Context middleware exports
export {
  AuthContext,
  ContextMiddleware,
  ParamValidation,
  AuthErrorHandler,
  withAuthContext,
  withOptionalAuthContext,
  middleware,
  type AuthenticatedRouteHandler,
  type OptionalAuthRouteHandler,
} from './context.js';

// Rate limiting middleware exports
export {
  RateLimitMiddleware,
  rateLimiters,
  rateLimitStore,
} from './rateLimit.js';

// Re-export middleware types for convenience
export type {
  AuthenticatedRequest,
  MiddlewareFunction,
  AuthMiddlewareConfig,
  RateLimitConfig,
  RateLimitStore,
  ValidationRules,
  CorsConfig,
  SecurityHeadersConfig,
  MiddlewareChainConfig,
  ProtectionLevel,
  RouteMetadata,
  RequestContext,
  SecurityAuditEntry,
} from '../types/middleware.js';

/**
 * Pre-configured middleware combinations for common use cases
 */
export const middlewarePresets = {
  // Public routes (no authentication required)
  public: [
    middleware.context, // Request context injection
    rateLimiters.general, // General rate limiting
    middleware.logging, // Request logging
    optionalAuth, // Optional authentication
  ],

  // Protected routes (authentication required)
  protected: [
    middleware.context,
    rateLimiters.general,
    middleware.logging,
    requireAuth, // Required authentication
  ],

  // Admin routes (admin access required)
  admin: [
    middleware.context,
    rateLimiters.sensitive,
    middleware.logging,
    requireAuth,
    requireAdmin,
  ],

  // Auth endpoints (with strict rate limiting)
  authEndpoint: [
    middleware.context,
    middleware.logging,
  ],

  // Login endpoint (with login-specific rate limiting)
  login: [
    middleware.context,
    rateLimiters.login,
    middleware.logging,
  ],

  // Registration endpoint
  register: [
    middleware.context,
    rateLimiters.register,
    middleware.logging,
  ],

  // Password reset endpoint
  passwordReset: [
    middleware.context,
    rateLimiters.passwordReset,
    middleware.logging,
  ],

  // Token refresh endpoint
  tokenRefresh: [
    middleware.context,
    rateLimiters.tokenRefresh,
    middleware.logging,
  ],
};

/**
 * Helper function to apply multiple middleware
 */
export function applyMiddleware(...middlewares: any[]) {
  return middlewares.flat();
}

/**
 * Helper function to create route-specific middleware chain
 */
export function createMiddlewareChain(preset: keyof typeof middlewarePresets, additional: any[] = []) {
  return applyMiddleware(middlewarePresets[preset], additional);
}

/**
 * Helper function to create auth middleware with permissions
 */
export function requirePermissionsMiddleware(...permissions: Permission[]) {
  return [
    middleware.context,
    rateLimiters.general,
    requireAuth,
    requirePermissions(...permissions),
  ];
}

/**
 * Helper function to create resource ownership middleware
 */
export function requireResourceOwnership(
  paramName: string,
  checkOwnership: (user: any, resourceId: string, req: any) => Promise<boolean>
) {
  return [
    middleware.context,
    rateLimiters.general,
    requireAuth,
    requireOwnershipOrAdmin(paramName, checkOwnership),
  ];
}

/**
 * Convenience middleware for parameter validation
 */
export const validation = {
  uuid: middleware.validateUuid,
  ownUserId: middleware.validateOwnUserId,
  resourceAccess: middleware.validateResourceAccess,
};

/**
 * Security middleware combinations
 */
export const security = {
  // Basic security for public endpoints
  basic: [
    middleware.context,
    rateLimiters.general,
    middleware.logging,
  ],

  // Enhanced security for sensitive operations
  enhanced: [
    middleware.context,
    rateLimiters.sensitive,
    middleware.logging,
    requireAuth,
  ],

  // Maximum security for admin operations
  maximum: [
    middleware.context,
    rateLimiters.strict,
    middleware.logging,
    requireAuth,
    requireAdmin,
  ],
};