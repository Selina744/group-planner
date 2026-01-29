/**
 * Custom error classes for the Group Planner API
 *
 * This module provides a hierarchy of application-specific error types
 * that extend the base AppError class with proper HTTP status codes
 * and error categorization for consistent API error responses.
 */

export abstract class AppError extends Error {
  public readonly httpCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    httpCode: number,
    isOperational = true,
    details?: Record<string, unknown> | undefined
  ) {
    super(message);

    // Use Object.defineProperty to set readonly name property
    Object.defineProperty(this, 'name', {
      value: this.constructor.name,
      configurable: true,
      enumerable: false,
      writable: false
    });

    this.httpCode = httpCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Client error in request format
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: Record<string, unknown>) {
    super(message, 400, true, details);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 401, true, details);
  }
}

/**
 * 403 Forbidden - User lacks permission for this resource
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions', details?: Record<string, unknown>) {
    super(message, 403, true, details);
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super(message, 404, true, details);
  }
}

/**
 * 409 Conflict - Resource conflict (e.g., duplicate data)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 409, true, details);
  }
}

/**
 * 422 Unprocessable Entity - Validation error
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 422, true, details);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, 429, true, details);
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super(message, 500, false, details);
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details?: Record<string, unknown>) {
    super(message, 503, true, details);
  }
}

/**
 * Database-specific error wrapper
 */
export class DatabaseError extends InternalServerError {
  constructor(message = 'Database operation failed', details?: Record<string, unknown> | undefined) {
    super(message, details);
    Object.defineProperty(this, 'name', {
      value: 'DatabaseError',
      configurable: true,
      enumerable: false,
      writable: false
    });
  }
}

/**
 * External service integration error
 */
export class ExternalServiceError extends ServiceUnavailableError {
  public readonly serviceName: string;

  constructor(
    serviceName: string,
    message = 'External service error',
    details?: Record<string, unknown> | undefined
  ) {
    super(message, details);
    this.serviceName = serviceName;
    Object.defineProperty(this, 'name', {
      value: 'ExternalServiceError',
      configurable: true,
      enumerable: false,
      writable: false
    });
  }
}

/**
 * Type guard to check if error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational (expected/handled)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Factory function for creating error instances from objects
 */
export function createError(
  type: string,
  message: string,
  details?: Record<string, unknown>
): AppError {
  switch (type.toLowerCase()) {
    case 'badrequest':
      return new BadRequestError(message, details);
    case 'unauthorized':
      return new UnauthorizedError(message, details);
    case 'forbidden':
      return new ForbiddenError(message, details);
    case 'notfound':
      return new NotFoundError(message, details);
    case 'conflict':
      return new ConflictError(message, details);
    case 'validation':
      return new ValidationError(message, details);
    case 'ratelimit':
      return new RateLimitError(message, details);
    case 'serviceunavailable':
      return new ServiceUnavailableError(message, details);
    default:
      return new InternalServerError(message, details);
  }
}