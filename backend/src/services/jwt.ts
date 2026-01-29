/**
 * JWT service for Group Planner API
 *
 * This service provides complete JWT token management including access token
 * generation, refresh token management with database storage, token rotation,
 * and revocation with comprehensive security measures.
 */

import crypto from 'crypto';
import { prisma, safePrismaOperation } from '../lib/prisma.js';
import { JwtUtils } from '../lib/jwt.js';
import { log } from '../utils/logger.js';
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../utils/errors.js';
import type {
  JwtTokenPair,
  TokenRefreshRequest,
  TokenRefreshResponse,
  TokenRevocationOptions,
  TokenValidationContext,
  RefreshTokenRecord,
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../types/jwt.js';
import type { UserProfile } from '../types/auth.js';

/**
 * JWT service class
 */
export class JwtService {
  /**
   * Generate a complete token pair for a user
   */
  static async generateTokenPair(
    user: UserProfile,
    context?: {
      userAgent?: string | undefined;
      ipAddress?: string | undefined;
      family?: string | undefined;
    }
  ): Promise<JwtTokenPair> {
    try {
      // Generate unique token ID for refresh token
      const tokenId = crypto.randomBytes(16).toString('hex');
      const family = context?.family || crypto.randomBytes(8).toString('hex');

      // Create access token
      const accessTokenResult = JwtUtils.createAccessToken(
        user.id,
        user.email,
        user.username
      );

      if (!accessTokenResult.success || !accessTokenResult.data) {
        throw new Error('Failed to create access token');
      }

      // Create refresh token
      const refreshTokenResult = JwtUtils.createRefreshToken(
        user.id,
        tokenId,
        family
      );

      if (!refreshTokenResult.success || !refreshTokenResult.data) {
        throw new Error('Failed to create refresh token');
      }

      // Hash the refresh token for database storage
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshTokenResult.data)
        .digest('hex');

      // Calculate expiry dates
      const accessTokenExpiresAt = JwtUtils.calculateExpiry(15);
      const refreshTokenExpiresAt = JwtUtils.calculateExpiryDays(30);

      // Store refresh token in database
      await safePrismaOperation(async () => {
        await prisma.refreshToken.create({
          data: {
            id: tokenId,
            tokenId,
            userId: user.id,
            tokenHash: refreshTokenHash,
            family,
            expiresAt: new Date(refreshTokenExpiresAt * 1000),
            userAgent: context?.userAgent ?? null,
            ipAddress: context?.ipAddress ?? null,
            revoked: false,
          },
        });
      }, 'Store refresh token');

      log.auth('Token pair generated successfully', {
        userId: user.id,
        tokenId,
        family,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
      });

      return {
        accessToken: accessTokenResult.data,
        refreshToken: refreshTokenResult.data,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      };
    } catch (error) {
      log.error('Failed to generate token pair', error, {
        userId: user.id,
      });
      throw new Error('Failed to generate authentication tokens');
    }
  }

  /**
   * Verify an access token
   */
  static verifyAccessToken(token: string): {
    valid: boolean;
    payload?: AccessTokenPayload | undefined;
    error?: string | undefined;
  } {
    const result = JwtUtils.verify<AccessTokenPayload>(token, 'access');

    if (!result.valid) {
      log.debug('Access token verification failed', {
        error: result.error,
        expired: result.expired,
      });
    }

    return result;
  }

  /**
   * Verify a refresh token and check database status
   */
  static async verifyRefreshToken(
    token: string,
    context?: TokenValidationContext
  ): Promise<{
    valid: boolean;
    payload?: RefreshTokenPayload | undefined;
    dbRecord?: RefreshTokenRecord | undefined;
    error?: string | undefined;
  }> {
    // First verify the JWT structure
    const jwtResult = JwtUtils.verify<RefreshTokenPayload>(token, 'refresh');

    if (!jwtResult.valid || !jwtResult.payload) {
      return {
        valid: false,
        error: jwtResult.error,
      };
    }

    // Check database record if requested
    if (context?.checkRevocation !== false) {
      try {
        const dbRecord = await safePrismaOperation(async () => {
          return await prisma.refreshToken.findUnique({
            where: { tokenId: jwtResult.payload!.tokenId },
          });
        }, 'Verify refresh token database');

        if (!dbRecord) {
          log.warn('Refresh token not found in database', {
            tokenId: jwtResult.payload.tokenId,
            userId: jwtResult.payload.sub,
          });

          return {
            valid: false,
            error: 'TOKEN_NOT_FOUND',
          };
        }

        if (dbRecord.revoked) {
          log.warn('Refresh token is revoked', {
            tokenId: jwtResult.payload.tokenId,
            userId: jwtResult.payload.sub,
            revokedAt: dbRecord.revokedAt,
            revokeReason: dbRecord.revokeReason,
          });

          return {
            valid: false,
            error: 'TOKEN_REVOKED',
          };
        }

        // Check expiry
        if (dbRecord.expiresAt < new Date()) {
          log.warn('Refresh token expired in database', {
            tokenId: jwtResult.payload.tokenId,
            userId: jwtResult.payload.sub,
            expiresAt: dbRecord.expiresAt,
          });

          return {
            valid: false,
            error: 'TOKEN_EXPIRED',
          };
        }

        // Verify token hash
        const tokenHash = crypto
          .createHash('sha256')
          .update(token)
          .digest('hex');

        if (tokenHash !== dbRecord.tokenHash) {
          log.error('Refresh token hash mismatch', {
            tokenId: jwtResult.payload.tokenId,
            userId: jwtResult.payload.sub,
          });

          return {
            valid: false,
            error: 'SIGNATURE_INVALID',
          };
        }

        return {
          valid: true,
          payload: jwtResult.payload,
          dbRecord: dbRecord as RefreshTokenRecord,
        };
      } catch (error) {
        log.error('Failed to verify refresh token in database', error, {
          tokenId: jwtResult.payload.tokenId,
        });

        return {
          valid: false,
          error: 'INVALID_TOKEN',
        };
      }
    }

    return {
      valid: true,
      payload: jwtResult.payload,
    };
  }

  /**
   * Refresh token rotation - create new tokens and revoke old ones
   */
  static async refreshTokens(
    request: TokenRefreshRequest
  ): Promise<TokenRefreshResponse> {
    const { refreshToken, userAgent, ipAddress } = request;

    // Verify the refresh token
    const verification = await this.verifyRefreshToken(refreshToken, {
      checkRevocation: true,
      userAgent,
      ipAddress,
    });

    if (!verification.valid || !verification.payload || !verification.dbRecord) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const { payload: tokenPayload, dbRecord } = verification;

    try {
      // Get user information
      const user = await safePrismaOperation(async () => {
        return await prisma.user.findUnique({
          where: { id: tokenPayload.sub },
        });
      }, 'Get user for token refresh');

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate new token pair (same family for rotation tracking)
      const newTokens = await this.generateTokenPair(
        {
          id: user.id,
          email: user.email,
          username: user.username || undefined,
          displayName: user.displayName || undefined,
          timezone: user.timezone || 'UTC',
          emailVerified: user.emailVerified,
          preferences: user.preferences as Record<string, unknown>,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        {
          userAgent,
          ipAddress,
          family: dbRecord.family || undefined,
        }
      );

      // Revoke the old refresh token
      await safePrismaOperation(async () => {
        await prisma.refreshToken.update({
          where: { tokenId: tokenPayload.tokenId },
          data: {
            revoked: true,
            revokedAt: new Date(),
            revokeReason: 'Token rotation',
          },
        });
      }, 'Revoke old refresh token');

      log.auth('Tokens refreshed successfully', {
        userId: user.id,
        oldTokenId: tokenPayload.tokenId,
        family: dbRecord.family,
        userAgent,
        ipAddress,
      });

      return {
        tokens: newTokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username || undefined,
        },
      };
    } catch (error) {
      // If token refresh fails, revoke the token family to prevent reuse
      await this.revokeTokenFamily(
        tokenPayload.sub,
        verification.dbRecord.family || undefined,
        'Failed token refresh'
      );

      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }

      log.error('Token refresh failed', error, {
        userId: tokenPayload.sub,
        tokenId: tokenPayload.tokenId,
      });

      throw new Error('Failed to refresh tokens');
    }
  }

  /**
   * Revoke a specific refresh token
   */
  static async revokeRefreshToken(
    tokenId: string,
    options?: TokenRevocationOptions
  ): Promise<void> {
    try {
      await safePrismaOperation(async () => {
        const updateData: any = {
          revoked: true,
          revokedAt: new Date(),
        };

        if (options?.reason) {
          updateData.revokeReason = options.reason;
        }

        await prisma.refreshToken.update({
          where: { tokenId },
          data: updateData,
        });
      }, 'Revoke refresh token');

      log.auth('Refresh token revoked', {
        tokenId,
        reason: options?.reason,
      });
    } catch (error) {
      log.error('Failed to revoke refresh token', error, { tokenId });
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeUserTokens(
    userId: string,
    options?: TokenRevocationOptions
  ): Promise<void> {
    try {
      const updateData: any = {
        revoked: true,
        revokedAt: new Date(),
      };

      if (options?.reason) {
        updateData.revokeReason = options.reason;
      }

      const result = await safePrismaOperation(async () => {
        return await prisma.refreshToken.updateMany({
          where: {
            userId,
            revoked: false,
          },
          data: updateData,
        });
      }, 'Revoke all user tokens');

      log.auth('All user tokens revoked', {
        userId,
        count: result.count,
        reason: options?.reason,
      });
    } catch (error) {
      log.error('Failed to revoke user tokens', error, { userId });
      throw new Error('Failed to revoke user tokens');
    }
  }

  /**
   * Revoke all tokens in a token family
   */
  static async revokeTokenFamily(
    userId: string,
    family?: string | undefined,
    reason?: string | undefined
  ): Promise<void> {
    if (!family) {
      return;
    }

    try {
      const updateData: any = {
        revoked: true,
        revokedAt: new Date(),
      };

      if (reason) {
        updateData.revokeReason = reason;
      }

      const result = await safePrismaOperation(async () => {
        return await prisma.refreshToken.updateMany({
          where: {
            userId,
            family,
            revoked: false,
          },
          data: updateData,
        });
      }, 'Revoke token family');

      log.auth('Token family revoked', {
        userId,
        family,
        count: result.count,
        reason,
      });
    } catch (error) {
      log.error('Failed to revoke token family', error, {
        userId,
        family,
      });
      throw new Error('Failed to revoke token family');
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  static async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
    try {
      const result = await safePrismaOperation(async () => {
        return await prisma.refreshToken.deleteMany({
          where: {
            expiresAt: {
              lt: new Date(),
            },
          },
        });
      }, 'Cleanup expired tokens');

      log.info('Expired tokens cleaned up', { count: result.count });

      return { deletedCount: result.count };
    } catch (error) {
      log.error('Failed to cleanup expired tokens', error);
      throw new Error('Failed to cleanup expired tokens');
    }
  }

  /**
   * Get user's active refresh tokens
   */
  static async getUserActiveTokens(userId: string): Promise<RefreshTokenRecord[]> {
    try {
      const tokens = await safePrismaOperation(async () => {
        return await prisma.refreshToken.findMany({
          where: {
            userId,
            revoked: false,
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      }, 'Get user active tokens');

      return tokens as RefreshTokenRecord[];
    } catch (error) {
      log.error('Failed to get user active tokens', error, { userId });
      throw new Error('Failed to retrieve user tokens');
    }
  }
}

// Export the service
export default JwtService;
