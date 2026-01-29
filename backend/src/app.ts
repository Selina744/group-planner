import express, { type Express } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'

import { errorHandler, setupGlobalErrorHandlers } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'
import { middleware, securityMiddleware, corsUtil } from './middleware/index.js'
import { DatabaseManager } from './lib/database.js'
import { HealthService } from './services/health.js'
import { log } from './utils/logger.js'
import {
  authRoutes,
  docsRoutes,
  healthRoutes,
  tripRoutes,
  eventRoutes,
  getApiPath,
} from './routes/index.js'
import type { ApiResponse } from './types/api.js'


/**
 * Create and configure Express app
 */
function createApp(): Express {
  const app: Express = express()

  // Trust proxy headers
  app.set('trust proxy', true)

  // Enhanced security middleware
  app.use(securityMiddleware.headers())
  app.use(securityMiddleware.sanitization())
  app.use(securityMiddleware.logging())

  // Enhanced CORS middleware
  app.use(corsUtil.enhanced())
  app.use(corsUtil.preflightHandler())
  app.use(corsUtil.violationLogger())

  // HTTPS Enforcement - Redirect HTTP to HTTPS in production
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' &&
        req.header('x-forwarded-proto') !== 'https' &&
        !req.secure) {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });

  // Enhanced security headers with HSTS
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    crossOriginEmbedderPolicy: false,
  }))

  app.use(morgan('combined'))
  app.use(compression())

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  // Secure cookie configuration
  app.use(cookieParser())

  // General rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  })
  app.use('/api', generalLimiter)

  return app
}

// Create the Express app
const app = createApp()

// API routes with versioning
app.use(getApiPath('/auth'), authRoutes)
app.use(getApiPath('/health'), healthRoutes)
app.use(getApiPath('/trips'), tripRoutes)
app.use(getApiPath('/events'), eventRoutes)
app.use('/docs', docsRoutes)

// Root endpoints
app.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'Group Planner API',
      version: process.env.npm_package_version || '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      docs: '/docs',
      health: getApiPath('/health'),
      endpoints: {
        auth: getApiPath('/auth'),
        health: getApiPath('/health'),
        trips: getApiPath('/trips'),
        events: getApiPath('/events'),
        docs: '/docs',
      },
    },
  }
  res.json(response)
})

// Health check at root level for load balancers
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

// API info endpoint
app.get('/api', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Group Trip Planner API',
      version: '1.0.0',
      endpoints: {
        auth: getApiPath('/auth'),
        health: getApiPath('/health'),
        trips: getApiPath('/trips'),
        events: getApiPath('/events'),
        docs: '/docs',
      },
    },
  }
  res.json(response)
})

// 404 handler - must be after all routes
app.use(notFoundHandler)

// Global error handler - must be last middleware
app.use(errorHandler)

/**
 * Application configuration
 */
export interface AppConfig {
  port: number;
  host: string;
  environment: string;
  logLevel: string;
  enableDocs: boolean;
  enableMetrics: boolean;
}

/**
 * Get application configuration from environment
 */
export function getAppConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableDocs: process.env.ENABLE_DOCS !== 'false',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
  };
}

/**
 * Initialize application services
 */
export async function initializeServices(): Promise<void> {
  try {
    log.info('Initializing application services...');

    // Setup global error handlers
    setupGlobalErrorHandlers();

    // Initialize database
    await DatabaseManager.initialize();

    // Initialize health monitoring
    HealthService.initialize();

    // Setup periodic database cleanup
    DatabaseManager.setupPeriodicCleanup();

    log.info('All services initialized successfully');
  } catch (error) {
    log.error('Service initialization failed', error);
    throw error;
  }
}

/**
 * Shutdown application services gracefully
 */
export async function shutdownServices(): Promise<void> {
  try {
    log.info('Shutting down application services...');

    // Shutdown database connections
    await DatabaseManager.shutdown();

    log.info('All services shut down successfully');
  } catch (error) {
    log.error('Error during service shutdown', error);
    throw error;
  }
}

export { app }