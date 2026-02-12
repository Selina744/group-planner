/**
 * JwtService Unit Tests
 *
 * Comprehensive tests for JWT token generation, validation, expiration,
 * and payload extraction functionality.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import jwt from 'jsonwebtoken';
import { JwtService } from '../../services/jwt.js';
import { JwtUtils } from '../../lib/jwt.js';
import { UserFixtures } from '../utils/test-fixtures.js';
import {
  getTestDb,
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase
} from '../utils/test-database.js';
import type { UserProfile } from '../../types/auth.js';
import type { AccessTokenPayload, RefreshTokenPayload } from '../../types/jwt.js';

describe('JwtService', () => {
  const prisma = getTestDb();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  /**
   * Helper to create a test user profile
   */
  async function createTestUserProfile(): Promise<{ user: any; profile: UserProfile }> {
    const user = await UserFixtures.createUser({
      email: 'jwt-test@example.com',
      username: 'jwtuser',
      displayName: 'JWT Test User'
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

    return { user, profile };
  }

  describe('Token Generation', () => {
    describe('generateTokenPair', () => {
      it('should generate both access and refresh tokens', async () => {
        const { profile } = await createTestUserProfile();

        const tokenPair = await JwtService.generateTokenPair(profile);

        expect(tokenPair.accessToken).toBeDefined();
        expect(tokenPair.refreshToken).toBeDefined();
        expect(typeof tokenPair.accessToken).toBe('string');
        expect(typeof tokenPair.refreshToken).toBe('string');
        expect(tokenPair.accessToken.split('.').length).toBe(3); // JWT format
        expect(tokenPair.refreshToken.split('.').length).toBe(3);
      });

      it('should set correct expiry timestamps', async () => {
        const { profile } = await createTestUserProfile();
        const now = Math.floor(Date.now() / 1000);

        const tokenPair = await JwtService.generateTokenPair(profile);

        // Access token should expire in ~15 minutes
        expect(tokenPair.accessTokenExpiresAt).toBeGreaterThan(now);
        expect(tokenPair.accessTokenExpiresAt).toBeLessThanOrEqual(now + 15 * 60 + 5); // 15 min + 5s buffer

        // Refresh token should expire in ~30 days
        expect(tokenPair.refreshTokenExpiresAt).toBeGreaterThan(now);
        expect(tokenPair.refreshTokenExpiresAt).toBeLessThanOrEqual(now + 30 * 24 * 60 * 60 + 5);
      });

      it('should store refresh token in database', async () => {
        const { user, profile } = await createTestUserProfile();

        await JwtService.generateTokenPair(profile);

        const storedTokens = await prisma.refreshToken.findMany({
          where: { userId: user.id }
        });

        expect(storedTokens.length).toBe(1);
        expect(storedTokens[0].revoked).toBe(false);
        expect(storedTokens[0].tokenHash).toBeDefined();
      });

      it('should include context information when provided', async () => {
        const { user, profile } = await createTestUserProfile();
        const context = {
          userAgent: 'Mozilla/5.0 Test Browser',
          ipAddress: '192.168.1.100'
        };

        await JwtService.generateTokenPair(profile, context);

        const storedToken = await prisma.refreshToken.findFirst({
          where: { userId: user.id }
        });

        expect(storedToken?.userAgent).toBe(context.userAgent);
        expect(storedToken?.ipAddress).toBe(context.ipAddress);
      });

      it('should use provided token family for rotation tracking', async () => {
        const { user, profile } = await createTestUserProfile();
        const existingFamily = 'test-family-12345678';

        await JwtService.generateTokenPair(profile, { family: existingFamily });

        const storedToken = await prisma.refreshToken.findFirst({
          where: { userId: user.id }
        });

        expect(storedToken?.family).toBe(existingFamily);
      });

      it('should generate unique token IDs for each call', async () => {
        const { user, profile } = await createTestUserProfile();

        await JwtService.generateTokenPair(profile);
        await JwtService.generateTokenPair(profile);

        const storedTokens = await prisma.refreshToken.findMany({
          where: { userId: user.id }
        });

        expect(storedTokens.length).toBe(2);
        expect(storedTokens[0].tokenId).not.toBe(storedTokens[1].tokenId);
      });
    });

    describe('Access token generation', () => {
      it('should create access token with correct payload structure', async () => {
        const { profile } = await createTestUserProfile();

        const tokenPair = await JwtService.generateTokenPair(profile);

        const verification = JwtService.verifyAccessToken(tokenPair.accessToken);

        expect(verification.valid).toBe(true);
        expect(verification.payload?.sub).toBe(profile.id);
        expect(verification.payload?.type).toBe('access');
        expect(verification.payload?.email).toBe(profile.email);
        expect(verification.payload?.username).toBe(profile.username);
      });
    });

    describe('Refresh token generation', () => {
      it('should create refresh token with correct payload structure', async () => {
        const { profile } = await createTestUserProfile();

        const tokenPair = await JwtService.generateTokenPair(profile);

        // Verify without DB check to inspect structure
        const jwtResult = JwtUtils.verify<RefreshTokenPayload>(tokenPair.refreshToken, 'refresh');

        expect(jwtResult.valid).toBe(true);
        expect(jwtResult.payload?.sub).toBe(profile.id);
        expect(jwtResult.payload?.type).toBe('refresh');
        expect(jwtResult.payload?.tokenId).toBeDefined();
        expect(jwtResult.payload?.family).toBeDefined();
      });
    });
  });

  describe('Token Validation', () => {
    describe('verifyAccessToken', () => {
      it('should validate a valid access token', async () => {
        const { profile } = await createTestUserProfile();
        const tokenPair = await JwtService.generateTokenPair(profile);

        const result = JwtService.verifyAccessToken(tokenPair.accessToken);

        expect(result.valid).toBe(true);
        expect(result.payload).toBeDefined();
        expect(result.payload?.sub).toBe(profile.id);
        expect(result.error).toBeUndefined();
      });

      it('should reject an invalid access token', () => {
        const result = JwtService.verifyAccessToken('invalid.token.here');

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject a malformed token', () => {
        const result = JwtService.verifyAccessToken('not-a-jwt');

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject an empty token', () => {
        const result = JwtService.verifyAccessToken('');

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject a refresh token when expecting access token', async () => {
        const { profile } = await createTestUserProfile();
        const tokenPair = await JwtService.generateTokenPair(profile);

        const result = JwtService.verifyAccessToken(tokenPair.refreshToken);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('INVALID_TOKEN_TYPE');
      });

      it('should reject token with wrong signature', async () => {
        const { profile } = await createTestUserProfile();
        const tokenPair = await JwtService.generateTokenPair(profile);

        // Tamper with the signature
        const [header, payload] = tokenPair.accessToken.split('.');
        const tamperedToken = `${header}.${payload}.tampered-signature`;

        const result = JwtService.verifyAccessToken(tamperedToken);

        expect(result.valid).toBe(false);
      });
    });

    describe('verifyRefreshToken', () => {
      it('should validate a valid refresh token with database check', async () => {
        const { profile } = await createTestUserProfile();
        const tokenPair = await JwtService.generateTokenPair(profile);

        const result = await JwtService.verifyRefreshToken(tokenPair.refreshToken);

        expect(result.valid).toBe(true);
        expect(result.payload).toBeDefined();
        expect(result.dbRecord).toBeDefined();
        expect(result.payload?.sub).toBe(profile.id);
        expect(result.dbRecord?.userId).toBe(profile.id);
      });

      it('should reject a revoked refresh token', async () => {
        const { profile } = await createTestUserProfile();
        const tokenPair = await JwtService.generateTokenPair(profile);

        // Revoke the token
        const jwtResult = JwtUtils.verify<RefreshTokenPayload>(tokenPair.refreshToken, 'refresh');
        await JwtService.revokeRefreshToken(jwtResult.payload!.tokenId);

        const result = await JwtService.verifyRefreshToken(tokenPair.refreshToken);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('TOKEN_REVOKED');
      });

      it('should reject refresh token not in database', async () => {
        // Create a valid JWT but without database record
        const fakeTokenId = 'non-existent-token-id';
        const fakeToken = JwtUtils.createRefreshToken('fake-user-id', fakeTokenId, 'fake-family');

        if (!fakeToken.success || !fakeToken.data) {
          throw new Error('Failed to create fake token');
        }

        const result = await JwtService.verifyRefreshToken(fakeToken.data);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('TOKEN_NOT_FOUND');
      });

      it('should validate without database check when disabled', async () => {
        const { profile } = await createTestUserProfile();
        const tokenPair = await JwtService.generateTokenPair(profile);

        // Revoke in database
        const jwtResult = JwtUtils.verify<RefreshTokenPayload>(tokenPair.refreshToken, 'refresh');
        await JwtService.revokeRefreshToken(jwtResult.payload!.tokenId);

        // Verify without revocation check
        const result = await JwtService.verifyRefreshToken(tokenPair.refreshToken, {
          checkRevocation: false
        });

        // Should pass JWT validation (even though revoked in DB)
        expect(result.valid).toBe(true);
        expect(result.payload).toBeDefined();
      });

      it('should reject an access token when expecting refresh token', async () => {
        const { profile } = await createTestUserProfile();
        const tokenPair = await JwtService.generateTokenPair(profile);

        const result = await JwtService.verifyRefreshToken(tokenPair.accessToken);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('INVALID_TOKEN_TYPE');
      });
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired access token', async () => {
      const { profile } = await createTestUserProfile();

      // Create token with very short expiry
      const accessResult = JwtUtils.createAccessToken(
        profile.id,
        profile.email,
        profile.username,
        { expiresIn: -1 } // Already expired
      );

      expect(accessResult.success).toBe(true);

      const result = JwtService.verifyAccessToken(accessResult.data!);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_EXPIRED');
    });

    it('should identify token expiration correctly', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const verification = JwtService.verifyAccessToken(tokenPair.accessToken);

      expect(verification.valid).toBe(true);

      // Token should not be expired
      const isExpired = JwtUtils.isTokenExpired(verification.payload!);
      expect(isExpired).toBe(false);
    });

    it('should calculate remaining token lifetime', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const verification = JwtService.verifyAccessToken(tokenPair.accessToken);
      expect(verification.valid).toBe(true);

      const remaining = JwtUtils.getTokenRemainingLifetime(verification.payload!);

      // Should have between 14 and 15 minutes remaining
      expect(remaining).toBeGreaterThan(14 * 60 - 5);
      expect(remaining).toBeLessThanOrEqual(15 * 60);
    });

    it('should return zero for expired token lifetime', async () => {
      // Create an already-expired payload
      const expiredPayload = {
        sub: 'test-user',
        type: 'access' as const,
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 1800 // Expired 30 mins ago
      };

      const remaining = JwtUtils.getTokenRemainingLifetime(expiredPayload);

      expect(remaining).toBe(0);
    });

    it('should reject refresh token expired in database', async () => {
      const { user, profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      // Manually expire the token in database
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) }
      });

      const result = await JwtService.verifyRefreshToken(tokenPair.refreshToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Token Payload Extraction', () => {
    it('should extract user ID from access token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const result = JwtService.verifyAccessToken(tokenPair.accessToken);

      expect(result.payload?.sub).toBe(profile.id);
    });

    it('should extract email from access token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const result = JwtService.verifyAccessToken(tokenPair.accessToken);

      expect(result.payload?.email).toBe(profile.email);
    });

    it('should extract username from access token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const result = JwtService.verifyAccessToken(tokenPair.accessToken);

      expect(result.payload?.username).toBe(profile.username);
    });

    it('should extract token type from access token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const result = JwtService.verifyAccessToken(tokenPair.accessToken);

      expect(result.payload?.type).toBe('access');
    });

    it('should extract tokenId from refresh token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const result = await JwtService.verifyRefreshToken(tokenPair.refreshToken);

      expect(result.payload?.tokenId).toBeDefined();
      expect(typeof result.payload?.tokenId).toBe('string');
    });

    it('should extract family from refresh token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile, {
        family: 'test-family-abc123'
      });

      const result = await JwtService.verifyRefreshToken(tokenPair.refreshToken);

      expect(result.payload?.family).toBe('test-family-abc123');
    });

    it('should decode token without verification', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const decoded = JwtUtils.decode(tokenPair.accessToken);

      expect(decoded.success).toBe(true);
      expect(decoded.data?.sub).toBe(profile.id);
      expect(decoded.data?.type).toBe('access');
    });

    it('should extract token from Authorization header', () => {
      const token = 'test-bearer-token-12345';
      const header = `Bearer ${token}`;

      const extracted = JwtUtils.extractFromAuthHeader(header);

      expect(extracted).toBe(token);
    });

    it('should return null for missing Authorization header', () => {
      const extracted = JwtUtils.extractFromAuthHeader(undefined);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid Authorization header format', () => {
      const extracted = JwtUtils.extractFromAuthHeader('InvalidFormat token');

      expect(extracted).toBeNull();
    });
  });

  describe('Token Revocation', () => {
    describe('revokeRefreshToken', () => {
      it('should revoke a specific refresh token', async () => {
        const { profile } = await createTestUserProfile();
        const tokenPair = await JwtService.generateTokenPair(profile);

        const jwtResult = JwtUtils.verify<RefreshTokenPayload>(tokenPair.refreshToken, 'refresh');
        await JwtService.revokeRefreshToken(jwtResult.payload!.tokenId);

        const storedToken = await prisma.refreshToken.findUnique({
          where: { tokenId: jwtResult.payload!.tokenId }
        });

        expect(storedToken?.revoked).toBe(true);
        expect(storedToken?.revokedAt).toBeDefined();
      });

      it('should store revocation reason', async () => {
        const { profile } = await createTestUserProfile();
        const tokenPair = await JwtService.generateTokenPair(profile);

        const jwtResult = JwtUtils.verify<RefreshTokenPayload>(tokenPair.refreshToken, 'refresh');
        await JwtService.revokeRefreshToken(jwtResult.payload!.tokenId, {
          reason: 'User logout'
        });

        const storedToken = await prisma.refreshToken.findUnique({
          where: { tokenId: jwtResult.payload!.tokenId }
        });

        expect(storedToken?.revokeReason).toBe('User logout');
      });
    });

    describe('revokeUserTokens', () => {
      it('should revoke all user tokens', async () => {
        const { user, profile } = await createTestUserProfile();

        // Generate multiple tokens
        await JwtService.generateTokenPair(profile);
        await JwtService.generateTokenPair(profile);
        await JwtService.generateTokenPair(profile);

        await JwtService.revokeUserTokens(user.id);

        const activeTokens = await prisma.refreshToken.findMany({
          where: { userId: user.id, revoked: false }
        });

        expect(activeTokens.length).toBe(0);
      });

      it('should not affect other users tokens', async () => {
        const { user: user1, profile: profile1 } = await createTestUserProfile();

        const user2 = await UserFixtures.createUser({
          email: 'other-user@example.com',
          username: 'otheruser'
        });
        const profile2: UserProfile = {
          id: user2.id,
          email: user2.email,
          username: user2.username || undefined,
          displayName: user2.displayName || undefined,
          timezone: 'UTC',
          emailVerified: user2.emailVerified,
          preferences: {},
          createdAt: user2.createdAt.toISOString(),
          updatedAt: user2.updatedAt.toISOString()
        };

        await JwtService.generateTokenPair(profile1);
        await JwtService.generateTokenPair(profile2);

        await JwtService.revokeUserTokens(user1.id);

        const user1Tokens = await prisma.refreshToken.findMany({
          where: { userId: user1.id, revoked: false }
        });
        const user2Tokens = await prisma.refreshToken.findMany({
          where: { userId: user2.id, revoked: false }
        });

        expect(user1Tokens.length).toBe(0);
        expect(user2Tokens.length).toBe(1);
      });
    });

    describe('revokeTokenFamily', () => {
      it('should revoke all tokens in a family', async () => {
        const { user, profile } = await createTestUserProfile();
        const family = 'shared-family-12345';

        // Generate tokens with same family
        await JwtService.generateTokenPair(profile, { family });
        await JwtService.generateTokenPair(profile, { family });

        // Generate token with different family
        await JwtService.generateTokenPair(profile, { family: 'different-family' });

        await JwtService.revokeTokenFamily(user.id, family);

        const sharedFamilyTokens = await prisma.refreshToken.findMany({
          where: { userId: user.id, family, revoked: false }
        });
        const differentFamilyTokens = await prisma.refreshToken.findMany({
          where: { userId: user.id, family: 'different-family', revoked: false }
        });

        expect(sharedFamilyTokens.length).toBe(0);
        expect(differentFamilyTokens.length).toBe(1);
      });

      it('should do nothing when family is undefined', async () => {
        const { user, profile } = await createTestUserProfile();

        await JwtService.generateTokenPair(profile);

        // This should not throw and should not revoke anything
        await JwtService.revokeTokenFamily(user.id, undefined);

        const tokens = await prisma.refreshToken.findMany({
          where: { userId: user.id, revoked: false }
        });

        expect(tokens.length).toBe(1);
      });
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens and return new pair', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const refreshResult = await JwtService.refreshTokens({
        refreshToken: tokenPair.refreshToken
      });

      expect(refreshResult.tokens.accessToken).toBeDefined();
      expect(refreshResult.tokens.refreshToken).toBeDefined();
      expect(refreshResult.tokens.accessToken).not.toBe(tokenPair.accessToken);
      expect(refreshResult.tokens.refreshToken).not.toBe(tokenPair.refreshToken);
      expect(refreshResult.user.id).toBe(profile.id);
    });

    it('should revoke old refresh token after refresh', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const jwtResult = JwtUtils.verify<RefreshTokenPayload>(tokenPair.refreshToken, 'refresh');
      const oldTokenId = jwtResult.payload!.tokenId;

      await JwtService.refreshTokens({
        refreshToken: tokenPair.refreshToken
      });

      const oldToken = await prisma.refreshToken.findUnique({
        where: { tokenId: oldTokenId }
      });

      expect(oldToken?.revoked).toBe(true);
      expect(oldToken?.revokeReason).toBe('Token rotation');
    });

    it('should preserve token family during refresh', async () => {
      const { user, profile } = await createTestUserProfile();
      const family = 'rotation-family-test';

      const tokenPair = await JwtService.generateTokenPair(profile, { family });

      await JwtService.refreshTokens({
        refreshToken: tokenPair.refreshToken
      });

      const newTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id, revoked: false }
      });

      expect(newTokens.length).toBe(1);
      expect(newTokens[0].family).toBe(family);
    });

    it('should reject refresh with invalid token', async () => {
      await expect(
        JwtService.refreshTokens({ refreshToken: 'invalid-token' })
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should reject refresh with revoked token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const jwtResult = JwtUtils.verify<RefreshTokenPayload>(tokenPair.refreshToken, 'refresh');
      await JwtService.revokeRefreshToken(jwtResult.payload!.tokenId);

      await expect(
        JwtService.refreshTokens({ refreshToken: tokenPair.refreshToken })
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Token Cleanup', () => {
    it('should cleanup expired tokens', async () => {
      const { user, profile } = await createTestUserProfile();
      await JwtService.generateTokenPair(profile);

      // Manually expire the token
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) }
      });

      const result = await JwtService.cleanupExpiredTokens();

      expect(result.deletedCount).toBeGreaterThanOrEqual(1);

      const remainingTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id }
      });

      expect(remainingTokens.length).toBe(0);
    });

    it('should not delete non-expired tokens', async () => {
      const { user, profile } = await createTestUserProfile();
      await JwtService.generateTokenPair(profile);

      const result = await JwtService.cleanupExpiredTokens();

      // Should not delete our valid token
      const remainingTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id }
      });

      expect(remainingTokens.length).toBe(1);
    });
  });

  describe('Get User Active Tokens', () => {
    it('should return active tokens for user', async () => {
      const { user, profile } = await createTestUserProfile();

      await JwtService.generateTokenPair(profile);
      await JwtService.generateTokenPair(profile);

      const tokens = await JwtService.getUserActiveTokens(user.id);

      expect(tokens.length).toBe(2);
      expect(tokens.every(t => t.userId === user.id)).toBe(true);
      expect(tokens.every(t => !t.revoked)).toBe(true);
    });

    it('should not return revoked tokens', async () => {
      const { user, profile } = await createTestUserProfile();

      const tokenPair1 = await JwtService.generateTokenPair(profile);
      await JwtService.generateTokenPair(profile);

      // Revoke first token
      const jwtResult = JwtUtils.verify<RefreshTokenPayload>(tokenPair1.refreshToken, 'refresh');
      await JwtService.revokeRefreshToken(jwtResult.payload!.tokenId);

      const tokens = await JwtService.getUserActiveTokens(user.id);

      expect(tokens.length).toBe(1);
    });

    it('should not return expired tokens', async () => {
      const { user, profile } = await createTestUserProfile();

      await JwtService.generateTokenPair(profile);
      await JwtService.generateTokenPair(profile);

      // Expire one token
      const allTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id }
      });
      await prisma.refreshToken.update({
        where: { id: allTokens[0].id },
        data: { expiresAt: new Date(Date.now() - 1000) }
      });

      const tokens = await JwtService.getUserActiveTokens(user.id);

      expect(tokens.length).toBe(1);
    });

    it('should return empty array for user with no tokens', async () => {
      const user = await UserFixtures.createUser({
        email: 'no-tokens@example.com'
      });

      const tokens = await JwtService.getUserActiveTokens(user.id);

      expect(tokens.length).toBe(0);
    });
  });

  describe('JwtUtils Helper Functions', () => {
    it('should generate unique JWT IDs', () => {
      const id1 = JwtUtils.generateJwtId();
      const id2 = JwtUtils.generateJwtId();

      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(32); // 16 bytes hex = 32 chars
    });

    it('should calculate expiry in minutes correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiry = JwtUtils.calculateExpiry(15);

      expect(expiry).toBeGreaterThanOrEqual(now + 15 * 60 - 1);
      expect(expiry).toBeLessThanOrEqual(now + 15 * 60 + 1);
    });

    it('should calculate expiry in days correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiry = JwtUtils.calculateExpiryDays(7);

      expect(expiry).toBeGreaterThanOrEqual(now + 7 * 24 * 60 * 60 - 1);
      expect(expiry).toBeLessThanOrEqual(now + 7 * 24 * 60 * 60 + 1);
    });

    it('should validate config correctly', () => {
      const validation = JwtUtils.validateConfig();

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });
});
