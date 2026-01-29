/**
 * Rate limiting middleware for Group Planner API
 *
 * This module provides rate limiting functionality specifically designed
 * for authentication endpoints and general API protection against abuse
 * and brute force attacks.
 */

import type { Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';
import { RateLimitError, BadRequestError } from '../utils/errors.js';
import { AuthContext } from './context.js';
import type {
  AuthenticatedRequest,
  MiddlewareFunction,
  RateLimitConfig,
  RateLimitStore,
} from '../types/middleware.js';

/**
 * In-memory rate limit store (for development and single-instance deployments)
 */
class InMemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async get(key: string): Promise<number> {
    const data = this.store.get(key);

    if (!data) {
      return 0;
    }

    // Check if window has expired
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return 0;
    }

    return data.count;
  }

  async increment(key: string, ttl: number): Promise<number> {
    const now = Date.now();
    const data = this.store.get(key);

    if (!data || now > data.resetTime) {
      // Create new entry or reset expired entry
      this.store.set(key, { count: 1, resetTime: now + ttl });
      return 1;
    }

    // Increment existing entry
    data.count += 1;
    return data.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Default rate limit configurations
 */
const DEFAULT_RATE_LIMITS = {
  // Authentication endpoints
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  register: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many registration attempts. Please try again in 1 hour.',
  },
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many password reset attempts. Please try again in 1 hour.',
  },
  tokenRefresh: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many token refresh attempts. Please try again in 15 minutes.',
  },

  // General API endpoints
  general: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests. Please try again later.',
  },

  // Strict limits for sensitive operations
  strict: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Rate limit exceeded for sensitive operation.',
  },
};

/**
 * Global in-memory store instance
 */
const defaultStore = new InMemoryRateLimitStore();

// Clean up expired entries every 5 minutes
setInterval(() => {
  defaultStore.cleanup();
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware class
 */
export class RateLimitMiddleware {
  /**
   * Default key generator based on IP address
   */
  private static defaultKeyGenerator(req: AuthenticatedRequest): string {
    const ip = req.clientIp || req.ip || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * User-based key generator (for authenticated requests)
   */
  private static userKeyGenerator(req: AuthenticatedRequest): string {
    const userId = AuthContext.getUserId(req);
    if (userId) {
      return `user:${userId}`;
    }
    return RateLimitMiddleware.defaultKeyGenerator(req);
  }

  /**
   * Email-based key generator (for login attempts)
   */
  private static emailKeyGenerator(req: AuthenticatedRequest): string {
    const email = req.body?.email || req.body?.identifier;
    if (email && typeof email === 'string') {
      return `email:${email.toLowerCase()}`;
    }
    return RateLimitMiddleware.defaultKeyGenerator(req);
  }

  /**
   * Create rate limiting middleware
   */
  static create(config: Partial<RateLimitConfig> = {}): MiddlewareFunction {
    const {
      maxRequests = DEFAULT_RATE_LIMITS.general.maxRequests,
      windowMs = DEFAULT_RATE_LIMITS.general.windowMs,
      keyGenerator = this.defaultKeyGenerator,
      skip = () => false,
      message = DEFAULT_RATE_LIMITS.general.message,
      headers = true,
      store = defaultStore,
    } = config;

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Check if request should be skipped
        if (skip(req)) {
          return next();
        }

        // Generate rate limit key
        const key = keyGenerator(req);

        // Get current count
        const currentCount = await store.get(key);

        // Check if limit exceeded
        if (currentCount >= maxRequests) {
          log.auth('Rate limit exceeded', {
            key,
            currentCount,
            maxRequests,
            path: req.path,
            method: req.method,
            ip: req.clientIp || req.ip,
            userAgent: req.get('User-Agent'),
          });

          // Set rate limit headers
          if (headers) {
            res.set({
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
            });
          }

          throw new RateLimitError(message);
        }

        // Increment counter
        const newCount = await store.increment(key, windowMs);

        // Set rate limit headers
        if (headers) {
          const remaining = Math.max(0, maxRequests - newCount);
          res.set({
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
          });
        }

        log.debug('Rate limit check passed', {
          key,
          currentCount: newCount,
          maxRequests,
          remaining: maxRequests - newCount,
        });

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          return next(error);
        }

        log.error('Rate limit middleware error', error);
        next(error);
      }
    };
  }

  /**
   * Rate limiting for login endpoints
   */
  static forLogin(): MiddlewareFunction {
    return this.create({
      ...DEFAULT_RATE_LIMITS.login,
      keyGenerator: this.emailKeyGenerator,
    });
  }

  /**
   * Rate limiting for registration endpoints
   */
  static forRegistration(): MiddlewareFunction {
    return this.create({
      ...DEFAULT_RATE_LIMITS.register,
      keyGenerator: this.defaultKeyGenerator, // IP-based for registration
    });
  }

  /**
   * Rate limiting for password reset endpoints
   */
  static forPasswordReset(): MiddlewareFunction {
    return this.create({
      ...DEFAULT_RATE_LIMITS.passwordReset,
      keyGenerator: this.emailKeyGenerator,
    });
  }

  /**
   * Rate limiting for token refresh endpoints
   */
  static forTokenRefresh(): MiddlewareFunction {
    return this.create({
      ...DEFAULT_RATE_LIMITS.tokenRefresh,
      keyGenerator: this.userKeyGenerator,
    });
  }

  /**
   * General API rate limiting
   */
  static forGeneral(): MiddlewareFunction {
    return this.create(DEFAULT_RATE_LIMITS.general);
  }

  /**
   * Strict rate limiting for sensitive operations
   */
  static forSensitiveOperations(): MiddlewareFunction {
    return this.create({
      ...DEFAULT_RATE_LIMITS.strict,
      keyGenerator: this.userKeyGenerator,
    });
  }

  /**
   * Bypass rate limiting for trusted sources (e.g., health checks, internal services)
   */
  static bypassForTrusted(): MiddlewareFunction {
    return this.create({
      maxRequests: 1000,
      windowMs: 60 * 1000, // 1 minute
      skip: (req) => {
        // Skip for health check endpoints
        if (req.path === '/health' || req.path === '/ping') {
          return true;
        }

        // Skip for localhost in development
        if (process.env.NODE_ENV === 'development') {
          const ip = req.clientIp || req.ip;
          if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
            return true;
          }
        }

        return false;
      },
    });
  }

  /**
   * Progressive rate limiting (increases with repeated violations)
   */
  static progressive(baseConfig: Partial<RateLimitConfig> = {}): MiddlewareFunction {
    const violationStore = new Map<string, { count: number; lastViolation: number }>();

    return this.create({
      ...baseConfig,
      keyGenerator: baseConfig.keyGenerator || this.defaultKeyGenerator,
      skip: (req) => {
        if (baseConfig.skip && baseConfig.skip(req)) {
          return true;
        }

        const key = (baseConfig.keyGenerator || this.defaultKeyGenerator)(req);
        const violation = violationStore.get(key);

        if (violation) {
          // Increase penalties for repeated violations
          const timeSinceLastViolation = Date.now() - violation.lastViolation;
          const penaltyMultiplier = Math.min(violation.count, 5); // Max 5x penalty

          // If recent violations, apply progressive penalty
          if (timeSinceLastViolation < 60 * 60 * 1000 && violation.count > 0) { // 1 hour
            log.warn('Progressive rate limit applied', {
              key,
              violationCount: violation.count,
              penaltyMultiplier,
            });
            return false; // Don't skip, apply rate limiting
          }
        }

        return false;
      },
    });
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  static async resetRateLimit(key: string, store: RateLimitStore = defaultStore): Promise<void> {
    await store.reset(key);
    log.info('Rate limit reset', { key });
  }

  /**
   * Get current rate limit status
   */
  static async getRateLimitStatus(
    key: string,
    store: RateLimitStore = defaultStore
  ): Promise<{ count: number }> {
    const count = await store.get(key);
    return { count };
  }
}

/**
 * Pre-configured rate limiting middleware for common use cases
 */
export const rateLimiters = {
  login: RateLimitMiddleware.forLogin(),
  register: RateLimitMiddleware.forRegistration(),
  passwordReset: RateLimitMiddleware.forPasswordReset(),
  tokenRefresh: RateLimitMiddleware.forTokenRefresh(),
  general: RateLimitMiddleware.forGeneral(),
  sensitive: RateLimitMiddleware.forSensitiveOperations(),
  trusted: RateLimitMiddleware.bypassForTrusted(),
  progressive: RateLimitMiddleware.progressive(),
};

/**
 * Export the default store for external usage
 */
export { defaultStore as rateLimitStore };

// Default export
export default RateLimitMiddleware;