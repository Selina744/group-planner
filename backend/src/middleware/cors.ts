/**
 * Enhanced CORS middleware for Group Planner API
 *
 * Provides advanced CORS handling with dynamic origin validation,
 * preflight caching, and security monitoring.
 */

import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { log } from '../utils/logger.js';
import type { AuthenticatedRequest } from '../types/middleware.js';

/**
 * CORS configuration interface
 */
export interface CorsConfig {
  allowedOrigins: string[];
  developmentOrigins: string[];
  productionOrigins: string[];
  maxAge: number;
  allowCredentials: boolean;
  exposedHeaders: string[];
  allowedHeaders: string[];
  allowedMethods: string[];
  enableLogging: boolean;
  enableOriginWhitelist: boolean;
  enableDynamicOrigins: boolean;
}

/**
 * Default CORS configuration
 */
const DEFAULT_CORS_CONFIG: CorsConfig = {
  allowedOrigins: [],
  developmentOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://localhost:3001',
  ],
  productionOrigins: [],
  maxAge: 86400, // 24 hours
  allowCredentials: true,
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Response-Time',
    'Content-Length',
  ],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-API-Key',
    'Cache-Control',
    'Pragma',
    'Accept-Language',
    'Accept-Encoding',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  enableLogging: process.env.NODE_ENV !== 'production',
  enableOriginWhitelist: process.env.NODE_ENV === 'production',
  enableDynamicOrigins: false,
};

/**
 * CORS metrics tracking
 */
export class CorsMetrics {
  private static metrics = {
    allowedRequests: 0,
    rejectedRequests: 0,
    preflightRequests: 0,
    dynamicOriginApprovals: 0,
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
 * Get CORS configuration based on environment
 */
function getCorsConfig(): CorsConfig {
  const envConfig: Partial<CorsConfig> = {};

  // Environment-specific origins
  if (process.env.CORS_ORIGINS) {
    envConfig.allowedOrigins = process.env.CORS_ORIGINS.split(',').map(o => o.trim());
  }

  // Production-specific settings
  if (process.env.NODE_ENV === 'production') {
    envConfig.productionOrigins = envConfig.allowedOrigins || [];
    envConfig.enableOriginWhitelist = true;
    envConfig.enableLogging = process.env.CORS_LOGGING === 'true';
  }

  // Max age configuration
  if (process.env.CORS_MAX_AGE) {
    envConfig.maxAge = parseInt(process.env.CORS_MAX_AGE, 10);
  }

  return { ...DEFAULT_CORS_CONFIG, ...envConfig };
}

/**
 * Validate if origin is allowed
 */
function isOriginAllowed(origin: string | undefined, config: CorsConfig): boolean {
  // Allow requests with no origin (mobile apps, curl, etc.)
  if (!origin) return true;

  // Get appropriate origin list based on environment
  const origins = process.env.NODE_ENV === 'production'
    ? [...config.productionOrigins, ...config.allowedOrigins]
    : [...config.developmentOrigins, ...config.allowedOrigins];

  // Direct match
  if (origins.includes(origin)) return true;

  // Dynamic origin validation (if enabled)
  if (config.enableDynamicOrigins) {
    // Allow localhost with any port in development
    if (process.env.NODE_ENV !== 'production') {
      const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
      if (localhostPattern.test(origin)) {
        CorsMetrics.increment('dynamicOriginApprovals');
        return true;
      }
    }

    // Allow subdomains of approved domains
    for (const allowedOrigin of origins) {
      try {
        const allowedUrl = new URL(allowedOrigin);
        const requestUrl = new URL(origin);

        if (
          requestUrl.protocol === allowedUrl.protocol &&
          (requestUrl.hostname === allowedUrl.hostname ||
           requestUrl.hostname.endsWith(`.${allowedUrl.hostname}`))
        ) {
          CorsMetrics.increment('dynamicOriginApprovals');
          return true;
        }
      } catch (error) {
        // Invalid URL format, skip
        continue;
      }
    }
  }

  return false;
}

/**
 * Enhanced CORS middleware with logging and monitoring
 */
export function enhancedCors(customConfig: Partial<CorsConfig> = {}) {
  const config = { ...getCorsConfig(), ...customConfig };

  const corsOptions: cors.CorsOptions = {
    origin: function (origin, callback) {
      const isAllowed = isOriginAllowed(origin, config);

      if (isAllowed) {
        CorsMetrics.increment('allowedRequests');

        if (config.enableLogging) {
          log.debug('CORS request allowed', {
            origin,
            isProduction: process.env.NODE_ENV === 'production',
          });
        }

        callback(null, true);
      } else {
        CorsMetrics.increment('rejectedRequests');

        if (config.enableLogging) {
          log.warn('CORS request rejected', {
            origin,
            allowedOrigins: process.env.NODE_ENV === 'production'
              ? config.productionOrigins
              : config.developmentOrigins,
            userAgent: 'Unknown', // Will be filled by the middleware
          });
        }

        const error = new Error(`Origin ${origin} not allowed by CORS policy`);
        (error as any).status = 403;
        callback(error);
      }
    },
    credentials: config.allowCredentials,
    methods: config.allowedMethods,
    allowedHeaders: config.allowedHeaders,
    exposedHeaders: config.exposedHeaders,
    maxAge: config.maxAge,
    optionsSuccessStatus: 204,
  };

  return cors(corsOptions);
}

/**
 * CORS preflight handler with enhanced logging
 */
export function corsPreflightHandler() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'OPTIONS') {
      CorsMetrics.increment('preflightRequests');

      const authReq = req as AuthenticatedRequest;

      log.info('CORS preflight request', {
        requestId: authReq.requestId,
        origin: req.get('Origin'),
        method: req.get('Access-Control-Request-Method'),
        headers: req.get('Access-Control-Request-Headers'),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      // Add additional preflight response headers
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    }

    next();
  };
}

/**
 * CORS violation logger
 */
export function corsViolationLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    const origin = req.get('Origin');

    // Check for potential CORS violations
    if (origin && !isOriginAllowed(origin, getCorsConfig())) {
      log.warn('Potential CORS violation detected', {
        requestId: authReq.requestId,
        origin,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referer: req.get('Referer'),
      });
    }

    next();
  };
}

/**
 * Middleware to add CORS-related response headers
 */
export function corsResponseHeaders() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Add timing header for CORS requests
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      res.setHeader('X-Response-Time', `${responseTime}ms`);

      // Add cache headers for CORS responses
      if (req.get('Origin')) {
        res.setHeader('Vary', 'Origin');
      }
    });

    next();
  };
}

/**
 * Strict CORS middleware for sensitive endpoints
 */
export function strictCors(allowedOrigins: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('Origin');

    if (origin && !allowedOrigins.includes(origin)) {
      log.warn('Strict CORS violation on sensitive endpoint', {
        origin,
        url: req.url,
        method: req.method,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'CORS_STRICT_VIOLATION',
          details: 'This endpoint requires specific origin authorization',
        },
      });
    }

    return next();
  };
}

/**
 * Export CORS utilities and middleware
 */
export const corsUtil = {
  enhanced: enhancedCors,
  preflightHandler: corsPreflightHandler,
  violationLogger: corsViolationLogger,
  responseHeaders: corsResponseHeaders,
  strict: strictCors,
  metrics: CorsMetrics,
  config: getCorsConfig,
  isOriginAllowed,
};