import type { Request, Response } from 'express'

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errors?: Record<string, string[]>
}

// Error types
export interface ApiError extends Error {
  statusCode?: number
  details?: Record<string, any>
}

// Extended Express types
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
    role?: string
  }
}

export type AsyncHandler<T = any> = (
  req: Request,
  res: Response<ApiResponse<T>>
) => Promise<void>

export type AuthAsyncHandler<T = any> = (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<T>>
) => Promise<void>

// Pagination types
export interface PaginationQuery {
  page?: string
  limit?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Filter types
export interface BaseFilters {
  search?: string
  createdAfter?: string
  createdBefore?: string
}