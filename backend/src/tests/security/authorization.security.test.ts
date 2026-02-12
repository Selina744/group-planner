/**
 * Authorization Security Tests
 *
 * Comprehensive security tests for role-based access control including:
 * - Trip membership access control
 * - Role-based permissions (HOST, CO_HOST, MEMBER)
 * - Cross-trip access prevention
 * - Permission escalation prevention
 * - Authorization bypass attempts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import request from 'supertest';
import { app } from '../../app.js';
import { UserFixtures, TripFixtures, EventFixtures, ItemFixtures } from '../utils/test-fixtures.js';
import { JwtService } from '../../services/jwt.js';
import {
  getTestDb,
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase
} from '../utils/test-database.js';
import { RbacMiddleware, type MemberRole } from '../../middleware/rbac.js';
import type { UserProfile } from '../../types/auth.js';

describe('Authorization Security Tests', () => {
  const prisma = getTestDb();

  // Store created entities for cleanup
  let createdUsers: string[] = [];
  let createdTrips: string[] = [];

  beforeAll(async () => {
    await setupTestDatabase();
    await cleanDatabase();
  });

  afterAll(async () => {
    // Clean up any remaining test data
    await cleanDatabase();
    await teardownTestDatabase();
  });

  /**
   * Helper to create an authenticated test user with a valid JWT token
   */
  async function createAuthenticatedTestUser(overrides = {}): Promise<{ user: any; token: string; profile: UserProfile }> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);

    const user = await UserFixtures.createUser({
      email: `auth-test-${timestamp}-${random}@example.com`,
      username: `authuser${timestamp}${random}`.slice(0, 30),
      displayName: 'Authorization Test User',
      ...overrides
    });

    createdUsers.push(user.id);

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

    return { user, token: tokenPair.accessToken, profile };
  }

  describe('Authentication Requirements', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app).get('/api/v1/trips');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject requests with invalid token format', async () => {
      const invalidFormats = [
        'InvalidToken',
        'Basic somebase64',
        'Bearer ',
        'bearer token',
      ];

      for (const header of invalidFormats) {
        const response = await request(app)
          .get('/api/v1/trips')
          .set('Authorization', header);

        expect([400, 401]).toContain(response.status);
      }
    });

    it('should reject expired tokens', async () => {
      const { user, profile } = await createAuthenticatedTestUser();

      // Create an expired token
      const { JwtUtils } = await import('../../lib/jwt.js');
      const expiredTokenResult = JwtUtils.createAccessToken(
        profile.id,
        profile.email,
        profile.username,
        { expiresIn: -3600 } // Expired 1 hour ago
      );

      expect(expiredTokenResult.success).toBe(true);

      const response = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${expiredTokenResult.data}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Trip Membership Access Control', () => {
    it('should allow trip owner to access their trip', async () => {
      const { user: owner, token: ownerToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(owner.id);
      createdTrips.push(trip.id);

      const response = await request(app)
        .get(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(trip.id);
    });

    it('should deny non-member access to trip', async () => {
      const { user: owner, token: ownerToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(owner.id);
      createdTrips.push(trip.id);

      const { user: nonMember, token: nonMemberToken } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should allow confirmed member to access trip', async () => {
      const { user: owner, token: ownerToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(owner.id);
      createdTrips.push(trip.id);

      const { user: member, token: memberToken } = await createAuthenticatedTestUser();
      await TripFixtures.addMemberToTrip(trip.id, member.id, 'MEMBER', 'CONFIRMED');

      const response = await request(app)
        .get(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Role-Based Permissions', () => {
    it('should allow HOST to delete trip', async () => {
      const { user: host, token: hostToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(host.id);
      // Don't track for cleanup - we're deleting it

      const response = await request(app)
        .delete(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect([200, 204]).toContain(response.status);
    });

    it('should deny MEMBER from deleting trip', async () => {
      const { user: host, token: hostToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(host.id);
      createdTrips.push(trip.id);

      const { user: member, token: memberToken } = await createAuthenticatedTestUser();
      await TripFixtures.addMemberToTrip(trip.id, member.id, 'MEMBER', 'CONFIRMED');

      const response = await request(app)
        .delete(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);

      // Verify trip still exists
      const tripExists = await prisma.trip.findUnique({
        where: { id: trip.id }
      });
      expect(tripExists).not.toBeNull();
    });

    it('should deny CO_HOST from deleting trip', async () => {
      const { user: host, token: hostToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(host.id);
      createdTrips.push(trip.id);

      const { user: coHost, token: coHostToken } = await createAuthenticatedTestUser();
      await TripFixtures.addMemberToTrip(trip.id, coHost.id, 'CO_HOST', 'CONFIRMED');

      const response = await request(app)
        .delete(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${coHostToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Cross-Trip Access Prevention', () => {
    it('should prevent user from accessing another users trip', async () => {
      const { user: owner1, token: owner1Token } = await createAuthenticatedTestUser();
      const { trip: trip1 } = await TripFixtures.createTrip(owner1.id);
      createdTrips.push(trip1.id);

      const { user: owner2, token: owner2Token } = await createAuthenticatedTestUser();
      const { trip: trip2 } = await TripFixtures.createTrip(owner2.id);
      createdTrips.push(trip2.id);

      // Owner2 should not access Owner1's trip
      const response = await request(app)
        .get(`/api/v1/trips/${trip1.id}`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should prevent user from deleting another users trip', async () => {
      const { user: owner1, token: owner1Token } = await createAuthenticatedTestUser();
      const { trip: trip1 } = await TripFixtures.createTrip(owner1.id);
      createdTrips.push(trip1.id);

      const { user: owner2, token: owner2Token } = await createAuthenticatedTestUser();

      // Owner2 should not be able to delete Owner1's trip
      const response = await request(app)
        .delete(`/api/v1/trips/${trip1.id}`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect([403, 404]).toContain(response.status);

      // Verify trip still exists
      const tripExists = await prisma.trip.findUnique({
        where: { id: trip1.id }
      });
      expect(tripExists).not.toBeNull();
    });
  });

  describe('Permission Escalation Prevention', () => {
    it('should prevent MEMBER from performing HOST-only actions', async () => {
      const { user: host, token: hostToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(host.id);
      createdTrips.push(trip.id);

      const { user: member, token: memberToken } = await createAuthenticatedTestUser();
      await TripFixtures.addMemberToTrip(trip.id, member.id, 'MEMBER', 'CONFIRMED');

      // Member attempts to delete trip (HOST-only action)
      const response = await request(app)
        .delete(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('should prevent MEMBER from updating trip settings', async () => {
      const { user: host, token: hostToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(host.id);
      createdTrips.push(trip.id);
      const originalTitle = trip.title;

      const { user: member, token: memberToken } = await createAuthenticatedTestUser();
      await TripFixtures.addMemberToTrip(trip.id, member.id, 'MEMBER', 'CONFIRMED');

      // Member attempts to update trip
      const response = await request(app)
        .put(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Hacked Title',
          startDate: '2026-08-01T00:00:00.000Z',
          endDate: '2026-08-15T00:00:00.000Z'
        });

      expect(response.status).toBe(403);

      // Verify title wasn't changed
      const tripAfter = await prisma.trip.findUnique({
        where: { id: trip.id }
      });
      expect(tripAfter?.title).toBe(originalTitle);
    });
  });

  describe('Authorization Header Validation', () => {
    it('should reject malformed Bearer tokens', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload',
        'a.b.c',
        '',
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/v1/trips')
          .set('Authorization', `Bearer ${token}`);

        expect([400, 401]).toContain(response.status);
      }
    });

    it('should reject tokens signed with wrong secret', async () => {
      const { user } = await createAuthenticatedTestUser();

      // Create a token with wrong secret
      const jwt = await import('jsonwebtoken');
      const wrongSecretToken = jwt.default.sign(
        {
          sub: user.id,
          type: 'access',
          email: user.email,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        'wrong-secret-key',
        { algorithm: 'HS256' }
      );

      const response = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('RBAC Middleware Factory', () => {
    it('should export role-based middleware factories', () => {
      expect(typeof RbacMiddleware.requireHost).toBe('function');
      expect(typeof RbacMiddleware.requireHostOrCoHost).toBe('function');
      expect(typeof RbacMiddleware.requireMember).toBe('function');
      expect(typeof RbacMiddleware.requireRole).toBe('function');
    });

    it('should return middleware functions from factories', () => {
      const hostMiddleware = RbacMiddleware.requireHost();
      const coHostMiddleware = RbacMiddleware.requireHostOrCoHost();
      const memberMiddleware = RbacMiddleware.requireMember();

      expect(typeof hostMiddleware).toBe('function');
      expect(typeof coHostMiddleware).toBe('function');
      expect(typeof memberMiddleware).toBe('function');
    });
  });

  describe('Invite Code Security', () => {
    it('should include invite code in trip details for HOST', async () => {
      const { user: host, token: hostToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(host.id);
      createdTrips.push(trip.id);

      const response = await request(app)
        .get(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.inviteCode).toBeDefined();
      expect(typeof response.body.data.inviteCode).toBe('string');
    });
  });

  describe('Rate Limiting for Authorization Attacks', () => {
    it('should consistently reject unauthorized deletion attempts', async () => {
      const { user: owner, token: ownerToken } = await createAuthenticatedTestUser();
      const { trip } = await TripFixtures.createTrip(owner.id);
      createdTrips.push(trip.id);

      const { user: attacker, token: attackerToken } = await createAuthenticatedTestUser();

      // Make multiple failed authorization attempts
      const attempts = 5;
      const results: number[] = [];

      for (let i = 0; i < attempts; i++) {
        const response = await request(app)
          .delete(`/api/v1/trips/${trip.id}`)
          .set('Authorization', `Bearer ${attackerToken}`);

        results.push(response.status);
      }

      // All should be 403 (forbidden) - consistent behavior
      expect(results.every(status => status === 403 || status === 404)).toBe(true);

      // Trip should still exist
      const tripExists = await prisma.trip.findUnique({
        where: { id: trip.id }
      });
      expect(tripExists).not.toBeNull();
    });
  });
});
