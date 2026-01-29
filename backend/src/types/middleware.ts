/**
 * Middleware types and interfaces for Group Planner API
 *
 * This module defines types for authentication middleware, authorization,
 * rate limiting, and request context augmentation.
 */

import type { Request, Response, NextFunction } from 'express';
import type { UserProfile, AuthenticationContext } from './auth.js';
import type { AccessTokenPayload } from './jwt.js';

/**
 * Extended Express Request with authentication context
 */
export interface AuthenticatedRequest extends Request {
  /** Authentication context */
  auth: AuthenticationContext;
  /** User profile if authenticated */
  user?: UserProfile | undefined;
  /** JWT payload if authenticated */
  jwt?: AccessTokenPayload | undefined;
  /** Request ID for tracking */
  requestId?: string | undefined;
  /** Client IP address */
  clientIp?: string | undefined;
  /** Request start time for performance tracking */
  startTime?: number | undefined;
}

/**
 * Middleware function signature
 */
export type MiddlewareFunction = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Auth middleware configuration
 */
export interface AuthMiddlewareConfig {
  /** Whether authentication is required */
  required: boolean;
  /** Allowed user roles (if any) */
  allowedRoles?: string[] | undefined;
  /** Custom permission check function */
  customPermissionCheck?: ((user: UserProfile) => boolean) | undefined;
  /** Whether to check token revocation in database */
  checkRevocation?: boolean | undefined;
  /** Skip authentication for certain paths */
  skipPaths?: string[] | undefined;
  /** Custom error message for unauthorized access */
  unauthorizedMessage?: string | undefined;
  /** Custom error message for forbidden access */
  forbiddenMessage?: string | undefined;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Rate limit key generator function */
  keyGenerator?: ((req: AuthenticatedRequest) => string) | undefined;
  /** Skip rate limiting condition */
  skip?: ((req: AuthenticatedRequest) => boolean) | undefined;
  /** Custom message for rate limit exceeded */
  message?: string | undefined;
  /** Headers to include in rate limit response */
  headers?: boolean | undefined;
  /** Store for rate limit data (in-memory, Redis, etc.) */
  store?: RateLimitStore | undefined;
}

/**
 * Rate limit store interface
 */
export interface RateLimitStore {
  /** Get current count for a key */
  get(key: string): Promise<number>;
  /** Increment count for a key */
  increment(key: string, ttl: number): Promise<number>;
  /** Reset count for a key */
  reset(key: string): Promise<void>;
}

/**
 * Request validation rules
 */
export interface ValidationRules {
  /** Body validation schema */
  body?: Record<string, unknown> | undefined;
  /** Query parameters validation */
  query?: Record<string, unknown> | undefined;
  /** URL parameters validation */
  params?: Record<string, unknown> | undefined;
  /** Custom validation function */
  custom?: ((req: AuthenticatedRequest) => string[] | null) | undefined;
}

/**
 * Middleware error response
 */
export interface MiddlewareErrorResponse {
  /** Error type */
  type: 'AUTHENTICATION_REQUIRED' | 'INVALID_TOKEN' | 'INSUFFICIENT_PERMISSIONS' | 'RATE_LIMIT_EXCEEDED' | 'VALIDATION_ERROR';
  /** Error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown> | undefined;
  /** Suggested action for client */
  action?: string | undefined;
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  /** Allowed origins */
  origin: string | string[] | ((origin: string | undefined) => boolean);
  /** Allowed HTTP methods */
  methods?: string[] | undefined;
  /** Allowed headers */
  allowedHeaders?: string[] | undefined;
  /** Headers exposed to client */
  exposedHeaders?: string[] | undefined;
  /** Whether to include credentials */
  credentials?: boolean | undefined;
  /** Preflight cache duration */
  maxAge?: number | undefined;
}

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  /** Content Security Policy */
  contentSecurityPolicy?: string | undefined;
  /** HTTP Strict Transport Security */
  hsts?: {
    maxAge: number;
    includeSubDomains?: boolean | undefined;
    preload?: boolean | undefined;
  } | undefined;
  /** X-Frame-Options */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM' | undefined;
  /** X-Content-Type-Options */
  contentTypeOptions?: boolean | undefined;
  /** Referrer Policy */
  referrerPolicy?: string | undefined;
  /** Permissions Policy */
  permissionsPolicy?: Record<string, string[]> | undefined;
}

/**
 * Middleware chain configuration
 */
export interface MiddlewareChainConfig {
  /** Authentication middleware config */
  auth?: AuthMiddlewareConfig | undefined;
  /** Rate limiting config */
  rateLimit?: RateLimitConfig | undefined;
  /** CORS config */
  cors?: CorsConfig | undefined;
  /** Security headers config */
  securityHeaders?: SecurityHeadersConfig | undefined;
  /** Validation rules */
  validation?: ValidationRules | undefined;
  /** Custom middleware functions */
  custom?: MiddlewareFunction[] | undefined;
}

/**
 * Route protection level
 */
export type ProtectionLevel = 'public' | 'authenticated' | 'admin' | 'system';

/**
 * Route metadata for middleware configuration
 */
export interface RouteMetadata {
  /** Protection level required */
  protection: ProtectionLevel;
  /** Rate limit override */
  rateLimit?: Partial<RateLimitConfig> | undefined;
  /** Custom permissions */
  permissions?: string[] | undefined;
  /** Route description for docs */
  description?: string | undefined;
  /** Tags for categorization */
  tags?: string[] | undefined;
}

/**
 * Request context for logging and tracking
 */
export interface RequestContext {
  /** Unique request ID */
  id: string;
  /** User ID if authenticated */
  userId?: string | undefined;
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** Client IP address */
  ip: string;
  /** User agent */
  userAgent?: string | undefined;
  /** Request timestamp */
  timestamp: Date;
  /** Request duration in ms */
  duration?: number | undefined;
  /** Response status code */
  statusCode?: number | undefined;
  /** Error information if any */
  error?: {
    type: string;
    message: string;
    stack?: string | undefined;
  } | undefined;
}

/**
 * Middleware execution context
 */
export interface MiddlewareContext {
  /** Request context */
  request: RequestContext;
  /** Configuration used */
  config: MiddlewareChainConfig;
  /** Execution start time */
  startTime: number;
  /** Middleware execution order */
  executionOrder: string[];
}

/**
 * Audit log entry for security events
 */
export interface SecurityAuditEntry {
  /** Event type */
  event: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'TOKEN_REFRESH' | 'TOKEN_REVOKED' | 'UNAUTHORIZED_ACCESS' | 'RATE_LIMIT_EXCEEDED';
  /** User ID if known */
  userId?: string | undefined;
  /** IP address */
  ipAddress: string;
  /** User agent */
  userAgent?: string | undefined;
  /** Timestamp */
  timestamp: Date;
  /** Additional context */
  context?: Record<string, unknown> | undefined;
  /** Severity level */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Performance metrics for middleware
 */
export interface MiddlewareMetrics {
  /** Middleware name */
  name: string;
  /** Execution count */
  executionCount: number;
  /** Average execution time in ms */
  averageExecutionTime: number;
  /** Error count */
  errorCount: number;
  /** Last execution timestamp */
  lastExecution: Date;
}