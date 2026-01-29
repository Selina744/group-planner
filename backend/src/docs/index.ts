/**
 * Documentation module exports for Group Planner API
 *
 * This module provides centralized exports for all documentation
 * components including OpenAPI specs, Swagger configuration, and
 * route documentation.
 */

// Main swagger configuration
export {
  swaggerSpec,
  swaggerUiOptions,
  docsHealthHandler,
  openApiSpecHandler,
} from './swagger.js';

// Import route documentation files to register JSDoc annotations
// These files contain @swagger annotations that get picked up by swagger-jsdoc
import './auth-routes.js';

/**
 * Documentation metadata
 */
export const docsConfig = {
  version: '1.0.0',
  title: 'Group Planner API',
  description: 'Comprehensive REST API for group travel planning',
  basePath: '/api/v1',
  docsPath: '/docs',
  specPath: '/docs/openapi.json',
  healthPath: '/docs/health',
};

/**
 * Get documentation URLs for different environments
 */
export function getDocumentationUrls(baseUrl?: string) {
  const base = baseUrl || process.env.API_BASE_URL || 'http://localhost:3000';

  return {
    docs: `${base}${docsConfig.docsPath}`,
    spec: `${base}${docsConfig.specPath}`,
    health: `${base}${docsConfig.healthPath}`,
    api: `${base}${docsConfig.basePath}`,
  };
}

/**
 * API documentation summary for developers
 */
export const apiDocsSummary = {
  authentication: {
    type: 'JWT Bearer Token',
    accessTokenExpiry: '15 minutes',
    refreshTokenExpiry: '30 days',
    loginEndpoint: '/auth/login',
    refreshEndpoint: '/auth/refresh',
    logoutEndpoint: '/auth/logout',
  },
  rateLimiting: {
    login: '5 requests per 15 minutes per email',
    register: '3 requests per hour per IP',
    general: '100 requests per 15 minutes per IP',
    sensitive: '10 requests per 15 minutes per user',
  },
  responseFormat: {
    success: {
      success: true,
      message: 'Success message',
      data: 'Response data',
      requestId: 'Unique request ID',
      timestamp: 'ISO 8601 timestamp',
    },
    error: {
      success: false,
      error: {
        message: 'Error message',
        code: 'ErrorType',
        details: 'Optional error details',
      },
      requestId: 'Unique request ID',
      timestamp: 'ISO 8601 timestamp',
    },
  },
  endpoints: {
    authentication: [
      'POST /auth/register',
      'POST /auth/login',
      'POST /auth/refresh',
      'POST /auth/logout',
      'GET /auth/me',
      'PUT /auth/me',
      'PUT /auth/password',
      'GET /auth/sessions',
      'DELETE /auth/sessions',
      'DELETE /auth/sessions/:tokenId',
      'GET /auth/check',
      'POST /auth/validate-email',
      'POST /auth/validate-username',
      'GET /auth/health',
    ],
    documentation: [
      'GET /docs',
      'GET /docs/openapi.json',
      'GET /docs/health',
    ],
  },
};