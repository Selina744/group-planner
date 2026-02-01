/**
 * Test Helpers
 *
 * Utility functions for test setup, mocking, and common test operations
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import request from 'supertest';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from './test-database.js';
import { UserFixtures } from './test-fixtures.js';

/**
 * Environment setup for tests
 */
export function setupTestEnvironment() {
  // Load test environment variables
  process.env.NODE_ENV = 'test';

  // Set test-specific configurations
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-with-sufficient-length-for-security-requirements-in-testing-environment';
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/group_planner_test';
  }

  // Disable certain features in test mode
  process.env.DISABLE_RATE_LIMITING = 'true';
  process.env.DISABLE_CORS = 'true';
}

/**
 * Database test setup hooks
 */
export function useDatabaseHooks() {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });
}

/**
 * Mock Express request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: undefined,
    ip: '127.0.0.1',
    method: 'GET',
    url: '/',
    path: '/',
    ...overrides
  };
}

/**
 * Mock Express response object with tracking
 */
export function createMockResponse(): {
  response: Partial<Response>;
  tracker: {
    status: number | null;
    json: any;
    sent: boolean;
  };
} {
  const tracker = {
    status: null as number | null,
    json: null as any,
    sent: false
  };

  const response = {
    status: function(code: number) {
      tracker.status = code;
      return this;
    },
    json: function(data: any) {
      tracker.json = data;
      tracker.sent = true;
      return this;
    },
    send: function(data: any) {
      tracker.json = data;
      tracker.sent = true;
      return this;
    },
    locals: {}
  };

  return { response: response as Partial<Response>, tracker };
}

/**
 * Mock next function for middleware testing
 */
export function createMockNext(): {
  next: () => void;
  called: boolean;
  calledWith?: Error;
} {
  const mock = {
    called: false,
    calledWith: undefined as Error | undefined
  };

  const next = (error?: Error) => {
    mock.called = true;
    if (error) {
      mock.calledWith = error;
    }
  };

  return { next, ...mock };
}

/**
 * API testing helpers
 */
export class ApiTestHelpers {
  /**
   * Create authenticated request
   */
  static async authenticatedRequest(app: any, method: 'get' | 'post' | 'put' | 'delete', url: string) {
    const { user, token } = await UserFixtures.createAuthenticatedUser();

    return {
      request: request(app)[method](url).set('Authorization', `Bearer ${token}`),
      user,
      token
    };
  }

  /**
   * Expect API success response
   */
  static expectSuccessResponse(response: request.Response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  }

  /**
   * Expect API error response
   */
  static expectErrorResponse(response: request.Response, expectedStatus: number, errorMessage?: string) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();

    if (errorMessage) {
      expect(response.body.error.message).toContain(errorMessage);
    }
  }

  /**
   * Test pagination response
   */
  static expectPaginationResponse(response: request.Response, expectedMinItems = 0) {
    this.expectSuccessResponse(response);

    const data = response.body.data;
    expect(data.pagination).toBeDefined();
    expect(typeof data.pagination.page).toBe('number');
    expect(typeof data.pagination.limit).toBe('number');
    expect(typeof data.pagination.total).toBe('number');
    expect(typeof data.pagination.pages).toBe('number');

    expect(Array.isArray(data.items || data.trips || data.events)).toBe(true);
    const items = data.items || data.trips || data.events || [];
    expect(items.length).toBeGreaterThanOrEqual(expectedMinItems);
  }
}

/**
 * Async error testing helper
 */
export function expectAsyncError(asyncFn: () => Promise<any>, ErrorClass?: any, message?: string) {
  return expect(asyncFn()).rejects.toThrow(ErrorClass || Error);
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = { ...console };
  const mocks = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  };

  beforeEach(() => {
    console.log = mocks.log;
    console.error = mocks.error;
    console.warn = mocks.warn;
    console.info = mocks.info;
    console.debug = mocks.debug;
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
  });

  return mocks;
}

/**
 * Time manipulation helpers for testing
 */
export class TimeHelpers {
  private static originalDate = Date;

  /**
   * Mock Date to return fixed time
   */
  static mockCurrentTime(fixedTime: string | Date) {
    const fixed = new Date(fixedTime);

    beforeEach(() => {
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(fixed);
          } else {
            super(...args);
          }
        }

        static now() {
          return fixed.getTime();
        }
      } as DateConstructor;
    });

    afterEach(() => {
      global.Date = this.originalDate;
    });
  }

  /**
   * Get future date for testing
   */
  static getFutureDate(daysFromNow: number): Date {
    const future = new Date();
    future.setDate(future.getDate() + daysFromNow);
    return future;
  }

  /**
   * Get past date for testing
   */
  static getPastDate(daysAgo: number): Date {
    const past = new Date();
    past.setDate(past.getDate() - daysAgo);
    return past;
  }
}

/**
 * Validation testing helpers
 */
export class ValidationHelpers {
  /**
   * Test field validation
   */
  static async testRequiredField(
    apiCall: (data: any) => Promise<request.Response>,
    fieldName: string,
    validData: any
  ) {
    const invalidData = { ...validData };
    delete invalidData[fieldName];

    const response = await apiCall(invalidData);
    ApiTestHelpers.expectErrorResponse(response, 400);
  }

  /**
   * Test field length validation
   */
  static async testFieldLength(
    apiCall: (data: any) => Promise<request.Response>,
    fieldName: string,
    validData: any,
    maxLength: number
  ) {
    const invalidData = { ...validData };
    invalidData[fieldName] = 'x'.repeat(maxLength + 1);

    const response = await apiCall(invalidData);
    ApiTestHelpers.expectErrorResponse(response, 400);
  }

  /**
   * Test email format validation
   */
  static async testEmailValidation(
    apiCall: (data: any) => Promise<request.Response>,
    fieldName: string,
    validData: any
  ) {
    const invalidEmails = ['invalid-email', '@domain.com', 'user@', 'user@domain'];

    for (const invalidEmail of invalidEmails) {
      const invalidData = { ...validData };
      invalidData[fieldName] = invalidEmail;

      const response = await apiCall(invalidData);
      ApiTestHelpers.expectErrorResponse(response, 400);
    }
  }
}