/**
 * Standardized API response utility for Group Planner API
 *
 * Provides consistent response structure and helper methods for all API endpoints
 * following REST API best practices and improving client-side response handling.
 */

import { Response } from 'express';
import log from './logger.js';

/**
 * Standard API response structure
 */
export interface ApiResponseData<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: ResponseMeta;
  errors?: ValidationError[];
}

/**
 * Metadata for paginated responses
 */
export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: unknown;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

/**
 * Main ApiResponse class with static methods for different response types
 */
export class ApiResponse {
  /**
   * Send successful response with data
   */
  static success<T>(
    res: Response,
    message = 'Success',
    data?: T,
    meta?: ResponseMeta,
    statusCode = 200
  ): Response<ApiResponseData<T>> {
    const response: ApiResponseData<T> = {
      success: true,
      message,
      data,
      meta,
    };

    log.response(
      res.req.method,
      res.req.url,
      statusCode,
      Date.now() - res.locals.startTime,
      { dataType: data ? typeof data : undefined }
    );

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message = 'An error occurred',
    statusCode = 500,
    errors?: ValidationError[]
  ): Response<ApiResponseData> {
    const response: ApiResponseData = {
      success: false,
      message,
      errors,
    };

    log.response(
      res.req.method,
      res.req.url,
      statusCode,
      Date.now() - res.locals.startTime,
      { errorMessage: message }
    );

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    res: Response,
    message = 'Resource created successfully',
    data?: T
  ): Response<ApiResponseData<T>> {
    return ApiResponse.success(res, message, data, undefined, 201);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response): Response {
    log.response(
      res.req.method,
      res.req.url,
      204,
      Date.now() - res.locals.startTime
    );

    return res.status(204).send();
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: Response,
    message = 'Bad request',
    errors?: ValidationError[]
  ): Response<ApiResponseData> {
    return ApiResponse.error(res, message, 400, errors);
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    message = 'Authentication required'
  ): Response<ApiResponseData> {
    return ApiResponse.error(res, message, 401);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(
    res: Response,
    message = 'Insufficient permissions'
  ): Response<ApiResponseData> {
    return ApiResponse.error(res, message, 403);
  }

  /**
   * Send not found response (404)
   */
  static notFound(
    res: Response,
    message = 'Resource not found'
  ): Response<ApiResponseData> {
    return ApiResponse.error(res, message, 404);
  }

  /**
   * Send conflict response (409)
   */
  static conflict(
    res: Response,
    message = 'Resource conflict',
    errors?: ValidationError[]
  ): Response<ApiResponseData> {
    return ApiResponse.error(res, message, 409, errors);
  }

  /**
   * Send validation error response (422)
   */
  static validationError(
    res: Response,
    message = 'Validation failed',
    errors?: ValidationError[]
  ): Response<ApiResponseData> {
    return ApiResponse.error(res, message, 422, errors);
  }

  /**
   * Send internal server error response (500)
   */
  static internalError(
    res: Response,
    message = 'Internal server error'
  ): Response<ApiResponseData> {
    return ApiResponse.error(res, message, 500);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationParams,
    message = 'Data retrieved successfully'
  ): Response<ApiResponseData<T[]>> {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);

    const meta: ResponseMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return ApiResponse.success(res, message, data, meta);
  }
}

/**
 * Helper function to extract pagination parameters from query string
 */
export function extractPagination(query: Record<string, unknown>, maxLimit = 100): { page: number; limit: number } {
  const page = Math.max(1, parseInt(String(query.page || 1)));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(query.limit || 10))));

  return { page, limit };
}

/**
 * Helper function to calculate skip/take values for database queries
 */
export function calculatePagination(page: number, limit: number): { skip: number; take: number } {
  const skip = (page - 1) * limit;
  const take = limit;

  return { skip, take };
}

/**
 * Helper function to create validation error objects
 */
export function createValidationError(
  field: string,
  message: string,
  code?: string,
  value?: unknown
): ValidationError {
  return {
    field,
    message,
    code,
    value,
  };
}

/**
 * Helper function to format Zod validation errors
 */
export function formatZodErrors(zodError: unknown): ValidationError[] {
  // Type guard for Zod error structure
  if (
    typeof zodError === 'object' &&
    zodError !== null &&
    'issues' in zodError &&
    Array.isArray((zodError as any).issues)
  ) {
    return (zodError as any).issues.map((issue: any) => ({
      field: issue.path?.join('.') || 'unknown',
      message: issue.message,
      code: issue.code,
      value: issue.received,
    }));
  }

  return [
    {
      field: 'unknown',
      message: 'Validation error occurred',
    },
  ];
}

/**
 * Middleware to add response time tracking
 */
export function responseTimeMiddleware() {
  return (req: any, res: any, next: any) => {
    res.locals.startTime = Date.now();
    next();
  };
}

/**
 * Helper for handling async route responses
 */
export function handleAsyncResponse<T>(
  promise: Promise<T>,
  res: Response,
  successMessage = 'Operation completed successfully',
  statusCode = 200
): Promise<Response<ApiResponseData<T>>> {
  return promise
    .then(data => {
      if (statusCode === 201) {
        return ApiResponse.created(res, successMessage, data);
      }
      if (statusCode === 204) {
        return ApiResponse.noContent(res);
      }
      return ApiResponse.success(res, successMessage, data, undefined, statusCode);
    })
    .catch(error => {
      log.error('Async response handling error', error);

      // Let the error middleware handle the error
      throw error;
    });
}

/**
 * Type guard to check if response has been sent
 */
export function isResponseSent(res: Response): boolean {
  return res.headersSent;
}

/**
 * Helper to send consistent health check responses
 */
export function sendHealthCheck(res: Response, checks: Record<string, 'healthy' | 'unhealthy'>) {
  const allHealthy = Object.values(checks).every(status => status === 'healthy');
  const statusCode = allHealthy ? 200 : 503;

  const response: ApiResponseData<Record<string, string>> = {
    success: allHealthy,
    message: allHealthy ? 'All systems healthy' : 'Some systems unhealthy',
    data: checks,
  };

  return res.status(statusCode).json(response);
}

// Export the main class as default
export default ApiResponse;