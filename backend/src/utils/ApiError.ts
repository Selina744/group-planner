export class ApiError extends Error {
  public statusCode: number
  public details: Record<string, any> | undefined

  constructor(
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details

    // Maintain proper stack trace for where our error was thrown (Node.js only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  // Static methods for common error types
  static badRequest(message: string = 'Bad request', details?: Record<string, any> | undefined) {
    return new ApiError(message, 400, details)
  }

  static unauthorized(message: string = 'Unauthorized', details?: Record<string, any> | undefined) {
    return new ApiError(message, 401, details)
  }

  static forbidden(message: string = 'Forbidden', details?: Record<string, any> | undefined) {
    return new ApiError(message, 403, details)
  }

  static notFound(message: string = 'Not found', details?: Record<string, any> | undefined) {
    return new ApiError(message, 404, details)
  }

  static conflict(message: string = 'Conflict', details?: Record<string, any> | undefined) {
    return new ApiError(message, 409, details)
  }

  static unprocessableEntity(message: string = 'Unprocessable entity', details?: Record<string, any> | undefined) {
    return new ApiError(message, 422, details)
  }

  static internal(message: string = 'Internal server error', details?: Record<string, any> | undefined) {
    return new ApiError(message, 500, details)
  }
}