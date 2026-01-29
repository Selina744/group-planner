# Testing Design & Strategy
## Group Planner Application

### Table of Contents
1. [Overview](#overview)
2. [Backend Testing Strategy](#backend-testing-strategy)
3. [Frontend Testing Strategy](#frontend-testing-strategy)
4. [Testing Infrastructure](#testing-infrastructure)
5. [Implementation Plan](#implementation-plan)
6. [Testing Standards](#testing-standards)
7. [CI/CD Integration](#cicd-integration)

---

## Overview

### Testing Philosophy
The Group Planner application follows a comprehensive testing strategy that ensures reliability, maintainability, and confidence in deployments. Our testing approach emphasizes:

- **Quality over Quantity**: Focus on meaningful tests that catch real issues
- **Test Pyramid**: Heavy unit testing, moderate integration testing, light E2E testing
- **Shift-Left Testing**: Early testing in the development process
- **Production Parity**: Test environments that closely mirror production

### Testing Levels
```
    /\
   /  \     E2E Tests (Few)
  /____\    Integration Tests (Some)
 /      \   Unit Tests (Many)
/________\
```

### Tech Stack Summary
- **Backend**: Vitest + Supertest + Prisma Test Utils
- **Frontend**: Vitest + Testing Library + jsdom
- **E2E**: Playwright (future implementation)
- **Coverage**: Built-in Vitest coverage with c8

---

## Backend Testing Strategy

### Current Infrastructure Status
✅ **Vitest** configured as test runner
✅ **Supertest** available for API testing
✅ **TypeScript** support ready
✅ **Bun** integration available
❌ **Test files** need to be created
❌ **Test configuration** needs setup

### Test Categories

#### 1. Unit Tests
**Scope**: Individual functions, classes, and modules in isolation

**Target Areas**:
```typescript
// Service Layer Tests
├── src/services/
│   ├── auth.test.ts          // AuthService methods
│   ├── jwt.test.ts           // JWT token operations
│   ├── notification.test.ts  // Notification management
│   └── health.test.ts        // Health service utilities

// Utility Tests
├── src/utils/
│   ├── logger.test.ts        // Logging functionality
│   ├── errors.test.ts        // Custom error classes
│   ├── apiResponse.test.ts   // Response formatting
│   └── wrapAsync.test.ts     // Async error handling

// Middleware Tests
├── src/middleware/
│   ├── auth.test.ts          // JWT authentication
│   ├── rbac.test.ts          // Permission validation
│   ├── validation.test.ts    // Request validation
│   ├── rateLimit.test.ts     // Rate limiting logic
│   ├── cors.test.ts          // CORS configuration
│   └── security.test.ts      // Security headers

// Server Architecture Tests
├── src/__tests__/
│   ├── server.test.ts        // GroupPlannerServer lifecycle
│   └── app.test.ts           // Express app configuration
```

**Example Unit Test Structure**:
```typescript
// src/services/__tests__/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../auth.js'
import { JwtService } from '../jwt.js'
import { prisma } from '../lib/prisma.js'
import * as bcrypt from 'bcrypt'

// Mock external dependencies
vi.mock('../lib/prisma.js')
vi.mock('../jwt.js')
vi.mock('bcrypt')

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('registerUser', () => {
    it('should create user with hashed password and generate JWT tokens', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        displayName: 'Test User',
        timezone: 'UTC'
      }

      const hashedPassword = '$2b$12$hashedpassword'
      const mockUser = { id: '1', ...userData, hashedPassword }
      const mockTokens = { accessToken: 'access', refreshToken: 'refresh' }

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword)
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser)
      vi.mocked(JwtService.generateTokenPair).mockResolvedValue(mockTokens)

      // Act
      const result = await AuthService.registerUser(userData)

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          username: userData.username,
          hashedPassword
        })
      })
      expect(JwtService.generateTokenPair).toHaveBeenCalledWith(mockUser)
      expect(result).toEqual({
        user: expect.objectContaining({
          email: userData.email,
          username: userData.username
        }),
        tokens: mockTokens
      })
    })

    it('should throw ConflictError for duplicate email', async () => {
      // Arrange
      const userData = { email: 'existing@example.com', username: 'test', password: 'pass' }
      vi.mocked(prisma.user.create).mockRejectedValue(
        new Error('Unique constraint violation')
      )

      // Act & Assert
      await expect(AuthService.registerUser(userData))
        .rejects.toThrow('User with this email already exists')
    })
  })
})
```

#### 2. Integration Tests
**Scope**: Multiple components working together, including database operations

**Target Areas**:
```typescript
// Database Integration Tests
├── src/__tests__/integration/
│   ├── auth-flow.test.ts     // Complete auth workflows
│   ├── trip-management.test.ts // Trip CRUD operations
│   ├── user-profiles.test.ts   // User management flows
│   └── notifications.test.ts   // Notification systems

// Middleware Integration
├── src/middleware/__tests__/integration/
│   ├── auth-pipeline.test.ts     // Full auth middleware stack
│   ├── validation-flow.test.ts   // Request validation pipeline
│   ├── middleware-presets.test.ts // middlewarePresets configuration
│   ├── rbac-integration.test.ts  // RBAC with auth context
│   ├── security-stack.test.ts    // Complete security middleware
│   └── error-handling.test.ts    // Error middleware integration

**Example Middleware Integration Test**:
```typescript
// src/middleware/__tests__/integration/middleware-presets.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import { middlewarePresets } from '../index.js'

describe('Middleware Presets Integration', () => {
  describe('middlewarePresets.register', () => {
    it('should apply correct middleware stack for registration', async () => {
      const app = express()

      // Apply register preset
      app.post('/test', ...middlewarePresets.register, (req, res) => {
        res.json({ success: true })
      })

      // Test rate limiting
      const responses = await Promise.all(
        Array(6).fill(0).map(() =>
          request(app).post('/test').send({})
        )
      )

      const successCount = responses.filter(r => r.status === 200).length
      const rateLimitedCount = responses.filter(r => r.status === 429).length

      expect(rateLimitedCount).toBeGreaterThan(0) // Some should be rate limited
    })
  })

  describe('middlewarePresets.protected', () => {
    it('should require valid JWT token', async () => {
      const app = express()

      app.get('/test', ...middlewarePresets.protected, (req, res) => {
        res.json({ user: req.user })
      })

      // Test without token
      await request(app)
        .get('/test')
        .expect(401)

      // Test with invalid token
      await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })
  })
})
```
```

**Test Database Strategy**:
```typescript
// Test database configuration
export const testConfig = {
  database: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/group_planner_test'
  }
}

// Database test utilities
export class DatabaseTestUtils {
  static async setupTestDb() {
    // Create savepoint for fast rollback
    await prisma.$executeRaw`SAVEPOINT test_start`
  }

  static async teardownTestDb() {
    await prisma.$disconnect()
  }

  static async cleanDatabase() {
    // Use transaction with proper foreign key ordering
    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.notificationPreference.deleteMany(),
      prisma.announcement.deleteMany(),
      prisma.itemClaim.deleteMany(),
      prisma.item.deleteMany(),
      prisma.event.deleteMany(),
      prisma.tripExtension.deleteMany(),
      prisma.tripMember.deleteMany(),
      prisma.trip.deleteMany(),
      prisma.passwordReset.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany()
    ])
  }

  static async resetToSnapshot() {
    // Fast database reset using savepoint rollback
    await prisma.$executeRaw`ROLLBACK TO SAVEPOINT test_start`
    await prisma.$executeRaw`SAVEPOINT test_start`
  }

  static async createTestUser(overrides = {}) {
    return prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        hashedPassword: '$2b$12$hashedpassword',
        displayName: 'Test User',
        timezone: 'UTC',
        ...overrides
      }
    })
  }

  static async createTestTrip(hostId: string, overrides = {}) {
    return prisma.trip.create({
      data: {
        name: 'Test Trip',
        description: 'A test trip',
        destination: 'Test City',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-07'),
        hostId,
        status: 'PLANNING',
        ...overrides
      }
    })
  }

  static async createTestEvent(tripId: string, suggestedById: string, overrides = {}) {
    return prisma.event.create({
      data: {
        title: 'Test Event',
        description: 'A test event',
        tripId,
        suggestedById,
        startTime: new Date('2024-06-02T10:00:00Z'),
        endTime: new Date('2024-06-02T12:00:00Z'),
        status: 'PROPOSED',
        ...overrides
      }
    })
  }

  static async createTestNotification(userId: string, overrides = {}) {
    return prisma.notification.create({
      data: {
        userId,
        type: 'TRIP_UPDATE',
        title: 'Test Notification',
        body: 'A test notification',
        ...overrides
      }
    })
  }
}
```

#### 3. Server Architecture Tests
**Scope**: Testing the GroupPlannerServer class and application lifecycle

**Target Areas**:
```typescript
// Server Lifecycle Tests
├── src/__tests__/server/
│   ├── server-lifecycle.test.ts    // Initialization, startup, shutdown
│   ├── process-management.test.ts  // Process monitoring utilities
│   ├── graceful-shutdown.test.ts   // SIGTERM/SIGINT handling
│   └── error-recovery.test.ts      // Error handling and recovery

// Application Configuration Tests
├── src/__tests__/app/
│   ├── middleware-stack.test.ts    // Middleware composition and ordering
│   ├── route-registration.test.ts  // Route setup and configuration
│   └── documentation.test.ts       // Swagger UI integration
```

**Example Server Test**:
```typescript
// src/__tests__/server/server-lifecycle.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GroupPlannerServer } from '../server.js'
import { prisma } from '../lib/prisma.js'

describe('GroupPlannerServer', () => {
  let server: GroupPlannerServer

  beforeEach(() => {
    server = new GroupPlannerServer()
  })

  afterEach(async () => {
    await server?.shutdown()
  })

  describe('initialization', () => {
    it('should initialize all dependencies successfully', async () => {
      // Test database connection, middleware setup, route registration
      await expect(server.initialize()).resolves.not.toThrow()
      expect(server.isInitialized()).toBe(true)
    })

    it('should fail gracefully with missing environment variables', async () => {
      delete process.env.DATABASE_URL

      await expect(server.initialize())
        .rejects.toThrow('Missing required environment variable: DATABASE_URL')
    })
  })

  describe('lifecycle management', () => {
    it('should start server on specified port', async () => {
      await server.initialize()
      await server.start()

      expect(server.isRunning()).toBe(true)
      expect(server.getPort()).toBe(3000)
    })

    it('should shutdown gracefully', async () => {
      await server.initialize()
      await server.start()

      const shutdownSpy = vi.spyOn(server, 'shutdown')
      process.emit('SIGTERM', 'SIGTERM')

      await vi.waitFor(() => {
        expect(shutdownSpy).toHaveBeenCalled()
      })
    })
  })
})

**Health Monitoring System Tests**:
```typescript
// src/__tests__/integration/health-monitoring.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { HealthService } from '../services/health.js'
import { ProcessManager } from '../utils/processManager.js'
import { DatabaseTestUtils } from './utils/database.js'

describe('Health Monitoring System', () => {
  beforeEach(async () => {
    await DatabaseTestUtils.setupTestDb()
  })

  describe('HealthService', () => {
    it('should perform basic health check', async () => {
      const result = await HealthService.basicHealthCheck()

      expect(result).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(Date),
        uptime: expect.any(Number)
      })
    })

    it('should perform detailed health check with system metrics', async () => {
      const result = await HealthService.detailedHealthCheck()

      expect(result).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(Date),
        uptime: expect.any(Number),
        database: {
          status: 'connected',
          latency: expect.any(Number)
        },
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number)
        },
        process: {
          pid: expect.any(Number),
          version: expect.any(String),
          platform: expect.any(String)
        }
      })
    })
  })
})
```

#### 4. API Tests
**Scope**: Full HTTP request/response testing

**Target Areas**:
```typescript
// API Endpoint Tests
├── src/__tests__/api/
│   ├── auth-endpoints.test.ts        // /api/v1/auth/*
│   ├── health-endpoints.test.ts      // /api/v1/health/*
│   ├── documentation-endpoints.test.ts // /docs, /docs/openapi.json
│   ├── trip-endpoints.test.ts        // /api/v1/trips/* (future)
│   └── user-endpoints.test.ts        // /api/v1/users/* (future)
```

**Example API Test**:
```typescript
// src/__tests__/api/auth-endpoints.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../app.js'
import { DatabaseTestUtils } from '../utils/database.js'

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    await DatabaseTestUtils.setupTestDb()
  })

  afterEach(async () => {
    await DatabaseTestUtils.teardownTestDb()
  })

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePass123!'
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('registered'),
        data: {
          user: {
            email: userData.email,
            username: userData.username
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      })
    })

    it('should return 409 for duplicate email', async () => {
      // Create existing user
      await DatabaseTestUtils.createTestUser({ email: 'test@example.com' })

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          username: 'newuser',
          password: 'password123'
        })
        .expect(409)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Create user and get initial tokens
      const user = await DatabaseTestUtils.createTestUser()
      const tokens = await JwtService.generateTokenPair(user)

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200)

      expect(response.body.data.tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String)
      })
    })
  })
})

**Example Documentation Endpoint Test**:
```typescript
// src/__tests__/api/documentation-endpoints.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../../app.js'

describe('Documentation Endpoints', () => {
  describe('GET /docs', () => {
    it('should serve Swagger UI interface', async () => {
      const response = await request(app)
        .get('/docs')
        .expect(200)

      expect(response.headers['content-type']).toMatch(/text\/html/)
      expect(response.text).toContain('swagger-ui')
    })
  })

  describe('GET /docs/openapi.json', () => {
    it('should return valid OpenAPI specification', async () => {
      const response = await request(app)
        .get('/docs/openapi.json')
        .expect(200)

      expect(response.headers['content-type']).toMatch(/application\/json/)

      const spec = response.body
      expect(spec).toMatchObject({
        openapi: '3.0.0',
        info: {
          title: 'Group Planner API',
          version: expect.any(String)
        },
        paths: expect.any(Object),
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      })

      // Validate auth endpoints are documented
      expect(spec.paths['/api/v1/auth/register']).toBeDefined()
      expect(spec.paths['/api/v1/auth/login']).toBeDefined()
      expect(spec.paths['/api/v1/auth/refresh']).toBeDefined()
    })
  })

  describe('GET /docs/health', () => {
    it('should return documentation service health', async () => {
      const response = await request(app)
        .get('/docs/health')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
          timestamp: expect.any(String)
        }
      })
    })
  })
})
```

#### 5. Security Tests
**Scope**: Authentication, authorization, and security vulnerability testing

**Target Areas**:
```typescript
// Security Tests
├── src/__tests__/security/
│   ├── jwt-security.test.ts          // Token expiration, rotation, validation
│   ├── input-validation.test.ts      // SQL injection, XSS prevention
│   ├── rate-limiting.test.ts         // Rate limiter effectiveness
│   ├── cors-security.test.ts         // CORS policy validation
│   ├── rbac-security.test.ts         // Role-based access control
│   └── csrf-protection.test.ts       // CSRF attack prevention
```

**Example Security Test**:
```typescript
// src/__tests__/security/jwt-security.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JwtService } from '../services/jwt.js'
import { AuthService } from '../services/auth.js'
import { DatabaseTestUtils } from './utils/database.js'
import jwt from 'jsonwebtoken'

describe('JWT Security Tests', () => {
  let testUser: any

  beforeEach(async () => {
    testUser = await DatabaseTestUtils.createTestUser()
  })

  describe('Token Expiration', () => {
    it('should reject expired access tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      )

      await expect(JwtService.verifyAccessToken(expiredToken))
        .rejects.toThrow('Token expired')
    })

    it('should reject malformed tokens', async () => {
      const malformedToken = 'invalid.token.format'

      await expect(JwtService.verifyAccessToken(malformedToken))
        .rejects.toThrow('Invalid token')
    })
  })

  describe('Refresh Token Family Rotation', () => {
    it('should invalidate entire token family on reuse', async () => {
      const { refreshToken } = await JwtService.generateTokenPair(testUser)

      // First refresh - should succeed
      const firstRefresh = await AuthService.refreshTokens(refreshToken)
      expect(firstRefresh.tokens.refreshToken).not.toBe(refreshToken)

      // Second refresh with old token - should fail and invalidate family
      await expect(AuthService.refreshTokens(refreshToken))
        .rejects.toThrow('Token family compromised')

      // New token should also be invalid
      await expect(AuthService.refreshTokens(firstRefresh.tokens.refreshToken))
        .rejects.toThrow('Token family compromised')
    })
  })

  describe('Token Payload Security', () => {
    it('should not expose sensitive user data in JWT payload', () => {
      const token = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET!)
      const decoded = jwt.decode(token) as any

      expect(decoded.userId).toBe(testUser.id)
      expect(decoded.password).toBeUndefined()
      expect(decoded.hashedPassword).toBeUndefined()
      expect(decoded.email).toBeUndefined()
    })
  })
})
```

**Input Validation Security Tests**:
```typescript
// src/__tests__/security/input-validation.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../../app.js'

describe('Input Validation Security', () => {
  describe('SQL Injection Prevention', () => {
    it('should sanitize malicious SQL in email field', async () => {
      const maliciousInput = {
        email: "admin@test.com'; DROP TABLE users; --",
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(maliciousInput)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Invalid email format')
    })

    it('should reject script injection in username', async () => {
      const maliciousInput = {
        email: 'test@example.com',
        username: '<script>alert("xss")</script>',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(maliciousInput)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Invalid username')
    })
  })

  describe('Rate Limiting Effectiveness', () => {
    it('should block excessive login attempts', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' }

      // Make 6 rapid requests (limit is 5)
      const requests = Array(6).fill(0).map(() =>
        request(app).post('/api/v1/auth/login').send(credentials)
      )

      const responses = await Promise.all(requests)
      const rateLimitedCount = responses.filter(r => r.status === 429).length

      expect(rateLimitedCount).toBeGreaterThan(0)
    })
  })

  describe('CSRF Protection', () => {
    it('should require proper CORS headers for sensitive operations', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .send({ email: 'test@example.com', password: 'password123' })

      expect(response.status).toBe(403)
    })
  })
})
```

### Backend Test Configuration

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/generated/',
        '**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
```

**Test Setup File**:
```typescript
// src/__tests__/setup.ts
import { beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { DatabaseTestUtils } from './utils/database.js'

beforeAll(async () => {
  // One-time global setup
  await DatabaseTestUtils.setupTestDb()
})

beforeEach(async () => {
  // Per-test isolation - clean database before each test
  await DatabaseTestUtils.cleanDatabase()
})

afterEach(async () => {
  // Optional: Additional cleanup if needed
  // Most cleanup handled by beforeEach
})

afterAll(async () => {
  // Global test cleanup
  await DatabaseTestUtils.teardownTestDb()
})
```

---

## Frontend Testing Strategy

### Required Dependencies
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "jsdom": "^23.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.5.0",
    "msw": "^2.0.0"
  }
}
```

### Test Categories

#### 1. Component Unit Tests
**Scope**: Individual React components in isolation

**Target Areas**:
```typescript
// Component Tests
├── src/components/__tests__/
│   ├── FeatureCard.test.tsx      // Feature showcase component
│   ├── Navigation.test.tsx       // Navigation components
│   ├── AuthForms.test.tsx        // Authentication forms
│   └── TripComponents.test.tsx   // Trip-related components

// Hook Tests
├── src/hooks/__tests__/
│   ├── useAuth.test.ts           // Authentication hooks
│   ├── useApi.test.ts            // API interaction hooks
│   └── useLocalStorage.test.ts   // Browser storage hooks
```

**Example Component Test**:
```typescript
// src/components/__tests__/FeatureCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FeatureCard from '../FeatureCard'

describe('FeatureCard', () => {
  const mockFeature = {
    title: 'Test Feature',
    description: 'A test feature description',
    icon: '🎯'
  }

  it('should render feature information correctly', () => {
    render(<FeatureCard feature={mockFeature} />)

    expect(screen.getByText('Test Feature')).toBeInTheDocument()
    expect(screen.getByText('A test feature description')).toBeInTheDocument()
    expect(screen.getByText('🎯')).toBeInTheDocument()
  })

  it('should be accessible', () => {
    render(<FeatureCard feature={mockFeature} />)

    const card = screen.getByRole('article') // or appropriate role
    expect(card).toBeInTheDocument()
  })
})
```

#### 2. Integration Tests
**Scope**: Multiple components working together

**Target Areas**:
```typescript
// Integration Tests
├── src/__tests__/integration/
│   ├── auth-flow.test.tsx        // Login/register flows
│   ├── trip-creation.test.tsx    // Trip creation workflows
│   ├── user-profile.test.tsx     // Profile management flows
│   └── navigation.test.tsx       // App navigation scenarios
```

#### 3. API Integration Tests
**Scope**: Frontend-backend API communication

**Mock Strategy with MSW**:
```typescript
// src/__tests__/mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  rest.post('/api/v1/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          user: { id: '1', username: 'testuser' },
          tokens: { accessToken: 'mock-token' }
        }
      })
    )
  }),

  rest.get('/api/v1/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: { status: 'healthy' }
      })
    )
  })
]
```

### Frontend Test Configuration

**vitest.config.ts** (frontend):
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        }
      }
    }
  }
})
```

**Frontend Test Setup**:
```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Mock Service Worker setup
beforeAll(() => server.listen())
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
```

---

## Testing Infrastructure

### Test Database Management

**Docker Test Database**:
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: group_planner_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data
```

**Test Environment Configuration**:
```bash
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5433/group_planner_test
JWT_SECRET=test-jwt-secret-key-for-testing-only
REDIS_URL=redis://localhost:6380
LOG_LEVEL=error
```

### Test Data Management

**Factories & Fixtures**:
```typescript
// src/__tests__/factories/user.factory.ts
import { faker } from '@faker-js/faker'

export const createUserData = (overrides = {}) => ({
  email: faker.internet.email(),
  username: faker.internet.userName(),
  password: 'TestPass123!',
  displayName: faker.person.fullName(),
  timezone: 'UTC',
  ...overrides
})

export const createTripData = (hostId: string, overrides = {}) => ({
  name: faker.lorem.words(3),
  description: faker.lorem.sentence(),
  destination: faker.location.city(),
  startDate: faker.date.future(),
  endDate: faker.date.future(),
  hostId,
  status: 'PLANNING',
  isPublic: false,
  maxMembers: faker.number.int({ min: 5, max: 20 }),
  ...overrides
})

export const createEventData = (tripId: string, suggestedById: string, overrides = {}) => ({
  title: faker.lorem.words(2),
  description: faker.lorem.sentence(),
  tripId,
  suggestedById,
  startTime: faker.date.future(),
  endTime: faker.date.future(),
  status: 'PROPOSED',
  category: faker.helpers.arrayElement(['TRANSPORT', 'ACCOMMODATION', 'ACTIVITY', 'MEAL']),
  estimatedCost: faker.number.float({ min: 10, max: 500 }),
  currency: 'USD',
  ...overrides
})

export const createItemData = (tripId: string, createdById: string, overrides = {}) => ({
  name: faker.lorem.words(2),
  description: faker.lorem.sentence(),
  tripId,
  createdById,
  type: faker.helpers.arrayElement(['RECOMMENDED', 'SHARED']),
  quantityNeeded: faker.number.int({ min: 1, max: 5 }),
  isEssential: faker.datatype.boolean(),
  category: faker.helpers.arrayElement(['CLOTHING', 'ELECTRONICS', 'DOCUMENTS', 'TOILETRIES']),
  ...overrides
})

export const createNotificationData = (userId: string, overrides = {}) => ({
  userId,
  type: faker.helpers.arrayElement(['TRIP_UPDATE', 'EVENT_PROPOSED', 'ITEM_CLAIMED', 'MEMBER_JOINED']),
  title: faker.lorem.words(4),
  body: faker.lorem.sentence(),
  payload: {},
  ...overrides
})
```

**Database Seeding**:
```typescript
// src/__tests__/utils/seeder.ts
export class TestSeeder {
  static async seedBasicData() {
    const users = await Promise.all([
      DatabaseTestUtils.createTestUser({ username: 'host1', email: 'host1@test.com' }),
      DatabaseTestUtils.createTestUser({ username: 'member1', email: 'member1@test.com' }),
      DatabaseTestUtils.createTestUser({ username: 'member2', email: 'member2@test.com' })
    ])

    const trip = await DatabaseTestUtils.createTestTrip(users[0].id)

    // Create trip members
    await prisma.tripMember.createMany({
      data: [
        { tripId: trip.id, userId: users[0].id, role: 'HOST', status: 'ACCEPTED' },
        { tripId: trip.id, userId: users[1].id, role: 'MEMBER', status: 'ACCEPTED' },
        { tripId: trip.id, userId: users[2].id, role: 'MEMBER', status: 'PENDING' }
      ]
    })

    // Create sample events
    const events = await Promise.all([
      DatabaseTestUtils.createTestEvent(trip.id, users[0].id, { title: 'Airport Pickup' }),
      DatabaseTestUtils.createTestEvent(trip.id, users[1].id, { title: 'City Tour' })
    ])

    // Create sample items
    const items = await Promise.all([
      prisma.item.create({
        data: createItemData(trip.id, users[0].id, { name: 'Sunscreen', type: 'RECOMMENDED' })
      }),
      prisma.item.create({
        data: createItemData(trip.id, users[1].id, { name: 'Portable Charger', type: 'SHARED' })
      })
    ])

    // Create notifications
    const notifications = await Promise.all([
      DatabaseTestUtils.createTestNotification(users[1].id, { type: 'TRIP_UPDATE', tripId: trip.id }),
      DatabaseTestUtils.createTestNotification(users[2].id, { type: 'EVENT_PROPOSED', tripId: trip.id })
    ])

    return { users, trip, events, items, notifications }
  }

  static async cleanDatabase() {
    // Order matters for foreign key constraints
    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.notificationPreference.deleteMany(),
      prisma.announcement.deleteMany(),
      prisma.itemClaim.deleteMany(),
      prisma.item.deleteMany(),
      prisma.event.deleteMany(),
      prisma.tripExtension.deleteMany(),
      prisma.tripMember.deleteMany(),
      prisma.trip.deleteMany(),
      prisma.passwordReset.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany()
    ])
  }

  static async seedCompleteWorkflow() {
    const { users, trip } = await this.seedBasicData()

    // Create notification preferences
    await prisma.notificationPreference.createMany({
      data: users.map(user => ({
        userId: user.id,
        tripId: trip.id,
        emailEnabled: true,
        pushEnabled: true,
        digestFrequency: 'DAILY'
      }))
    })

    // Create trip announcements
    await prisma.announcement.create({
      data: {
        tripId: trip.id,
        authorId: users[0].id,
        title: 'Welcome to the Trip!',
        body: 'Looking forward to our amazing adventure together!'
      }
    })

    return { users, trip }
  }
}
```

### Email Service Testing

**Email Test Utilities**:
```typescript
// src/__tests__/utils/email.ts
import nodemailer from 'nodemailer'
import { vi } from 'vitest'

export class EmailTestUtils {
  static createMockTransporter() {
    return {
      sendMail: vi.fn().mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 Message accepted'
      }),
      verify: vi.fn().mockResolvedValue(true)
    }
  }

  static async createEtherealTestAccount() {
    const testAccount = await nodemailer.createTestAccount()
    return {
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    }
  }

  static extractEmailContent(mockCalls: any[]) {
    return mockCalls.map(call => ({
      to: call[0].to,
      subject: call[0].subject,
      html: call[0].html,
      text: call[0].text
    }))
  }

  static validateEmailTemplate(html: string, expectedContent: string[]) {
    expectedContent.forEach(content => {
      expect(html).toContain(content)
    })
  }
}
```

**Example Email Service Test**:
```typescript
// src/services/__tests__/email.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EmailService } from '../email.js'
import { EmailTestUtils } from '../__tests__/utils/email.js'

vi.mock('nodemailer')

describe('EmailService', () => {
  let mockTransporter: any

  beforeEach(() => {
    mockTransporter = EmailTestUtils.createMockTransporter()
    vi.mocked(EmailService.prototype.transporter).mockReturnValue(mockTransporter)
  })

  describe('sendVerificationEmail', () => {
    it('should send email with correct verification link', async () => {
      const user = { email: 'test@example.com', displayName: 'Test User' }
      const verificationToken = 'verification-token-123'

      await EmailService.sendVerificationEmail(user, verificationToken)

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: expect.stringContaining('Verify'),
          html: expect.stringContaining(verificationToken)
        })
      )
    })

    it('should include user display name in email', async () => {
      const user = { email: 'test@example.com', displayName: 'John Doe' }
      const verificationToken = 'token'

      await EmailService.sendVerificationEmail(user, verificationToken)

      const emailCalls = EmailTestUtils.extractEmailContent(mockTransporter.sendMail.mock.calls)
      expect(emailCalls[0].html).toContain('John Doe')
    })
  })

  describe('sendTripInviteEmail', () => {
    it('should send trip invitation with correct details', async () => {
      const inviteData = {
        recipientEmail: 'friend@example.com',
        recipientName: 'Friend',
        trip: { name: 'Awesome Trip', destination: 'Hawaii' },
        inviterName: 'John',
        inviteCode: 'HAWAII2024'
      }

      await EmailService.sendTripInviteEmail(inviteData)

      const emailCalls = EmailTestUtils.extractEmailContent(mockTransporter.sendMail.mock.calls)
      EmailTestUtils.validateEmailTemplate(emailCalls[0].html, [
        'Awesome Trip',
        'Hawaii',
        'John',
        'HAWAII2024'
      ])
    })
  })
})
```

### Redis Testing Strategy

**Redis Test Utilities**:
```typescript
// src/__tests__/utils/redis.ts
import { createClient } from 'redis'
import { vi } from 'vitest'

export class RedisTestUtils {
  private static testClient: any

  static async setupTestRedis() {
    this.testClient = createClient({
      url: process.env.TEST_REDIS_URL || 'redis://localhost:6380/1'
    })
    await this.testClient.connect()
  }

  static async flushTestRedis() {
    if (this.testClient) {
      await this.testClient.flushDb()
    }
  }

  static async teardownTestRedis() {
    if (this.testClient) {
      await this.testClient.disconnect()
    }
  }

  static createMockRedisClient() {
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      expire: vi.fn(),
      flushDb: vi.fn().mockResolvedValue('OK')
    }
  }

  static mockRedisOperations(operations: Record<string, any>) {
    const mockClient = this.createMockRedisClient()
    Object.entries(operations).forEach(([method, returnValue]) => {
      mockClient[method as keyof typeof mockClient].mockResolvedValue(returnValue)
    })
    return mockClient
  }
}
```

**Example Redis Integration Test**:
```typescript
// src/__tests__/integration/redis-session.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RedisTestUtils } from '../utils/redis.js'
import { SessionManager } from '../../lib/session.js'

describe('Redis Session Integration', () => {
  beforeEach(async () => {
    await RedisTestUtils.setupTestRedis()
    await RedisTestUtils.flushTestRedis()
  })

  afterEach(async () => {
    await RedisTestUtils.teardownTestRedis()
  })

  it('should store and retrieve session data', async () => {
    const sessionData = { userId: '123', role: 'USER' }
    const sessionId = await SessionManager.createSession(sessionData)

    const retrievedData = await SessionManager.getSession(sessionId)
    expect(retrievedData).toEqual(sessionData)
  })

  it('should handle session expiration', async () => {
    const sessionData = { userId: '123' }
    const sessionId = await SessionManager.createSession(sessionData, 1) // 1 second TTL

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100))

    const retrievedData = await SessionManager.getSession(sessionId)
    expect(retrievedData).toBeNull()
  })
})
```

---

## Testing Standards

### Naming Conventions

**Test File Naming**:
- Unit tests: `ComponentName.test.tsx` or `serviceName.test.ts`
- Integration tests: `feature-flow.test.ts`
- API tests: `endpoint-name.test.ts`

**Test Structure (AAA Pattern)**:
```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do expected behavior when given valid input', () => {
      // Arrange: Set up test data and conditions
      const input = createTestData()

      // Act: Execute the code under test
      const result = methodUnderTest(input)

      // Assert: Verify the expected outcome
      expect(result).toEqual(expectedOutput)
    })
  })
})
```

### Test Data Principles

1. **Isolation**: Each test should be independent
2. **Deterministic**: Tests should produce consistent results
3. **Clean**: Use factories instead of hard-coded values
4. **Realistic**: Test data should reflect real-world scenarios

### Assertion Guidelines

**Prefer Specific Assertions**:
```typescript
// ❌ Too generic
expect(result).toBeTruthy()

// ✅ Specific and meaningful
expect(result.email).toBe('test@example.com')
expect(result.tokens.accessToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
```

**Error Testing**:
```typescript
// ❌ Generic error testing
expect(() => methodThatThrows()).toThrow()

// ✅ Specific error testing
expect(() => methodThatThrows()).toThrow(ValidationError)
expect(() => methodThatThrows()).toThrow('Email is required')
```

---

## Implementation Plan

### Phase 1: Core Foundation Testing (Week 1) - **IMMEDIATE PRIORITY**

**Critical Infrastructure Setup** (Days 1-2):
- [ ] Configure Vitest in backend workspace with proper TypeScript support
- [ ] Set up test database with Docker (separate test DB on port 5433)
- [ ] Create enhanced DatabaseTestUtils with improved isolation strategy
- [ ] Configure test environment variables and .env.test file
- [ ] Set up Redis test utilities for session/caching tests

**Security & Authentication Testing** (Days 3-5):
- [ ] Implement AuthService unit tests (register, login, password validation)
- [ ] Create JwtService unit tests (token generation, validation, expiration)
- [ ] Add security testing suite (JWT security, input validation, rate limiting)
- [ ] Test middleware stack (auth, RBAC, validation, security headers)
- [ ] Implement refresh token rotation and family invalidation tests

**API Endpoint Testing** (Days 6-7):
- [ ] Create API test utilities with Supertest
- [ ] Test authentication endpoints (/auth/register, /auth/login, /auth/refresh)
- [ ] Test health monitoring endpoints (/health, /health/detailed)
- [ ] Test documentation endpoints (/docs, /docs/openapi.json)
- [ ] Achieve 80% coverage on core authentication flows

**Why This Focus**: Start with authentication since it's the foundation for all other features and has the highest security risk.

### Phase 2: Feature Testing (Week 2) - **AFTER CORE FEATURES IMPLEMENTED**
**Backend Implementation**:
- [ ] Complete auth service tests (AuthService, JwtService)
- [ ] Add middleware testing (auth, RBAC, validation, security)
- [ ] Implement API endpoint tests (auth, health, documentation)
- [ ] Add database integration tests (comprehensive schema)
- [ ] Test GroupPlannerServer lifecycle and process management
- [ ] Achieve 80% code coverage

**Frontend Implementation**:
- [ ] Test all existing components
- [ ] Add integration tests for user flows
- [ ] Implement API integration tests
- [ ] Add accessibility testing
- [ ] Achieve 75% code coverage

### Phase 3: Advanced Testing (Week 4)
**E2E Testing Setup**:
- [ ] Install and configure Playwright
- [ ] Create critical user journey tests
- [ ] Implement visual regression testing
- [ ] Add performance testing

**Quality Assurance**:
- [ ] Add mutation testing with Stryker
- [ ] Implement contract testing
- [ ] Add load testing for APIs
- [ ] Create testing documentation

### Phase 4: Optimization (Week 5)
**Performance & Reliability**:
- [ ] Optimize test execution speed
- [ ] Add parallel test execution
- [ ] Implement test result caching
- [ ] Add flaky test detection

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: group_planner_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun typecheck

      - name: Run backend tests
        run: bun --filter backend test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5433/group_planner_test

      - name: Run frontend tests
        run: bun --filter frontend test

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info,./frontend/coverage/lcov.info
```

### Test Scripts Package.json Updates

**Root package.json**:
```json
{
  "scripts": {
    "test": "bun --filter '*' test",
    "test:watch": "bun --filter '*' test:watch",
    "test:coverage": "bun --filter '*' test --coverage",
    "test:ci": "bun --filter '*' test --coverage --reporter=junit",
    "test:backend": "bun --filter backend test",
    "test:frontend": "bun --filter frontend test",
    "test:e2e": "playwright test"
  }
}
```

---

## Monitoring & Metrics

### Coverage Targets
- **Backend**: 80% overall coverage
  - Services: 90% coverage
  - Controllers: 85% coverage
  - Middleware: 85% coverage
  - Utilities: 90% coverage

- **Frontend**: 75% overall coverage
  - Components: 80% coverage
  - Hooks: 85% coverage
  - Utilities: 90% coverage

### Quality Gates
- All tests must pass before merge
- Coverage thresholds must be maintained
- No critical security vulnerabilities
- Performance budgets met

### Test Metrics Tracking
- Test execution time trends
- Flaky test identification
- Coverage evolution
- Test maintenance overhead

---

## Future Enhancements

### Advanced Testing Features
1. **Visual Regression Testing**: Automated UI change detection
2. **Performance Testing**: API and frontend performance benchmarks
3. **Accessibility Testing**: Automated a11y compliance verification
4. **Security Testing**: Automated security vulnerability scanning
5. **Load Testing**: API endpoint stress testing
6. **Contract Testing**: API contract validation between services

### Testing Infrastructure Evolution
1. **Test Data Management**: Advanced test data versioning and management
2. **Parallel Execution**: Distributed test execution for faster feedback
3. **Test Analytics**: Advanced test result analytics and insights
4. **Auto-healing Tests**: Self-healing test infrastructure
5. **AI-Assisted Testing**: Automated test generation and maintenance

---

This comprehensive testing design provides a solid foundation for building reliable, maintainable, and well-tested Group Planner application. The strategy balances thorough testing coverage with practical implementation considerations, ensuring both quality and developer productivity.