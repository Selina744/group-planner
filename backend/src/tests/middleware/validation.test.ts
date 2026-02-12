/**
 * Validation Middleware Tests
 *
 * Tests for Zod schema validation middleware, focusing on MVP password policy
 * and other input validation to prevent regressions.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { z } from 'zod';
import type { Response, NextFunction } from 'express';
import {
  commonSchemas,
  validateRequest,
  ValidationMetrics
} from '../../middleware/validation.js';
import { createMockRequest, createMockResponse } from '../utils/test-helpers.js';
import type { AuthenticatedRequest } from '../../types/middleware.js';

/**
 * Create a mock next function that properly tracks state
 */
function createTestNext() {
  const state = {
    called: false,
    error: undefined as Error | undefined
  };

  const next = (err?: Error) => {
    state.called = true;
    state.error = err;
  };

  return { next, state };
}

describe('Validation Middleware', () => {
  beforeEach(() => {
    ValidationMetrics.reset();
  });

  // =========================================================================
  // PASSWORD VALIDATION SCHEMA (MVP)
  // =========================================================================

  describe('Password Validation Schema (MVP)', () => {
    /**
     * MVP Password Policy:
     * - Minimum length: 1 character (non-empty)
     * - Maximum length: 128 characters
     * - No complexity requirements (no uppercase, lowercase, numbers, or special chars required)
     *
     * These tests ensure we don't regress to stricter requirements.
     */

    describe('accepts simple passwords', () => {
      it('should accept any non-empty password', () => {
        const simplePasswords = [
          'a',           // Single character
          '1',           // Single digit
          'abc',         // Simple letters
          '123',         // Simple numbers
          'password',    // Common word
          'qwerty',      // Keyboard pattern
          'letmein',     // Simple phrase
        ];

        for (const password of simplePasswords) {
          const result = commonSchemas.password.safeParse(password);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(password);
          }
        }
      });

      it('should accept single character password', () => {
        const result = commonSchemas.password.safeParse('a');
        expect(result.success).toBe(true);
      });

      it('should accept numeric-only password', () => {
        const result = commonSchemas.password.safeParse('123');
        expect(result.success).toBe(true);
      });

      it('should accept lowercase-only password', () => {
        const result = commonSchemas.password.safeParse('abcdefgh');
        expect(result.success).toBe(true);
      });

      it('should accept uppercase-only password', () => {
        const result = commonSchemas.password.safeParse('ABCDEFGH');
        expect(result.success).toBe(true);
      });

      it('should accept password with spaces', () => {
        const result = commonSchemas.password.safeParse('my simple password');
        expect(result.success).toBe(true);
      });

      it('should accept password with special characters only', () => {
        const result = commonSchemas.password.safeParse('!@#$%^&*');
        expect(result.success).toBe(true);
      });
    });

    describe('rejects invalid passwords', () => {
      it('should reject empty password', () => {
        const result = commonSchemas.password.safeParse('');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('required');
        }
      });

      it('should reject password exceeding max length (128)', () => {
        const veryLongPassword = 'a'.repeat(129);
        const result = commonSchemas.password.safeParse(veryLongPassword);
        expect(result.success).toBe(false);
      });
    });

    describe('enforces max length 128', () => {
      it('should accept password at exactly 128 characters', () => {
        const maxLengthPassword = 'a'.repeat(128);
        const result = commonSchemas.password.safeParse(maxLengthPassword);
        expect(result.success).toBe(true);
      });

      it('should reject password at 129 characters', () => {
        const overMaxPassword = 'a'.repeat(129);
        const result = commonSchemas.password.safeParse(overMaxPassword);
        expect(result.success).toBe(false);
      });

      it('should accept password at 127 characters', () => {
        const underMaxPassword = 'a'.repeat(127);
        const result = commonSchemas.password.safeParse(underMaxPassword);
        expect(result.success).toBe(true);
      });
    });
  });

  // =========================================================================
  // PASSWORD VALIDATION MIDDLEWARE INTEGRATION
  // =========================================================================

  describe('Password Validation via Middleware', () => {
    const passwordValidationMiddleware = validateRequest({
      body: z.object({
        password: commonSchemas.password
      })
    });

    it('should pass validation for simple password via middleware', async () => {
      const req = createMockRequest({
        body: { password: 'a' }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await passwordValidationMiddleware(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeUndefined(); // No error passed
    });

    it('should pass validation for numeric password via middleware', async () => {
      const req = createMockRequest({
        body: { password: '123' }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await passwordValidationMiddleware(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeUndefined();
    });

    it('should fail validation for empty password via middleware', async () => {
      const req = createMockRequest({
        body: { password: '' }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await passwordValidationMiddleware(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeDefined(); // Error passed
    });

    it('should fail validation for too long password via middleware', async () => {
      const req = createMockRequest({
        body: { password: 'a'.repeat(129) }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await passwordValidationMiddleware(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeDefined(); // Error passed
    });
  });

  // =========================================================================
  // USER LOGIN VALIDATION
  // =========================================================================

  describe('User Login Validation', () => {
    const loginSchema = z.object({
      identifier: z.string().min(1, 'Email or username is required'),
      password: z.string().min(1, 'Password is required')
    });

    const loginValidation = validateRequest({
      body: loginSchema
    });

    it('should accept login with simple password', async () => {
      const req = createMockRequest({
        body: {
          identifier: 'user@example.com',
          password: 'a'
        }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await loginValidation(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeUndefined();
    });

    it('should accept login with numeric password', async () => {
      const req = createMockRequest({
        body: {
          identifier: 'user@example.com',
          password: '123'
        }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await loginValidation(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeUndefined();
    });

    it('should reject login with empty password', async () => {
      const req = createMockRequest({
        body: {
          identifier: 'user@example.com',
          password: ''
        }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await loginValidation(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeDefined(); // Error
    });
  });

  // =========================================================================
  // PASSWORD CHANGE VALIDATION
  // =========================================================================

  describe('Password Change Validation', () => {
    const passwordChangeSchema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: commonSchemas.password
    });

    const passwordChangeValidation = validateRequest({
      body: passwordChangeSchema
    });

    it('should accept password change to simple password', async () => {
      const req = createMockRequest({
        body: {
          currentPassword: 'ComplexP@ss123',
          newPassword: 'a'
        }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await passwordChangeValidation(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeUndefined();
    });

    it('should accept password change to numeric password', async () => {
      const req = createMockRequest({
        body: {
          currentPassword: 'ComplexP@ss123',
          newPassword: '123'
        }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await passwordChangeValidation(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeUndefined();
    });

    it('should reject password change to empty password', async () => {
      const req = createMockRequest({
        body: {
          currentPassword: 'ComplexP@ss123',
          newPassword: ''
        }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next, state } = createTestNext();

      await passwordChangeValidation(req, response as Response, next as NextFunction);

      expect(state.called).toBe(true);
      expect(state.error).toBeDefined(); // Error
    });
  });

  // =========================================================================
  // VALIDATION METRICS
  // =========================================================================

  describe('Validation Metrics', () => {
    it('should track successful validation attempts', async () => {
      const middleware = validateRequest({
        body: z.object({
          password: commonSchemas.password
        })
      });

      const req = createMockRequest({
        body: { password: 'a' }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next } = createTestNext();

      await middleware(req, response as Response, next as NextFunction);

      const metrics = ValidationMetrics.getMetrics();
      expect(metrics.validationAttempts).toBeGreaterThan(0);
    });

    it('should track failed validation attempts', async () => {
      const middleware = validateRequest({
        body: z.object({
          password: commonSchemas.password
        })
      });

      const req = createMockRequest({
        body: { password: '' }
      }) as AuthenticatedRequest;
      const { response } = createMockResponse();
      const { next } = createTestNext();

      await middleware(req, response as Response, next as NextFunction);

      const metrics = ValidationMetrics.getMetrics();
      expect(metrics.validationFailures).toBeGreaterThan(0);
    });
  });
});
