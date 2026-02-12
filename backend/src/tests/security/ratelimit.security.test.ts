/**
 * Rate Limiting Security Tests
 *
 * Comprehensive security tests for rate limiting including:
 * - Login endpoint rate limiting
 * - Registration endpoint rate limiting
 * - Password reset rate limiting
 * - API general rate limiting
 * - Rate limit header verification
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import request from 'supertest';
import { app } from '../../app.js';
import { UserFixtures } from '../utils/test-fixtures.js';
import {
  getTestDb,
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase
} from '../utils/test-database.js';
import {
  RateLimitMiddleware,
  rateLimitStore,
  rateLimiters
} from '../../middleware/rateLimit.js';
// Note: We define our own mock response because the rate limit middleware uses res.set()
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, RateLimitStore } from '../../types/middleware.js';

/**
 * Create a mock request with AuthenticatedRequest properties
 * This extends the basic mock to include clientIp and other extended properties
 */
function createMockAuthRequest(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: undefined,
    ip: '127.0.0.1',
    clientIp: '127.0.0.1',
    method: 'GET',
    url: '/',
    path: '/',
    get: (header: string) => undefined,
    ...overrides
  } as AuthenticatedRequest;
}

/**
 * Create a mock response with headers support for rate limiting tests
 */
function createTestMockResponse(): {
  response: Partial<Response>;
  headers: Record<string, string>;
} {
  const headers: Record<string, string> = {};

  const response = {
    set: (headerObj: Record<string, string> | string, value?: string) => {
      if (typeof headerObj === 'string' && value !== undefined) {
        headers[headerObj] = value;
      } else if (typeof headerObj === 'object') {
        Object.assign(headers, headerObj);
      }
      return response;
    },
    status: (code: number) => response,
    json: (data: any) => response,
    send: (data: any) => response,
    locals: {}
  };

  return { response: response as Partial<Response>, headers };
}

/**
 * Create a better mock next function that tracks state properly
 */
function createTestMockNext(): {
  next: NextFunction;
  state: { called: boolean; calledWith?: Error };
} {
  const state = {
    called: false,
    calledWith: undefined as Error | undefined
  };

  const next = ((error?: any) => {
    state.called = true;
    if (error) {
      state.calledWith = error;
    }
  }) as NextFunction;

  return { next, state };
}

/**
 * Test-specific in-memory rate limit store that bypasses test environment skip
 */
class TestRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async get(key: string): Promise<number> {
    const data = this.store.get(key);
    if (!data) return 0;
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return 0;
    }
    return data.count;
  }

  async increment(key: string, ttl: number): Promise<number> {
    const now = Date.now();
    const data = this.store.get(key);
    if (!data || now > data.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + ttl });
      return 1;
    }
    data.count += 1;
    return data.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('Rate Limiting Security Tests', () => {
  const prisma = getTestDb();
  let testStore: TestRateLimitStore;

  beforeAll(async () => {
    await setupTestDatabase();
    testStore = new TestRateLimitStore();
  });

  beforeEach(async () => {
    await cleanDatabase();
    testStore.clear();
    // Also clear the default store
    await rateLimitStore.reset('*');
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Login Endpoint Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 5,
        windowMs: 60000,
        store: testStore,
        skip: () => false // Don't skip in tests
      });

      for (let i = 0; i < 5; i++) {
        const req = createMockAuthRequest({
          body: { email: 'test@example.com' },
          ip: '192.168.1.100',
          clientIp: '192.168.1.100',
          path: '/api/v1/auth/login',
          method: 'POST'
        }) as AuthenticatedRequest;

        const { response, headers } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);

        expect(state.called).toBe(true);
        expect(state.calledWith).toBeUndefined();
      }
    });

    it('should block requests exceeding rate limit', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 3,
        windowMs: 60000,
        store: testStore,
        skip: () => false
      });

      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.100',
          clientIp: '192.168.1.100',
          path: '/api/v1/auth/login',
          method: 'POST'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
        expect(state.called).toBe(true);
      }

      // 4th request should be blocked
      const req = createMockAuthRequest({
        ip: '192.168.1.100',
        clientIp: '192.168.1.100',
        path: '/api/v1/auth/login',
        method: 'POST'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.called).toBe(true);
      expect(state.calledWith).toBeDefined();
      expect(state.calledWith?.message).toContain('Too many requests');
    });

    it('should rate limit by email for login attempts', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 3,
        windowMs: 60000,
        store: testStore,
        skip: () => false,
        keyGenerator: (req: AuthenticatedRequest) => {
          const email = req.body?.email || req.body?.identifier;
          if (email && typeof email === 'string') {
            return `email:${email.toLowerCase()}`;
          }
          return `ip:${req.clientIp || req.ip}`;
        }
      });

      // Make 3 requests with same email
      for (let i = 0; i < 3; i++) {
        const req = createMockAuthRequest({
          body: { identifier: 'attacker@example.com' },
          ip: `192.168.1.${100 + i}`, // Different IPs
          clientIp: `192.168.1.${100 + i}`,
          path: '/api/v1/auth/login',
          method: 'POST'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
      }

      // 4th request with same email but different IP should be blocked
      const req = createMockAuthRequest({
        body: { identifier: 'attacker@example.com' },
        ip: '192.168.1.200',
        clientIp: '192.168.1.200',
        path: '/api/v1/auth/login',
        method: 'POST'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.calledWith).toBeDefined();
    });

    it('should not rate limit different emails', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 3,
        windowMs: 60000,
        store: testStore,
        skip: () => false,
        keyGenerator: (req: AuthenticatedRequest) => {
          const email = req.body?.email || req.body?.identifier;
          if (email && typeof email === 'string') {
            return `email:${email.toLowerCase()}`;
          }
          return `ip:${req.clientIp || req.ip}`;
        }
      });

      // Make requests with different emails
      for (let i = 0; i < 5; i++) {
        const req = createMockAuthRequest({
          body: { identifier: `user${i}@example.com` },
          ip: '192.168.1.100',
          clientIp: '192.168.1.100',
          path: '/api/v1/auth/login',
          method: 'POST'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);

        // Each different email should pass
        expect(state.called).toBe(true);
        expect(state.calledWith).toBeUndefined();
      }
    });
  });

  describe('Registration Endpoint Rate Limiting', () => {
    it('should enforce stricter limits for registration', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 3, // Registration has stricter limits
        windowMs: 3600000, // 1 hour
        store: testStore,
        skip: () => false
      });

      // Make 3 successful registration attempts
      for (let i = 0; i < 3; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.100',
          clientIp: '192.168.1.100',
          path: '/api/v1/auth/register',
          method: 'POST'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
        expect(state.called).toBe(true);
        expect(state.calledWith).toBeUndefined();
      }

      // 4th registration attempt should be blocked
      const req = createMockAuthRequest({
        ip: '192.168.1.100',
        clientIp: '192.168.1.100',
        path: '/api/v1/auth/register',
        method: 'POST'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.calledWith).toBeDefined();
    });

    it('should rate limit registration by IP address', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 2,
        windowMs: 3600000,
        store: testStore,
        skip: () => false
      });

      // Exhaust limit from one IP
      for (let i = 0; i < 2; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.100',
          clientIp: '192.168.1.100',
          path: '/api/v1/auth/register',
          method: 'POST'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
      }

      // Request from different IP should still work
      const req = createMockAuthRequest({
        ip: '192.168.1.200',
        clientIp: '192.168.1.200',
        path: '/api/v1/auth/register',
        method: 'POST'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.called).toBe(true);
      expect(state.calledWith).toBeUndefined();
    });
  });

  describe('Password Reset Rate Limiting', () => {
    it('should enforce rate limits on password reset', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 3,
        windowMs: 3600000, // 1 hour
        store: testStore,
        skip: () => false,
        message: 'Too many password reset attempts. Please try again in 1 hour.'
      });

      // Make 3 password reset attempts
      for (let i = 0; i < 3; i++) {
        const req = createMockAuthRequest({
          body: { email: 'victim@example.com' },
          ip: '192.168.1.100',
          clientIp: '192.168.1.100',
          path: '/api/v1/auth/password-reset',
          method: 'POST'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
        expect(state.called).toBe(true);
      }

      // 4th attempt should be blocked
      const req = createMockAuthRequest({
        body: { email: 'victim@example.com' },
        ip: '192.168.1.100',
        clientIp: '192.168.1.100',
        path: '/api/v1/auth/password-reset',
        method: 'POST'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.calledWith).toBeDefined();
      expect(state.calledWith?.message).toContain('password reset');
    });

    it('should rate limit by email for password reset', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 2,
        windowMs: 3600000,
        store: testStore,
        skip: () => false,
        keyGenerator: (req: AuthenticatedRequest) => {
          const email = req.body?.email;
          if (email && typeof email === 'string') {
            return `password-reset:${email.toLowerCase()}`;
          }
          return `ip:${req.clientIp || req.ip}`;
        }
      });

      // Make 2 requests for same email from different IPs
      for (let i = 0; i < 2; i++) {
        const req = createMockAuthRequest({
          body: { email: 'target@example.com' },
          ip: `192.168.1.${100 + i}`,
          clientIp: `192.168.1.${100 + i}`,
          path: '/api/v1/auth/password-reset',
          method: 'POST'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
      }

      // 3rd request for same email should be blocked
      const req = createMockAuthRequest({
        body: { email: 'target@example.com' },
        ip: '192.168.1.200',
        clientIp: '192.168.1.200',
        path: '/api/v1/auth/password-reset',
        method: 'POST'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.calledWith).toBeDefined();
    });
  });

  describe('API General Rate Limiting', () => {
    it('should enforce general API rate limits', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 10,
        windowMs: 60000,
        store: testStore,
        skip: () => false
      });

      // Make 10 successful requests
      for (let i = 0; i < 10; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.100',
          clientIp: '192.168.1.100',
          path: '/api/v1/trips',
          method: 'GET'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
        expect(state.called).toBe(true);
        expect(state.calledWith).toBeUndefined();
      }

      // 11th request should be blocked
      const req = createMockAuthRequest({
        ip: '192.168.1.100',
        clientIp: '192.168.1.100',
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.calledWith).toBeDefined();
    });

    it('should allow different endpoints to share limit', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 5,
        windowMs: 60000,
        store: testStore,
        skip: () => false
      });

      const endpoints = [
        '/api/v1/trips',
        '/api/v1/events',
        '/api/v1/items',
        '/api/v1/trips/123',
        '/api/v1/events/456'
      ];

      // Make requests to different endpoints
      for (const endpoint of endpoints) {
        const req = createMockAuthRequest({
          ip: '192.168.1.100',
          clientIp: '192.168.1.100',
          path: endpoint,
          method: 'GET'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
        expect(state.called).toBe(true);
      }

      // 6th request should be blocked regardless of endpoint
      const req = createMockAuthRequest({
        ip: '192.168.1.100',
        clientIp: '192.168.1.100',
        path: '/api/v1/new-endpoint',
        method: 'GET'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.calledWith).toBeDefined();
    });

    it('should apply separate limits per user for authenticated requests', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 3,
        windowMs: 60000,
        store: testStore,
        skip: () => false,
        keyGenerator: (req: AuthenticatedRequest) => {
          if (req.user?.id) {
            return `user:${req.user.id}`;
          }
          return `ip:${req.clientIp || req.ip}`;
        }
      });

      // User 1 makes 3 requests
      for (let i = 0; i < 3; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.100',
          clientIp: '192.168.1.100',
          user: { id: 'user-1', email: 'user1@example.com' },
          path: '/api/v1/trips',
          method: 'GET'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
        expect(state.calledWith).toBeUndefined();
      }

      // User 2 should still be able to make requests
      const req = createMockAuthRequest({
        ip: '192.168.1.100', // Same IP
        clientIp: '192.168.1.100',
        user: { id: 'user-2', email: 'user2@example.com' },
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.called).toBe(true);
      expect(state.calledWith).toBeUndefined();
    });
  });

  describe('Rate Limit Header Verification', () => {
    it('should include X-RateLimit-Limit header', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 100,
        windowMs: 60000,
        store: testStore,
        skip: () => false,
        headers: true
      });

      const req = createMockAuthRequest({
        ip: '192.168.1.100',
        clientIp: '192.168.1.100',
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const headers: Record<string, string> = {};
      const response = {
        set: (headerObj: Record<string, string>) => {
          Object.assign(headers, headerObj);
        },
        status: () => response,
        json: () => response
      } as any;

      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(headers['X-RateLimit-Limit']).toBe('100');
    });

    it('should include X-RateLimit-Remaining header', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 100,
        windowMs: 60000,
        store: testStore,
        skip: () => false,
        headers: true
      });

      const req = createMockAuthRequest({
        ip: '192.168.1.101',
        clientIp: '192.168.1.101',
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const headers: Record<string, string> = {};
      const response = {
        set: (headerObj: Record<string, string>) => {
          Object.assign(headers, headerObj);
        },
        status: () => response,
        json: () => response
      } as any;

      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(headers['X-RateLimit-Remaining']).toBe('99');
    });

    it('should include X-RateLimit-Reset header', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 100,
        windowMs: 60000,
        store: testStore,
        skip: () => false,
        headers: true
      });

      const req = createMockAuthRequest({
        ip: '192.168.1.102',
        clientIp: '192.168.1.102',
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const headers: Record<string, string> = {};
      const response = {
        set: (headerObj: Record<string, string>) => {
          Object.assign(headers, headerObj);
        },
        status: () => response,
        json: () => response
      } as any;

      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(headers['X-RateLimit-Reset']).toBeDefined();
      // Should be a valid ISO date string
      expect(new Date(headers['X-RateLimit-Reset']).getTime()).toBeGreaterThan(Date.now());
    });

    it('should decrement remaining count with each request', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 10,
        windowMs: 60000,
        store: testStore,
        skip: () => false,
        headers: true
      });

      const remainingValues: string[] = [];

      for (let i = 0; i < 5; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.103',
          clientIp: '192.168.1.103',
          path: '/api/v1/trips',
          method: 'GET'
        }) as AuthenticatedRequest;

        const headers: Record<string, string> = {};
        const response = {
          set: (headerObj: Record<string, string>) => {
            Object.assign(headers, headerObj);
          },
          status: () => response,
          json: () => response
        } as any;

        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
        remainingValues.push(headers['X-RateLimit-Remaining']);
      }

      // Should decrement: 9, 8, 7, 6, 5
      expect(remainingValues).toEqual(['9', '8', '7', '6', '5']);
    });

    it('should show 0 remaining when limit exceeded', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 3,
        windowMs: 60000,
        store: testStore,
        skip: () => false,
        headers: true
      });

      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.104',
          clientIp: '192.168.1.104',
          path: '/api/v1/trips',
          method: 'GET'
        }) as AuthenticatedRequest;

        const response = {
          set: () => {},
          status: () => response,
          json: () => response
        } as any;

        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
      }

      // Make one more request
      const req = createMockAuthRequest({
        ip: '192.168.1.104',
        clientIp: '192.168.1.104',
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const headers: Record<string, string> = {};
      const response = {
        set: (headerObj: Record<string, string>) => {
          Object.assign(headers, headerObj);
        },
        status: () => response,
        json: () => response
      } as any;

      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });
  });

  describe('Rate Limit Store Operations', () => {
    it('should correctly track request counts', async () => {
      const key = 'test-key-1';

      expect(await testStore.get(key)).toBe(0);

      await testStore.increment(key, 60000);
      expect(await testStore.get(key)).toBe(1);

      await testStore.increment(key, 60000);
      expect(await testStore.get(key)).toBe(2);

      await testStore.increment(key, 60000);
      expect(await testStore.get(key)).toBe(3);
    });

    it('should reset counts correctly', async () => {
      const key = 'test-key-2';

      await testStore.increment(key, 60000);
      await testStore.increment(key, 60000);
      expect(await testStore.get(key)).toBe(2);

      await testStore.reset(key);
      expect(await testStore.get(key)).toBe(0);
    });

    it('should expire entries after TTL', async () => {
      const key = 'test-key-3';
      const shortTtl = 100; // 100ms

      await testStore.increment(key, shortTtl);
      expect(await testStore.get(key)).toBe(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await testStore.get(key)).toBe(0);
    });

    it('should handle concurrent increments', async () => {
      const key = 'test-key-4';

      // Simulate concurrent increments
      const promises = Array(10).fill(null).map(() =>
        testStore.increment(key, 60000)
      );

      await Promise.all(promises);

      expect(await testStore.get(key)).toBe(10);
    });
  });

  describe('Admin Rate Limit Controls', () => {
    it('should allow manual rate limit reset', async () => {
      const key = 'ip:192.168.1.150';

      // Build up some requests
      await testStore.increment(key, 60000);
      await testStore.increment(key, 60000);
      await testStore.increment(key, 60000);

      expect(await testStore.get(key)).toBe(3);

      // Admin reset
      await RateLimitMiddleware.resetRateLimit(key, testStore);

      expect(await testStore.get(key)).toBe(0);
    });

    it('should provide rate limit status', async () => {
      const key = 'ip:192.168.1.151';

      await testStore.increment(key, 60000);
      await testStore.increment(key, 60000);

      const status = await RateLimitMiddleware.getRateLimitStatus(key, testStore);

      expect(status.count).toBe(2);
    });
  });

  describe('Skip Conditions', () => {
    it('should skip rate limiting for health check endpoints', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 1,
        windowMs: 60000,
        store: testStore,
        skip: (req) => req.path === '/health' || req.path === '/ping'
      });

      // Make multiple requests to health endpoint
      for (let i = 0; i < 10; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.160',
          clientIp: '192.168.1.160',
          path: '/health',
          method: 'GET'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);

        expect(state.called).toBe(true);
        expect(state.calledWith).toBeUndefined();
      }
    });

    it('should not skip rate limiting for API endpoints', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 2,
        windowMs: 60000,
        store: testStore,
        skip: (req) => req.path === '/health'
      });

      // Make requests to API endpoint
      for (let i = 0; i < 2; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.161',
          clientIp: '192.168.1.161',
          path: '/api/v1/trips',
          method: 'GET'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);
      }

      // 3rd request should be blocked
      const req = createMockAuthRequest({
        ip: '192.168.1.161',
        clientIp: '192.168.1.161',
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      expect(state.calledWith).toBeDefined();
    });
  });

  describe('Distributed Attack Simulation', () => {
    it('should handle requests from multiple IPs targeting same endpoint', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 3,
        windowMs: 60000,
        store: testStore,
        skip: () => false
      });

      // Simulate distributed attack from 100 different IPs
      const results = await Promise.all(
        Array(100).fill(null).map(async (_, i) => {
          const req = createMockAuthRequest({
            ip: `192.168.${Math.floor(i / 256)}.${i % 256}`,
            clientIp: `192.168.${Math.floor(i / 256)}.${i % 256}`,
            path: '/api/v1/auth/login',
            method: 'POST'
          }) as AuthenticatedRequest;

          const { response } = createTestMockResponse();
          const { next, state } = createTestMockNext();

          await middleware(req, response as Response, next);

          return { blocked: !!state.calledWith };
        })
      );

      // Each IP should be allowed (they each have their own limit)
      const blockedCount = results.filter(r => r.blocked).length;
      expect(blockedCount).toBe(0);
    });

    it('should block concentrated attack from single IP', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 5,
        windowMs: 60000,
        store: testStore,
        skip: () => false
      });

      // Run sequentially to avoid race conditions in the in-memory store
      let blockedCount = 0;
      for (let i = 0; i < 20; i++) {
        const req = createMockAuthRequest({
          ip: '192.168.1.170',
          clientIp: '192.168.1.170',
          path: '/api/v1/auth/login',
          method: 'POST'
        }) as AuthenticatedRequest;

        const { response } = createTestMockResponse();
        const { next, state } = createTestMockNext();

        await middleware(req, response as Response, next);

        if (state.calledWith) {
          blockedCount++;
        }
      }

      expect(blockedCount).toBe(15); // 20 - 5 allowed = 15 blocked
    });
  });

  describe('Rate Limit Configuration Validation', () => {
    it('should handle zero maxRequests correctly', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 0,
        windowMs: 60000,
        store: testStore,
        skip: () => false
      });

      const req = createMockAuthRequest({
        ip: '192.168.1.180',
        clientIp: '192.168.1.180',
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const { response } = createTestMockResponse();
      const { next, state } = createTestMockNext();

      await middleware(req, response as Response, next);

      // Should block immediately with 0 max requests
      expect(state.calledWith).toBeDefined();
    });

    it('should handle very short window correctly', async () => {
      const middleware = RateLimitMiddleware.create({
        maxRequests: 100,
        windowMs: 1, // 1ms window
        store: testStore,
        skip: () => false
      });

      // Make request
      const req1 = createMockAuthRequest({
        ip: '192.168.1.181',
        clientIp: '192.168.1.181',
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const { next: next1, state: state1 } = createTestMockNext();
      await middleware(req1, createTestMockResponse().response as Response, next1);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      // Make another request - should reset
      const req2 = createMockAuthRequest({
        ip: '192.168.1.181',
        clientIp: '192.168.1.181',
        path: '/api/v1/trips',
        method: 'GET'
      }) as AuthenticatedRequest;

      const { next: next2, state: state2 } = createTestMockNext();
      await middleware(req2, createTestMockResponse().response as Response, next2);

      expect(state2.called).toBe(true);
      expect(state2.calledWith).toBeUndefined();
    });
  });

  describe('Pre-configured Rate Limiters', () => {
    it('should have login rate limiter configured', () => {
      expect(rateLimiters.login).toBeDefined();
      expect(typeof rateLimiters.login).toBe('function');
    });

    it('should have register rate limiter configured', () => {
      expect(rateLimiters.register).toBeDefined();
      expect(typeof rateLimiters.register).toBe('function');
    });

    it('should have passwordReset rate limiter configured', () => {
      expect(rateLimiters.passwordReset).toBeDefined();
      expect(typeof rateLimiters.passwordReset).toBe('function');
    });

    it('should have general rate limiter configured', () => {
      expect(rateLimiters.general).toBeDefined();
      expect(typeof rateLimiters.general).toBe('function');
    });

    it('should have sensitive operations rate limiter configured', () => {
      expect(rateLimiters.sensitive).toBeDefined();
      expect(typeof rateLimiters.sensitive).toBe('function');
    });

    it('should have trusted bypass rate limiter configured', () => {
      expect(rateLimiters.trusted).toBeDefined();
      expect(typeof rateLimiters.trusted).toBe('function');
    });
  });
});
