import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { ApiResponse } from '../types/api.js'

/**
 * Health check controller
 */
export const getHealthCheck = asyncHandler(
  async (req: Request, res: Response<ApiResponse>) => {
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    }

    res.json(response)
  }
)

/**
 * Simple ping endpoint
 */
export const ping = asyncHandler(
  async (req: Request, res: Response<ApiResponse>) => {
    res.json({
      success: true,
      data: {
        message: 'pong',
        timestamp: new Date().toISOString(),
      },
    })
  }
)