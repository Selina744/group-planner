/**
 * JWT Security Tests
 *
 * Comprehensive security tests for JWT token handling including:
 * - Token tampering detection
 * - Expired token rejection
 * - Invalid signature rejection
 * - Wrong audience/issuer rejection
 * - Algorithm confusion attack prevention
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtService } from '../../services/jwt.js';
import { JwtUtils, getJwtConfig } from '../../lib/jwt.js';
import { UserFixtures } from '../utils/test-fixtures.js';
import {
  getTestDb,
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase
} from '../utils/test-database.js';
import type { UserProfile } from '../../types/auth.js';
import type { AccessTokenPayload, RefreshTokenPayload } from '../../types/jwt.js';

describe('JWT Security Tests', () => {
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
      email: 'jwt-security-test@example.com',
      username: 'jwtsecurityuser',
      displayName: 'JWT Security Test User'
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

  describe('Token Tampering Detection', () => {
    it('should reject token with tampered payload', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      // Decode the token parts
      const parts = tokenPair.accessToken.split('.');
      expect(parts.length).toBe(3);

      // Decode payload
      const originalPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      // Tamper with payload - change user ID
      const tamperedPayload = {
        ...originalPayload,
        sub: 'different-user-id',
        email: 'attacker@evil.com'
      };

      // Re-encode payload
      const tamperedPayloadEncoded = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');

      // Create tampered token
      const tamperedToken = `${parts[0]}.${tamperedPayloadEncoded}.${parts[2]}`;

      const result = JwtService.verifyAccessToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject token with tampered header', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const parts = tokenPair.accessToken.split('.');

      // Decode header
      const originalHeader = JSON.parse(Buffer.from(parts[0], 'base64url').toString());

      // Tamper with header - change algorithm
      const tamperedHeader = {
        ...originalHeader,
        alg: 'none'
      };

      // Re-encode header
      const tamperedHeaderEncoded = Buffer.from(JSON.stringify(tamperedHeader)).toString('base64url');

      // Create tampered token
      const tamperedToken = `${tamperedHeaderEncoded}.${parts[1]}.${parts[2]}`;

      const result = JwtService.verifyAccessToken(tamperedToken);

      expect(result.valid).toBe(false);
    });

    it('should reject token with removed signature', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const parts = tokenPair.accessToken.split('.');

      // Remove signature
      const tokenWithoutSig = `${parts[0]}.${parts[1]}.`;

      const result = JwtService.verifyAccessToken(tokenWithoutSig);

      expect(result.valid).toBe(false);
    });

    it('should reject token with modified signature bytes', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const parts = tokenPair.accessToken.split('.');

      // Modify signature by changing a few characters
      const modifiedSig = parts[2].slice(0, -5) + 'XXXXX';
      const tamperedToken = `${parts[0]}.${parts[1]}.${modifiedSig}`;

      const result = JwtService.verifyAccessToken(tamperedToken);

      expect(result.valid).toBe(false);
    });

    it('should detect token with swapped signature from another token', async () => {
      const { profile } = await createTestUserProfile();

      // Generate two different tokens
      const tokenPair1 = await JwtService.generateTokenPair(profile);
      const tokenPair2 = await JwtService.generateTokenPair(profile);

      const parts1 = tokenPair1.accessToken.split('.');
      const parts2 = tokenPair2.accessToken.split('.');

      // Swap signatures
      const swappedToken = `${parts1[0]}.${parts1[1]}.${parts2[2]}`;

      const result = JwtService.verifyAccessToken(swappedToken);

      expect(result.valid).toBe(false);
    });
  });

  describe('Expired Token Rejection', () => {
    it('should reject expired access token', async () => {
      const { profile } = await createTestUserProfile();

      // Create token with negative expiry (already expired)
      const accessResult = JwtUtils.createAccessToken(
        profile.id,
        profile.email,
        profile.username,
        { expiresIn: -60 } // Expired 60 seconds ago
      );

      expect(accessResult.success).toBe(true);
      expect(accessResult.data).toBeDefined();

      const result = JwtService.verifyAccessToken(accessResult.data!);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_EXPIRED');
    });

    it('should reject token expired by 1 second', async () => {
      const { profile } = await createTestUserProfile();

      // Create token that expired 1 second ago
      const accessResult = JwtUtils.createAccessToken(
        profile.id,
        profile.email,
        profile.username,
        { expiresIn: -1 }
      );

      expect(accessResult.success).toBe(true);

      const result = JwtService.verifyAccessToken(accessResult.data!);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_EXPIRED');
    });

    it('should reject refresh token with database expiry in past', async () => {
      const { user, profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      // Manually expire the token in database
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) } // 1 second ago
      });

      const result = await JwtService.verifyRefreshToken(tokenPair.refreshToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_EXPIRED');
    });

    it('should accept token that is not yet expired', async () => {
      const { profile } = await createTestUserProfile();

      // Create token with 1 minute expiry
      const accessResult = JwtUtils.createAccessToken(
        profile.id,
        profile.email,
        profile.username,
        { expiresIn: 60 }
      );

      expect(accessResult.success).toBe(true);

      const result = JwtService.verifyAccessToken(accessResult.data!);

      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid Signature Rejection', () => {
    it('should reject token signed with wrong secret', async () => {
      const { profile } = await createTestUserProfile();

      // Create a token with a different secret
      const wrongSecret = 'this-is-a-completely-different-secret-key-that-is-long-enough';
      const now = Math.floor(Date.now() / 1000);

      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        username: profile.username,
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: 'group-planner-api',
        aud: 'group-planner-client'
      };

      const wrongToken = jwt.sign(payload, wrongSecret, { algorithm: 'HS256' });

      const result = JwtService.verifyAccessToken(wrongToken);

      expect(result.valid).toBe(false);
    });

    it('should reject completely random signature', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const parts = tokenPair.accessToken.split('.');

      // Generate random signature
      const randomSig = crypto.randomBytes(32).toString('base64url');
      const randomSigToken = `${parts[0]}.${parts[1]}.${randomSig}`;

      const result = JwtService.verifyAccessToken(randomSigToken);

      expect(result.valid).toBe(false);
    });

    it('should reject token with empty signature', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const parts = tokenPair.accessToken.split('.');

      // Empty signature
      const emptySignatureToken = `${parts[0]}.${parts[1]}.`;

      const result = JwtService.verifyAccessToken(emptySignatureToken);

      expect(result.valid).toBe(false);
    });

    it('should reject token with truncated signature', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const parts = tokenPair.accessToken.split('.');

      // Truncate signature to half length
      const truncatedSig = parts[2].slice(0, Math.floor(parts[2].length / 2));
      const truncatedToken = `${parts[0]}.${parts[1]}.${truncatedSig}`;

      const result = JwtService.verifyAccessToken(truncatedToken);

      expect(result.valid).toBe(false);
    });
  });

  describe('Wrong Audience/Issuer Rejection', () => {
    it('should reject token with wrong issuer', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        username: profile.username,
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: 'wrong-issuer', // Wrong issuer
        aud: config.audience
      };

      const wrongIssuerToken = jwt.sign(payload, config.secret, { algorithm: 'HS256' });

      const result = JwtService.verifyAccessToken(wrongIssuerToken);

      expect(result.valid).toBe(false);
    });

    it('should reject token with wrong audience', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        username: profile.username,
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: config.issuer,
        aud: 'wrong-audience' // Wrong audience
      };

      const wrongAudienceToken = jwt.sign(payload, config.secret, { algorithm: 'HS256' });

      const result = JwtService.verifyAccessToken(wrongAudienceToken);

      expect(result.valid).toBe(false);
    });

    it('should reject token with missing issuer', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        username: profile.username,
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        // Missing iss
        aud: config.audience
      };

      const missingIssuerToken = jwt.sign(payload, config.secret, { algorithm: 'HS256' });

      const result = JwtService.verifyAccessToken(missingIssuerToken);

      expect(result.valid).toBe(false);
    });

    it('should reject token with missing audience', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        username: profile.username,
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: config.issuer
        // Missing aud
      };

      const missingAudienceToken = jwt.sign(payload, config.secret, { algorithm: 'HS256' });

      const result = JwtService.verifyAccessToken(missingAudienceToken);

      expect(result.valid).toBe(false);
    });
  });

  describe('Algorithm Confusion Attack Prevention', () => {
    it('should reject token with alg:none', async () => {
      const { profile } = await createTestUserProfile();

      // Create a token header with alg: none
      const header = { alg: 'none', typ: 'JWT' };
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        username: profile.username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: 'group-planner-api',
        aud: 'group-planner-client'
      };

      const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
      const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const noneAlgToken = `${headerEncoded}.${payloadEncoded}.`;

      const result = JwtService.verifyAccessToken(noneAlgToken);

      expect(result.valid).toBe(false);
    });

    it('should reject token claiming RS256 when server uses HS256', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      // Create a header claiming RS256
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        username: profile.username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: 'group-planner-api',
        aud: 'group-planner-client'
      };

      const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
      const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');

      // Sign with HMAC secret but claim RS256
      // This simulates an algorithm confusion attack where attacker uses
      // the public key (which they might know) as the HMAC secret
      const fakeSignature = crypto
        .createHmac('sha256', config.secret)
        .update(`${headerEncoded}.${payloadEncoded}`)
        .digest('base64url');

      const confusionToken = `${headerEncoded}.${payloadEncoded}.${fakeSignature}`;

      const result = JwtService.verifyAccessToken(confusionToken);

      expect(result.valid).toBe(false);
    });

    it('should reject token with HS384 when server uses HS256', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        username: profile.username,
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: config.issuer,
        aud: config.audience
      };

      // Sign with HS384 instead of HS256
      const wrongAlgToken = jwt.sign(payload, config.secret, { algorithm: 'HS384' });

      const result = JwtService.verifyAccessToken(wrongAlgToken);

      expect(result.valid).toBe(false);
    });

    it('should reject token with HS512 when server uses HS256', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        username: profile.username,
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: config.issuer,
        aud: config.audience
      };

      // Sign with HS512 instead of HS256
      const wrongAlgToken = jwt.sign(payload, config.secret, { algorithm: 'HS512' });

      const result = JwtService.verifyAccessToken(wrongAlgToken);

      expect(result.valid).toBe(false);
    });
  });

  describe('Token Type Validation', () => {
    it('should reject refresh token when expecting access token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const result = JwtService.verifyAccessToken(tokenPair.refreshToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_TOKEN_TYPE');
    });

    it('should reject access token when expecting refresh token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      const result = await JwtService.verifyRefreshToken(tokenPair.accessToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_TOKEN_TYPE');
    });

    it('should reject token with invalid type claim', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        type: 'invalid-type', // Invalid type
        email: profile.email,
        username: profile.username,
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: config.issuer,
        aud: config.audience
      };

      const invalidTypeToken = jwt.sign(payload, config.secret, { algorithm: 'HS256' });

      const result = JwtService.verifyAccessToken(invalidTypeToken);

      expect(result.valid).toBe(false);
    });
  });

  describe('Missing Required Claims', () => {
    it('should reject token without sub claim', async () => {
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        // Missing sub
        type: 'access',
        email: 'test@example.com',
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: config.issuer,
        aud: config.audience
      };

      const missingSubToken = jwt.sign(payload, config.secret, { algorithm: 'HS256' });

      const result = JwtService.verifyAccessToken(missingSubToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_CLAIMS');
    });

    it('should reject token without type claim', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        // Missing type
        email: profile.email,
        iat: now,
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: config.issuer,
        aud: config.audience
      };

      const missingTypeToken = jwt.sign(payload, config.secret, { algorithm: 'HS256' });

      const result = JwtService.verifyAccessToken(missingTypeToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_CLAIMS');
    });

    it('should reject token without iat claim', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        // Missing iat
        exp: now + 900,
        jti: crypto.randomBytes(16).toString('hex'),
        iss: config.issuer,
        aud: config.audience
      };

      const missingIatToken = jwt.sign(payload, config.secret, {
        algorithm: 'HS256',
        noTimestamp: true
      });

      const result = JwtService.verifyAccessToken(missingIatToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_CLAIMS');
    });

    it('should reject token without exp claim', async () => {
      const { profile } = await createTestUserProfile();
      const config = getJwtConfig();

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: profile.id,
        type: 'access',
        email: profile.email,
        iat: now,
        // Missing exp
        jti: crypto.randomBytes(16).toString('hex'),
        iss: config.issuer,
        aud: config.audience
      };

      // Create token without automatic exp
      const header = { alg: 'HS256', typ: 'JWT' };
      const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
      const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = crypto
        .createHmac('sha256', config.secret)
        .update(`${headerEncoded}.${payloadEncoded}`)
        .digest('base64url');

      const missingExpToken = `${headerEncoded}.${payloadEncoded}.${signature}`;

      const result = JwtService.verifyAccessToken(missingExpToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_CLAIMS');
    });
  });

  describe('Malformed Token Handling', () => {
    it('should reject completely invalid string', () => {
      const result = JwtService.verifyAccessToken('not-a-jwt-at-all');

      expect(result.valid).toBe(false);
    });

    it('should reject token with only one part', () => {
      const result = JwtService.verifyAccessToken('onlyonepart');

      expect(result.valid).toBe(false);
    });

    it('should reject token with only two parts', () => {
      const result = JwtService.verifyAccessToken('part1.part2');

      expect(result.valid).toBe(false);
    });

    it('should reject token with invalid base64 encoding', () => {
      const result = JwtService.verifyAccessToken('!!!.@@@.###');

      expect(result.valid).toBe(false);
    });

    it('should reject empty string', () => {
      const result = JwtService.verifyAccessToken('');

      expect(result.valid).toBe(false);
    });

    it('should reject token with null bytes', () => {
      const result = JwtService.verifyAccessToken('eyJ\x00.eyJ\x00.\x00');

      expect(result.valid).toBe(false);
    });

    it('should reject extremely long token', () => {
      const veryLongToken = 'a'.repeat(100000) + '.' + 'b'.repeat(100000) + '.' + 'c'.repeat(100000);

      const result = JwtService.verifyAccessToken(veryLongToken);

      expect(result.valid).toBe(false);
    });
  });

  describe('Refresh Token Database Security', () => {
    it('should reject refresh token not in database', async () => {
      const config = getJwtConfig();

      // Create a valid-looking refresh token without database entry
      const fakeTokenId = crypto.randomBytes(16).toString('hex');
      const fakeFamily = crypto.randomBytes(8).toString('hex');

      const fakeToken = JwtUtils.createRefreshToken('fake-user-id', fakeTokenId, fakeFamily);

      expect(fakeToken.success).toBe(true);

      const result = await JwtService.verifyRefreshToken(fakeToken.data!);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_NOT_FOUND');
    });

    it('should reject revoked refresh token', async () => {
      const { profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      // Verify token works initially
      const initialResult = await JwtService.verifyRefreshToken(tokenPair.refreshToken);
      expect(initialResult.valid).toBe(true);

      // Revoke the token
      const jwtResult = JwtUtils.verify<RefreshTokenPayload>(tokenPair.refreshToken, 'refresh');
      await JwtService.revokeRefreshToken(jwtResult.payload!.tokenId);

      // Verify token is now rejected
      const revokedResult = await JwtService.verifyRefreshToken(tokenPair.refreshToken);

      expect(revokedResult.valid).toBe(false);
      expect(revokedResult.error).toBe('TOKEN_REVOKED');
    });

    it('should reject refresh token with mismatched hash', async () => {
      const { user, profile } = await createTestUserProfile();
      const tokenPair = await JwtService.generateTokenPair(profile);

      // Modify the hash in database
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { tokenHash: 'completely-wrong-hash-value' }
      });

      const result = await JwtService.verifyRefreshToken(tokenPair.refreshToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('SIGNATURE_INVALID');
    });
  });
});
