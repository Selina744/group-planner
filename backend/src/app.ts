import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'

import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'
import type { ApiResponse } from './types/api.js'

// Create Express app
const app: Express = express()

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}))
app.use(morgan('combined'))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/api', limiter)

// Health check endpoint
app.get('/health', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  }
  res.json(response)
})

// API routes
app.get('/api', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Group Trip Planner API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api',
      },
    },
  }
  res.json(response)
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

export { app }