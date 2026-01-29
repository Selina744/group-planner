/**
 * OpenAPI/Swagger documentation configuration for Group Planner API
 *
 * This module sets up comprehensive API documentation with Swagger UI
 * including authentication, request/response schemas, and examples.
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';
import { log } from '../utils/logger.js';

/**
 * OpenAPI specification configuration
 */
const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Group Planner API',
    version: '1.0.0',
    description: `
# Group Planner API

A comprehensive REST API for managing group travel planning, itineraries, and member coordination.

## Features

- 🔐 **Authentication**: JWT-based authentication with refresh tokens
- 👥 **User Management**: User registration, profiles, and session management
- 🗺️ **Trip Planning**: Create and manage group trips and itineraries
- 🛡️ **Security**: Rate limiting, CORS, and comprehensive error handling
- 📚 **Documentation**: Complete API documentation with examples

## Authentication

This API uses JWT (JSON Web Tokens) for authentication. Include the access token in the Authorization header:

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

Access tokens expire after 15 minutes. Use the refresh endpoint to get new tokens.

## Rate Limiting

Different endpoints have different rate limits:
- **Login**: 5 attempts per 15 minutes per email
- **Registration**: 3 attempts per hour per IP
- **General API**: 100 requests per 15 minutes per IP
- **Sensitive Operations**: 10 requests per 15 minutes per user

## Error Responses

All error responses follow a consistent format:

\`\`\`json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ErrorType",
    "details": {}
  },
  "requestId": "unique-request-id",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`
`,
    contact: {
      name: 'Group Planner API Support',
      email: 'support@groupplanner.example.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.API_BASE_URL || 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.groupplanner.example.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token',
      },
    },
    schemas: {
      // Common schemas
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the request was successful',
          },
          message: {
            type: 'string',
            description: 'Human-readable message',
          },
          data: {
            description: 'Response data (varies by endpoint)',
          },
          requestId: {
            type: 'string',
            description: 'Unique request identifier',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Response timestamp',
          },
        },
        required: ['success'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            enum: [false],
          },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' },
            },
            required: ['message'],
          },
          requestId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['success', 'error'],
      },

      // Auth schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique user identifier',
            example: 'clh123abc456def789',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            example: 'user@example.com',
          },
          username: {
            type: 'string',
            nullable: true,
            description: 'Optional username',
            example: 'johndoe',
          },
          displayName: {
            type: 'string',
            nullable: true,
            description: 'Display name',
            example: 'John Doe',
          },
          timezone: {
            type: 'string',
            description: 'User timezone',
            example: 'America/New_York',
          },
          emailVerified: {
            type: 'boolean',
            description: 'Whether email is verified',
            example: true,
          },
          preferences: {
            type: 'object',
            description: 'User preferences object',
            example: { theme: 'dark', notifications: true },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
        required: ['id', 'email', 'timezone', 'emailVerified', 'preferences', 'createdAt', 'updatedAt'],
      },

      RegisterRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            example: 'user@example.com',
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'User password (min 8 chars, with uppercase, lowercase, number, special char)',
            example: 'SecurePass123!',
          },
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
            nullable: true,
            description: 'Optional username (3-20 chars, alphanumeric, hyphens, underscores)',
            example: 'johndoe',
          },
          displayName: {
            type: 'string',
            nullable: true,
            description: 'Optional display name',
            example: 'John Doe',
          },
          timezone: {
            type: 'string',
            nullable: true,
            description: 'User timezone (defaults to UTC)',
            example: 'America/New_York',
          },
        },
        required: ['email', 'password'],
      },

      LoginRequest: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: 'Email or username',
            example: 'user@example.com',
          },
          password: {
            type: 'string',
            description: 'User password',
            example: 'SecurePass123!',
          },
        },
        required: ['identifier', 'password'],
      },

      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: {
            type: 'string',
            description: 'JWT access token (15min expiry)',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token (30day expiry)',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
        required: ['user', 'accessToken', 'refreshToken'],
      },

      RefreshRequest: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            description: 'Valid refresh token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
        required: ['refreshToken'],
      },

      UpdateProfileRequest: {
        type: 'object',
        properties: {
          displayName: {
            type: 'string',
            nullable: true,
            description: 'New display name',
            example: 'Jane Smith',
          },
          timezone: {
            type: 'string',
            nullable: true,
            description: 'New timezone',
            example: 'Europe/London',
          },
          username: {
            type: 'string',
            nullable: true,
            description: 'New username',
            example: 'janesmith',
          },
        },
      },

      ChangePasswordRequest: {
        type: 'object',
        properties: {
          currentPassword: {
            type: 'string',
            description: 'Current password',
            example: 'OldPass123!',
          },
          newPassword: {
            type: 'string',
            description: 'New password',
            example: 'NewPass456!',
          },
        },
        required: ['currentPassword', 'newPassword'],
      },

      Session: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tokenId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          userAgent: { type: 'string', nullable: true },
          ipAddress: { type: 'string', nullable: true },
          family: { type: 'string', nullable: true },
          isCurrent: { type: 'boolean' },
        },
        required: ['id', 'tokenId', 'createdAt', 'expiresAt', 'isCurrent'],
      },

      ValidationError: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
          value: {},
        },
        required: ['field', 'message'],
      },
    },

    responses: {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                message: 'Invalid request data',
                code: 'BadRequestError',
              },
              requestId: 'req_123456',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                message: 'Authentication required',
                code: 'UnauthorizedError',
              },
              requestId: 'req_123456',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                message: 'Insufficient permissions',
                code: 'ForbiddenError',
              },
              requestId: 'req_123456',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
        },
      },
      NotFound: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                message: 'Resource not found',
                code: 'NotFoundError',
              },
              requestId: 'req_123456',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
        },
      },
      Conflict: {
        description: 'Conflict',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                message: 'Resource conflict',
                code: 'ConflictError',
              },
              requestId: 'req_123456',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation Error',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        details: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ValidationError' },
                        },
                      },
                    },
                  },
                },
              ],
            },
            example: {
              success: false,
              error: {
                message: 'Validation failed',
                code: 'ValidationError',
                details: [
                  { field: 'email', message: 'Invalid email format' },
                  { field: 'password', message: 'Password too weak' },
                ],
              },
              requestId: 'req_123456',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
        },
      },
      TooManyRequests: {
        description: 'Too Many Requests',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                message: 'Too many requests. Please try again later.',
                code: 'RateLimitError',
              },
              requestId: 'req_123456',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
        },
        headers: {
          'X-RateLimit-Limit': {
            description: 'The number of allowed requests in the current period',
            schema: { type: 'integer' },
          },
          'X-RateLimit-Remaining': {
            description: 'The number of remaining requests in the current period',
            schema: { type: 'integer' },
          },
          'X-RateLimit-Reset': {
            description: 'The time when the rate limit resets',
            schema: { type: 'string', format: 'date-time' },
          },
        },
      },
      InternalServerError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                message: 'Internal server error',
                code: 'InternalServerError',
              },
              requestId: 'req_123456',
              timestamp: '2024-01-01T12:00:00.000Z',
            },
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Users',
      description: 'User profile management',
    },
    {
      name: 'Trips',
      description: 'Trip planning and management (coming soon)',
    },
    {
      name: 'Health',
      description: 'System health and monitoring',
    },
  ],
};

/**
 * Swagger JSDoc options
 */
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/docs/*.ts',
  ],
};

/**
 * Generate OpenAPI specification
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI options
 */
export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
  customSiteTitle: 'Group Planner API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'none',
    defaultModelRendering: 'model',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 3,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    filter: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
  },
};

/**
 * Health check endpoint for API docs
 */
export function docsHealthHandler(req: Request, res: Response): void {
  try {
    log.debug('API docs health check accessed');

    ApiResponse.success(res, 'API documentation is healthy', {
      status: 'healthy',
      version: swaggerDefinition.info.version,
      docsUrl: '/docs',
      specUrl: '/docs/openapi.json',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('API docs health check failed', error);
    ApiResponse.error(res, 'Documentation service unavailable', 503);
  }
}

/**
 * Export OpenAPI spec as JSON
 */
export function openApiSpecHandler(req: Request, res: Response): void {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  } catch (error) {
    log.error('Failed to serve OpenAPI spec', error);
    ApiResponse.error(res, 'OpenAPI specification unavailable', 503);
  }
}