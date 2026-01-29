import type { Request, Response, NextFunction } from 'express'

/**
 * Wraps async route handlers to automatically catch errors and pass them to Express error handling
 */
export const asyncHandler = <T extends any[]>(
  fn: (req: Request, res: Response, next: NextFunction, ...args: T) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction, ...args: T) => {
    Promise.resolve(fn(req, res, next, ...args)).catch(next)
  }
}