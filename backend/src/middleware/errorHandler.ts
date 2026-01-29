import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { ApiResponse, formatZodErrors } from '../utils/apiResponse.js'
import { log } from '../utils/logger.js'
import {
  AppError,
  isAppError,
  isOperationalError,
  UnauthorizedError,
  RateLimitError,
} from '../utils/errors.js'
import type { AuthenticatedRequest, MiddlewareFunction } from '../types/middleware.js'
import type { ApiError, ApiResponse as ApiResponseShape } from '../types/api.js'

export const errorHandler: ErrorRequestHandler = (
  error: ApiError,
  req: Request,
  res: Response<ApiResponseShape>,
  next: NextFunction
) => {
  // Cast to AuthenticatedRequest for additional context
  const authReq = req as AuthenticatedRequest

  // Enhanced logging with auth context
  log.error('Unhandled error in middleware', error, {
    url: req.url,
    method: req.method,
    body: req.body,
    requestId: authReq.requestId,
    userId: authReq.user?.id,
    ip: authReq.clientIp || req.ip,
    userAgent: req.get('User-Agent'),
    isOperational: isOperationalError(error),
  })

  // Log security-related errors for audit
  if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
    log.auth('Security event in error handler', {
      event: error instanceof RateLimitError ? 'RATE_LIMIT_EXCEEDED' : 'UNAUTHORIZED_ACCESS',
      userId: authReq.user?.id,
      ipAddress: authReq.clientIp || req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      error: error.message,
    })
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return ApiResponse.validationError(res, 'Validation failed', formatZodErrors(error))
  }

  // Handle JWT-related errors
  if (error.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'Invalid authentication token', 401)
  }

  if (error.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'Authentication token expired', 401)
  }

  // Handle app errors with proper status codes
  if (isAppError(error)) {
    const validationErrors = error.details?.errors
      ? (Array.isArray(error.details.errors) ? error.details.errors : undefined)
      : undefined
    return ApiResponse.error(res, error.message, error.httpCode, validationErrors)
  }

  // Handle legacy format with statusCode
  if (error.statusCode) {
    const validationErrors =
      Array.isArray(error.details?.errors) ? error.details.errors : undefined
    return ApiResponse.error(res, error.message, error.statusCode, validationErrors)
  }

  // Generic server error
  return ApiResponse.error(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    500
  )
}

/**
 * 404 handler for routes not found
 */
export const notFoundHandler: MiddlewareFunction = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  log.warn('Route not found', {
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id,
    ip: req.clientIp || req.ip,
  })

  ApiResponse.error(res, `Route not found: ${req.method} ${req.path}`, 404)
}

/**
 * Setup global error handlers for uncaught exceptions
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (err: Error) => {
    log.error('Uncaught exception - shutting down gracefully', err, {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      timestamp: new Date().toISOString(),
    })

    // Give the application time to finish current requests
    setTimeout(() => process.exit(1), 1000)
  })

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    log.error('Unhandled promise rejection - shutting down gracefully', reason, {
      promise: promise.toString(),
      timestamp: new Date().toISOString(),
    })

    // Give the application time to finish current requests
    setTimeout(() => process.exit(1), 1000)
  })

  log.info('Global error handlers configured')
}
