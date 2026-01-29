/**
 * Shared utility modules for Group Planner API
 *
 * This module exports all utility functions and classes for use throughout the application.
 * It provides a centralized way to access error classes, logging, async handling, and response formatting.
 */

// Error handling exports
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError as ValidationAppError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
  isAppError,
  isOperationalError,
  createError,
} from './errors.js';

// Logging exports
export {
  log,
  logger,
  createContextLogger,
} from './logger.js';

// Async handling exports
export {
  wrapAsync,
  wrapAsyncMiddleware,
  wrapAsyncHandlers,
  wrapServiceMethod,
  withTimeout,
  withRetry,
  type AsyncRouteHandler,
  type AsyncMiddleware,
} from './wrapAsync.js';

// API response exports
export {
  ApiResponse,
  extractPagination,
  calculatePagination,
  createValidationError,
  formatZodErrors,
  responseTimeMiddleware,
  handleAsyncResponse,
  isResponseSent,
  sendHealthCheck,
  type ApiResponseData,
  type ResponseMeta,
  type ValidationError,
  type PaginationParams,
} from './apiResponse.js';

// Re-export default exports for convenience
export { default as wrapAsyncDefault } from './wrapAsync.js';
export { default as logDefault } from './logger.js';
export { default as ApiResponseDefault } from './apiResponse.js';