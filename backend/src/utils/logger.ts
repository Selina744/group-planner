/**
 * Winston logger configuration for Group Planner API
 *
 * Provides structured logging with different transports and formats
 * for development and production environments.
 */

import winston from 'winston';
import { isAppError } from './errors.js';

// Log levels in order of priority
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
});

/**
 * Determine log level based on environment
 */
function getLogLevel(): string {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  const configuredLevel = process.env.LOG_LEVEL;

  if (configuredLevel && Object.keys(LOG_LEVELS).includes(configuredLevel)) {
    return configuredLevel;
  }

  return isDevelopment ? 'debug' : 'info';
}

/**
 * Custom format for development console output
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    let logMessage = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return logMessage;
  })
);

/**
 * Custom format for production JSON output
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Sanitize sensitive information in production
    const sanitized = { ...info };

    // Remove or mask sensitive fields
    if (sanitized.password) delete sanitized.password;
    if (sanitized.token) sanitized.token = '[REDACTED]';
    if (sanitized.authorization) sanitized.authorization = '[REDACTED]';

    return JSON.stringify(sanitized);
  })
);

/**
 * Create transports based on environment
 */
function createTransports(): winston.transport[] {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';

  const transports: winston.transport[] = [];

  // Console transport for all environments
  transports.push(
    new winston.transports.Console({
      level: getLogLevel(),
      format: isDevelopment ? developmentFormat : productionFormat,
    })
  );

  // File transports for production
  if (!isDevelopment) {
    // Error log file
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: productionFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );

    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: productionFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  return transports;
}

/**
 * Create the main logger instance
 */
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: getLogLevel(),
  transports: createTransports(),
  // Don't exit on handled exceptions
  exitOnError: false,
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

/**
 * Enhanced logging methods with context support
 */
export const log = {
  /**
   * Log error with enhanced context
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const logContext: Record<string, unknown> = { ...context };

    if (error) {
      if (isAppError(error)) {
        logContext.errorType = error.constructor.name;
        logContext.httpCode = error.httpCode;
        logContext.isOperational = error.isOperational;
        logContext.details = error.details;
        logContext.stack = error.stack;
      } else if (error instanceof Error) {
        logContext.errorType = error.constructor.name;
        logContext.stack = error.stack;
      } else {
        logContext.error = error;
      }
    }

    logger.error(message, logContext);
  },

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>) {
    logger.warn(message, context);
  },

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>) {
    logger.info(message, context);
  },

  /**
   * Log HTTP request/response
   */
  http(message: string, context?: Record<string, unknown>) {
    logger.http(message, context);
  },

  /**
   * Log debug information
   */
  debug(message: string, context?: Record<string, unknown>) {
    logger.debug(message, context);
  },

  /**
   * Log database operation
   */
  db(message: string, context?: Record<string, unknown>) {
    logger.debug(`[DB] ${message}`, context);
  },

  /**
   * Log authentication event
   */
  auth(message: string, context?: Record<string, unknown>) {
    // Ensure no sensitive data is logged
    const sanitizedContext = { ...context };
    delete sanitizedContext.password;
    delete sanitizedContext.token;
    delete sanitizedContext.refreshToken;

    logger.info(`[AUTH] ${message}`, sanitizedContext);
  },

  /**
   * Log API request
   */
  request(method: string, url: string, context?: Record<string, unknown>) {
    logger.http(`${method} ${url}`, {
      method,
      url,
      ...context,
    });
  },

  /**
   * Log API response
   */
  response(method: string, url: string, statusCode: number, duration: number, context?: Record<string, unknown>) {
    const level = statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `${method} ${url} ${statusCode} - ${duration}ms`, {
      method,
      url,
      statusCode,
      duration,
      ...context,
    });
  },
};

/**
 * Create child logger with persistent context
 */
export function createContextLogger(context: Record<string, unknown>) {
  return {
    error: (message: string, error?: unknown, additionalContext?: Record<string, unknown>) =>
      log.error(message, error, { ...context, ...additionalContext }),
    warn: (message: string, additionalContext?: Record<string, unknown>) =>
      log.warn(message, { ...context, ...additionalContext }),
    info: (message: string, additionalContext?: Record<string, unknown>) =>
      log.info(message, { ...context, ...additionalContext }),
    http: (message: string, additionalContext?: Record<string, unknown>) =>
      log.http(message, { ...context, ...additionalContext }),
    debug: (message: string, additionalContext?: Record<string, unknown>) =>
      log.debug(message, { ...context, ...additionalContext }),
  };
}

// Export the main logger instance as well
export { logger };

// Export default
export default log;