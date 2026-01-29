/**
 * Advanced security middleware for Group Planner API
 *
 * Provides comprehensive security headers, request sanitization,
 * and security monitoring beyond basic helmet configuration.
 */

import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { log } from '../utils/logger.js';
import type { AuthenticatedRequest } from '../types/middleware.js';

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  enableRequestSanitization: boolean;
  enableSecurityLogging: boolean;
  enableDDoSProtection: boolean;
  maxRequestSize: string;
  suspiciousPatterns: RegExp[];
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableRequestSanitization: process.env.NODE_ENV === 'production',
  enableSecurityLogging: true,
  enableDDoSProtection: true,
  maxRequestSize: '10mb',
  suspiciousPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /expression\s*\(/gi, // CSS expressions
    /vbscript:/gi, // VBScript protocol
    /data:text\/html/gi, // Data URLs
    /&#x?[0-9a-f]+;/gi, // HTML entities
    /\bUNION\b.*\bSELECT\b/gi, // SQL injection
    /\b(exec|execute|sp_executesql)\b/gi, // SQL commands
    /(\.\.\/|\.\.\\)/g, // Path traversal
    /\b(eval|Function|setTimeout|setInterval)\s*\(/gi, // Code execution
  ],
};

/**
 * Security metrics tracking
 */
export class SecurityMetrics {
  private static metrics = {
    suspiciousRequests: 0,
    blockedRequests: 0,
    rateLimitedRequests: 0,
    sanitizedRequests: 0,
  };

  static increment(metric: keyof typeof this.metrics): void {
    this.metrics[metric]++;
  }

  static getMetrics() {
    return { ...this.metrics };
  }

  static reset(): void {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key as keyof typeof this.metrics] = 0;
    });
  }
}

/**
 * Enhanced security headers middleware
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Additional security headers beyond helmet
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Remove server identification
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Cache control for sensitive endpoints
    if (req.path.includes('/auth') || req.path.includes('/admin')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  };
}

/**
 * Request sanitization middleware
 */
export function requestSanitization(config: Partial<SecurityConfig> = {}) {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!finalConfig.enableRequestSanitization) {
      return next();
    }

    const authReq = req as AuthenticatedRequest;
    let suspiciousContent = false;

    try {
      // Check URL for suspicious patterns
      for (const pattern of finalConfig.suspiciousPatterns) {
        if (pattern.test(req.url)) {
          suspiciousContent = true;
          break;
        }
      }

      // Check request body for suspicious content
      if (req.body && typeof req.body === 'object') {
        const bodyString = JSON.stringify(req.body);
        for (const pattern of finalConfig.suspiciousPatterns) {
          if (pattern.test(bodyString)) {
            suspiciousContent = true;
            break;
          }
        }
      }

      // Check query parameters
      const queryString = JSON.stringify(req.query);
      for (const pattern of finalConfig.suspiciousPatterns) {
        if (pattern.test(queryString)) {
          suspiciousContent = true;
          break;
        }
      }

      if (suspiciousContent) {
        SecurityMetrics.increment('suspiciousRequests');

        if (finalConfig.enableSecurityLogging) {
          log.warn('Suspicious request detected', {
            requestId: authReq.requestId,
            userId: authReq.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
            method: req.method,
            body: req.body ? JSON.stringify(req.body).substring(0, 200) : undefined,
          });
        }

        // Block obviously malicious requests
        SecurityMetrics.increment('blockedRequests');
        return res.status(400).json({
          success: false,
          error: {
            message: 'Request contains invalid content',
            code: 'INVALID_REQUEST_CONTENT',
            details: 'The request contains potentially harmful content',
          },
        });
      }

      SecurityMetrics.increment('sanitizedRequests');
      next();
    } catch (error) {
      log.error('Request sanitization error', error, {
        requestId: authReq.requestId,
        url: req.url,
      });
      next();
    }
  };
}

/**
 * DDoS protection middleware
 */
export function ddosProtection() {
  const rateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute per IP
    message: {
      success: false,
      error: {
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        details: 'You have exceeded the rate limit. Please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req) => {
      SecurityMetrics.increment('rateLimitedRequests');
      log.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });
    },
  });

  const speedLimiter = slowDown({
    windowMs: 1 * 60 * 1000, // 1 minute
    delayAfter: 30, // Allow 30 requests at full speed
    delayMs: 500, // Add 500ms delay after delayAfter requests
    maxDelayMs: 5000, // Maximum delay of 5 seconds
    onLimitReached: (req) => {
      log.warn('Speed limit activated', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });
    },
  });

  return [rateLimiter, speedLimiter];
}

/**
 * API endpoint specific rate limiting
 */
export function apiEndpointLimiting() {
  // Stricter limits for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP per window
    skipSuccessfulRequests: true,
    message: {
      success: false,
      error: {
        message: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        details: 'Please wait before attempting to authenticate again.',
      },
    },
  });

  // More lenient limits for general API endpoints
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP per window
    message: {
      success: false,
      error: {
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        details: 'You have exceeded the rate limit for this endpoint.',
      },
    },
  });

  return { authLimiter, generalLimiter };
}

/**
 * Security logging middleware
 */
export function securityLogging() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    const startTime = Date.now();

    // Log security-relevant requests
    const isSecurityRelevant =
      req.path.includes('/auth') ||
      req.path.includes('/admin') ||
      req.method !== 'GET';

    if (isSecurityRelevant) {
      log.info('Security-relevant request', {
        requestId: authReq.requestId,
        userId: authReq.user?.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        contentLength: req.get('Content-Length'),
      });
    }

    // Track response for security logging
    const originalSend = res.send;
    res.send = function(body: any) {
      const responseTime = Date.now() - startTime;

      if (isSecurityRelevant) {
        log.info('Security-relevant response', {
          requestId: authReq.requestId,
          userId: authReq.user?.id,
          statusCode: res.statusCode,
          responseTime,
          contentLength: body?.length || 0,
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Content Security Policy for API responses
 */
export function apiContentSecurity() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Strict CSP for API responses
    res.setHeader('Content-Security-Policy',
      "default-src 'none'; " +
      "frame-ancestors 'none'; " +
      "form-action 'none'; " +
      "base-uri 'none';"
    );

    next();
  };
}

/**
 * Request size validation
 */
export function requestSizeValidation(maxSize: number = 10 * 1024 * 1024) { // 10MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);

    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: {
          message: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE',
          details: `Request size exceeds ${maxSize} bytes`,
        },
      });
    }

    next();
  };
}

/**
 * Export all security middleware
 */
export const security = {
  headers: securityHeaders,
  sanitization: requestSanitization,
  ddosProtection,
  apiEndpointLimiting,
  logging: securityLogging,
  contentSecurity: apiContentSecurity,
  requestSizeValidation,
  metrics: SecurityMetrics,
  config: DEFAULT_SECURITY_CONFIG,
};