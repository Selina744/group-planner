/**
 * Async wrapper utility for Express route handlers
 *
 * Eliminates the need to write try/catch blocks in every async route handler
 * by automatically catching and forwarding errors to Express error middleware.
 */

import type { Request, Response, NextFunction } from 'express';
import log from './logger.js';

/**
 * Type for async route handler function
 */
export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Type for async middleware function
 */
export type AsyncMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Wrapper for async route handlers that automatically catches errors
 * and passes them to Express error handling middleware
 *
 * @param fn Async route handler function
 * @returns Express route handler with error handling
 *
 * @example
 * ```typescript
 * router.get('/users/:id', wrapAsync(async (req, res) => {
 *   const user = await userService.findById(req.params.id);
 *   if (!user) {
 *     throw new NotFoundError('User not found');
 *   }
 *   res.json(user);
 * }));
 * ```
 */
export function wrapAsync(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Execute the async function and catch any errors
    Promise.resolve(fn(req, res, next)).catch((error: unknown) => {
      // Log the error for debugging
      log.error('Async route handler error', error, {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      // Forward error to Express error handling middleware
      next(error);
    });
  };
}

/**
 * Wrapper for async middleware functions
 *
 * @param fn Async middleware function
 * @returns Express middleware with error handling
 *
 * @example
 * ```typescript
 * router.use(wrapAsyncMiddleware(async (req, res, next) => {
 *   const token = req.headers.authorization;
 *   const user = await authService.verifyToken(token);
 *   req.user = user;
 *   next();
 * }));
 * ```
 */
export function wrapAsyncMiddleware(fn: AsyncMiddleware) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error: unknown) => {
      // Log middleware errors
      log.error('Async middleware error', error, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      next(error);
    });
  };
}

/**
 * Higher-order function that wraps multiple async handlers at once
 *
 * @param handlers Array of async route handlers
 * @returns Array of wrapped handlers
 *
 * @example
 * ```typescript
 * const [authHandler, getUserHandler] = wrapAsyncHandlers([
 *   async (req, res, next) => {
 *     // auth logic
 *     next();
 *   },
 *   async (req, res) => {
 *     // get user logic
 *   }
 * ]);
 * ```
 */
export function wrapAsyncHandlers(handlers: AsyncRouteHandler[]): ((req: Request, res: Response, next: NextFunction) => void)[] {
  return handlers.map(handler => wrapAsync(handler));
}

/**
 * Utility for wrapping service layer methods to handle database errors
 *
 * @param serviceFn Service method that returns a Promise
 * @returns Wrapped service method with enhanced error handling
 *
 * @example
 * ```typescript
 * export const userService = {
 *   findById: wrapServiceMethod(async (id: string) => {
 *     return await prisma.user.findUnique({ where: { id } });
 *   }),
 * };
 * ```
 */
export function wrapServiceMethod<T extends unknown[], R>(
  serviceFn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      const startTime = Date.now();
      const result = await serviceFn(...args);
      const duration = Date.now() - startTime;

      // Log successful service calls in debug mode
      log.debug('Service method executed successfully', {
        method: serviceFn.name,
        duration,
        args: process.env.NODE_ENV === 'development' ? args : undefined,
      });

      return result;
    } catch (error) {
      // Enhanced error logging for service layer
      log.error(`Service method failed: ${serviceFn.name}`, error, {
        method: serviceFn.name,
        args: process.env.NODE_ENV === 'development' ? args : undefined,
      });

      // Re-throw the error to be handled by the calling code
      throw error;
    }
  };
}

/**
 * Promise-based timeout utility for preventing hanging requests
 *
 * @param promise Promise to execute with timeout
 * @param timeoutMs Timeout in milliseconds
 * @param timeoutMessage Custom timeout error message
 * @returns Promise that resolves or rejects within the timeout
 *
 * @example
 * ```typescript
 * const user = await withTimeout(
 *   userService.findById(id),
 *   5000,
 *   'User lookup timed out'
 * );
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry utility for unreliable operations
 *
 * @param fn Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param delayMs Delay between retries in milliseconds
 * @param backoffFactor Exponential backoff multiplier
 * @returns Promise that resolves if any attempt succeeds
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => externalApiCall(),
 *   3,
 *   1000,
 *   2
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
  backoffFactor = 2
): Promise<T> {
  let lastError: unknown;
  let delay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();

      if (attempt > 0) {
        log.info(`Operation succeeded after ${attempt} retries`);
      }

      return result;
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        log.error(`Operation failed after ${maxRetries} retries`, error);
        break;
      }

      log.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, { error });

      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }

  throw lastError;
}

// Export the main wrapAsync as default
export default wrapAsync;