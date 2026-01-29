import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { ApiResponse, formatZodErrors } from '../utils/apiResponse.js'
import { log } from '../utils/logger.js'
import type { ApiError, ApiResponse as ApiResponseShape } from '../types/api.js'

export const errorHandler: ErrorRequestHandler = (
  error: ApiError,
  req: Request,
  res: Response<ApiResponseShape>,
  next: NextFunction
) => {
  log.error('Unhandled error in middleware', error, {
    url: req.url,
    method: req.method,
    body: req.body,
  })

  if (error instanceof ZodError) {
    return ApiResponse.validationError(res, 'Validation failed', formatZodErrors(error))
  }

  if (error.statusCode) {
    const validationErrors =
      Array.isArray(error.details?.errors) ? error.details.errors : undefined
    return ApiResponse.error(res, error.message, error.statusCode, validationErrors)
  }

  return ApiResponse.error(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    500
  )
}
