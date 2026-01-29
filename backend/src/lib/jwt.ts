/**
 * JWT token utilities for Group Planner API
 *
 * This module provides core JWT token functionality including signing,
 * verification, and decoding with comprehensive error handling and
 * security best practices.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { log } from '../utils/logger.js';
import type {
  JwtConfig,
  BaseJwtPayload,
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenVerificationResult,
  TokenGenerationOptions,
  JwtError,
  JwtOperationResult,
} from '../types/jwt.js';

/**
 * Validate JWT secret on startup
 */
function validateJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. Please set a secure random secret of at least 32 characters.'
    );
  }

  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. Current length: ' + secret.length
    );
  }

  if (secret === 'fallback-secret-key-for-development-only' ||
      secret === 'your-super-secret-jwt-key-change-in-production' ||
      secret === 'change-me' ||
      secret === 'secret') {
    throw new Error(
      'JWT_SECRET cannot use a default/example value. Please generate a secure random secret.'
    );
  }

  return secret;
}

/**
 * JWT service configuration
 */
const JWT_CONFIG: JwtConfig = {
  secret: validateJwtSecret(),
  accessTokenExpiryMinutes: 15,
  refreshTokenExpiryDays: 30,
  algorithm: 'HS256',
  issuer: process.env.JWT_ISSUER || 'group-planner-api',
  audience: process.env.JWT_AUDIENCE || 'group-planner-client',
};

/**
 * JWT utilities class
 */
export class JwtUtils {
  /**
   * Generate a unique JWT ID
   */
  static generateJwtId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Calculate expiry timestamp
   */
  static calculateExpiry(minutes: number): number {
    return Math.floor(Date.now() / 1000) + (minutes * 60);
  }

  /**
   * Calculate expiry timestamp in days
   */
  static calculateExpiryDays(days: number): number {
    return Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
  }

  /**
   * Sign a JWT token
   */
  static sign<T extends BaseJwtPayload>(
    payload: Omit<T, 'iat' | 'exp' | 'jti'>,
    options?: TokenGenerationOptions
  ): JwtOperationResult<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const jwtId = this.generateJwtId();

      // Determine expiry based on token type and options
      let expiresIn: number;
      if (options?.expiresIn) {
        if (typeof options.expiresIn === 'string') {
          // Parse string format like '15m', '30d'
          const match = options.expiresIn.match(/^(\d+)([mhd])$/);
          if (match) {
            const value = parseInt(match[1], 10);
            const unit = match[2];
            switch (unit) {
              case 'm':
                expiresIn = now + (value * 60);
                break;
              case 'h':
                expiresIn = now + (value * 60 * 60);
                break;
              case 'd':
                expiresIn = now + (value * 24 * 60 * 60);
                break;
              default:
                throw new Error(`Invalid time unit: ${unit}`);
            }
          } else {
            throw new Error(`Invalid expiresIn format: ${options.expiresIn}`);
          }
        } else {
          expiresIn = now + options.expiresIn;
        }
      } else {
        // Use default expiry based on token type
        if (payload.type === 'access') {
          expiresIn = this.calculateExpiry(JWT_CONFIG.accessTokenExpiryMinutes);
        } else {
          expiresIn = this.calculateExpiryDays(JWT_CONFIG.refreshTokenExpiryDays);
        }
      }

      // Construct full payload
      const fullPayload: T = {
        ...payload,
        iat: now,
        exp: expiresIn,
        jti: jwtId,
        iss: options?.issuer || JWT_CONFIG.issuer,
        aud: options?.audience || JWT_CONFIG.audience,
        ...(options?.additionalClaims || {}),
      } as T;

      // Sign the token
      const token = jwt.sign(fullPayload, JWT_CONFIG.secret, {
        algorithm: JWT_CONFIG.algorithm,
      });

      log.debug('JWT token signed successfully', {
        type: payload.type,
        sub: payload.sub,
        exp: expiresIn,
        jti: jwtId,
      });

      return {
        success: true,
        data: token,
      };
    } catch (error) {
      log.error('Failed to sign JWT token', error, {
        type: payload.type,
        sub: payload.sub,
      });

      return {
        success: false,
        error: 'SIGNATURE_INVALID',
        message: 'Failed to sign token',
      };
    }
  }

  /**
   * Verify and decode a JWT token
   */
  static verify<T extends BaseJwtPayload = BaseJwtPayload>(
    token: string,
    expectedType?: 'access' | 'refresh'
  ): TokenVerificationResult<T> {
    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_CONFIG.secret, {
        algorithms: [JWT_CONFIG.algorithm],
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
      }) as T;

      // Validate token structure
      if (!decoded.sub || !decoded.type || !decoded.iat || !decoded.exp) {
        log.warn('JWT token missing required claims', {
          sub: decoded.sub,
          type: decoded.type,
          iat: decoded.iat,
          exp: decoded.exp,
        });

        return {
          valid: false,
          error: 'MISSING_CLAIMS',
        };
      }

      // Check token type if specified
      if (expectedType && decoded.type !== expectedType) {
        log.warn('JWT token type mismatch', {
          expected: expectedType,
          actual: decoded.type,
          sub: decoded.sub,
        });

        return {
          valid: false,
          error: 'INVALID_TOKEN_TYPE',
        };
      }

      log.debug('JWT token verified successfully', {
        type: decoded.type,
        sub: decoded.sub,
        jti: decoded.jti,
      });

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      log.debug('JWT token verification failed', error, {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20),
      });

      // Handle specific JWT errors
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'TOKEN_EXPIRED',
          expired: true,
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'TOKEN_MALFORMED',
        };
      }

      if (error instanceof jwt.NotBeforeError) {
        return {
          valid: false,
          error: 'TOKEN_NOT_ACTIVE',
        };
      }

      return {
        valid: false,
        error: 'INVALID_TOKEN',
      };
    }
  }

  /**
   * Decode a JWT token without verification (for inspection purposes)
   */
  static decode(token: string): JwtOperationResult<BaseJwtPayload> {
    try {
      const decoded = jwt.decode(token) as BaseJwtPayload;

      if (!decoded) {
        return {
          success: false,
          error: 'TOKEN_MALFORMED',
          message: 'Failed to decode token',
        };
      }

      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      log.debug('Failed to decode JWT token', error);

      return {
        success: false,
        error: 'TOKEN_MALFORMED',
        message: 'Failed to decode token',
      };
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractFromAuthHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Check if a token is expired based on its payload
   */
  static isTokenExpired(payload: BaseJwtPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  /**
   * Get remaining token lifetime in seconds
   */
  static getTokenRemainingLifetime(payload: BaseJwtPayload): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - now);
  }

  /**
   * Create an access token
   */
  static createAccessToken(
    userId: string,
    email: string,
    username?: string | undefined,
    options?: TokenGenerationOptions
  ): JwtOperationResult<string> {
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp' | 'jti'> = {
      sub: userId,
      type: 'access',
      email,
      username,
    };

    return this.sign<AccessTokenPayload>(payload, options);
  }

  /**
   * Create a refresh token
   */
  static createRefreshToken(
    userId: string,
    tokenId: string,
    family?: string | undefined,
    options?: TokenGenerationOptions
  ): JwtOperationResult<string> {
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp' | 'jti'> = {
      sub: userId,
      type: 'refresh',
      tokenId,
      family,
    };

    return this.sign<RefreshTokenPayload>(payload, options);
  }

  /**
   * Validate JWT configuration
   */
  static validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // JWT secret validation is now done at startup in validateJwtSecret()

    if (JWT_CONFIG.accessTokenExpiryMinutes < 1) {
      errors.push('Access token expiry must be at least 1 minute');
    }

    if (JWT_CONFIG.refreshTokenExpiryDays < 1) {
      errors.push('Refresh token expiry must be at least 1 day');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Get JWT configuration
 */
export function getJwtConfig(): JwtConfig {
  return { ...JWT_CONFIG };
}

/**
 * Update JWT configuration (for testing purposes)
 */
export function updateJwtConfig(config: Partial<JwtConfig>): void {
  Object.assign(JWT_CONFIG, config);
}

// Default export
export default JwtUtils;