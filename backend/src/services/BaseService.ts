import { ApiError } from '../utils/ApiError.js'

/**
 * Base service class with common functionality
 */
export abstract class BaseService {
  /**
   * Validates required fields
   */
  protected validateRequired<T>(data: T, fields: (keyof T)[]): void {
    for (const field of fields) {
      if (!data[field]) {
        throw ApiError.badRequest(`Missing required field: ${String(field)}`)
      }
    }
  }

  /**
   * Sanitizes input by removing undefined values
   */
  protected sanitizeInput<T extends Record<string, any>>(input: T): Partial<T> {
    const sanitized: Partial<T> = {}

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        sanitized[key as keyof T] = value
      }
    }

    return sanitized
  }

  /**
   * Generates a simple ID (placeholder - should use proper UUID in production)
   */
  protected generateId(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15)
  }

  /**
   * Formats dates consistently
   */
  protected formatDate(date: Date | string): Date {
    if (typeof date === 'string') {
      return new Date(date)
    }
    return date
  }
}