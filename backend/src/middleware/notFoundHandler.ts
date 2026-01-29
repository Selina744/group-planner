import type { Request, Response, NextFunction } from 'express'
import type { ApiResponse } from '../types/api.js'

export const notFoundHandler = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}