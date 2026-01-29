/**
 * JWT token types and interfaces for Group Planner API
 *
 * This module defines all types related to JWT token management,
 * including payload structures, configuration, and token operations.
 */

import type { JwtPayload } from 'jsonwebtoken';

/**
 * JWT configuration settings
 */
export interface JwtConfig {
  /** Secret key for signing tokens */
  secret: string;
  /** Access token expiry in minutes */
  accessTokenExpiryMinutes: number;
  /** Refresh token expiry in days */
  refreshTokenExpiryDays: number;
  /** JWT algorithm to use */
  algorithm: 'HS256' | 'HS384' | 'HS512';
  /** JWT issuer */
  issuer?: string | undefined;
  /** JWT audience */
  audience?: string | undefined;
}

/**
 * Base JWT payload structure
 */
export interface BaseJwtPayload extends JwtPayload {
  /** User ID */
  sub: string;
  /** Token type */
  type: 'access' | 'refresh';
  /** Issued at timestamp */
  iat: number;
  /** Expires at timestamp */
  exp: number;
  /** JWT ID - unique identifier for the token */
  jti?: string | undefined;
  /** Issuer */
  iss?: string | undefined;
  /** Audience */
  aud?: string | undefined;
}

/**
 * Access token payload
 */
export interface AccessTokenPayload extends BaseJwtPayload {
  type: 'access';
  /** User email */
  email: string;
  /** Username if available */
  username?: string | undefined;
}

/**
 * Refresh token payload
 */
export interface RefreshTokenPayload extends BaseJwtPayload {
  type: 'refresh';
  /** Database token ID for revocation */
  tokenId: string;
  /** Token family for rotation tracking */
  family?: string | undefined;
}

/**
 * JWT token pair result
 */
export interface JwtTokenPair {
  /** Access token */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Access token expiry timestamp */
  accessTokenExpiresAt: number;
  /** Refresh token expiry timestamp */
  refreshTokenExpiresAt: number;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult<T extends BaseJwtPayload = BaseJwtPayload> {
  /** Whether the token is valid */
  valid: boolean;
  /** Decoded payload if valid */
  payload?: T | undefined;
  /** Error message if invalid */
  error?: string | undefined;
  /** Whether the token is expired */
  expired?: boolean | undefined;
}

/**
 * Token generation options
 */
export interface TokenGenerationOptions {
  /** Custom expiry time (overrides config defaults) */
  expiresIn?: string | number | undefined;
  /** Custom audience */
  audience?: string | undefined;
  /** Custom issuer */
  issuer?: string | undefined;
  /** Additional claims to include */
  additionalClaims?: Record<string, unknown> | undefined;
}

/**
 * Refresh token database record
 */
export interface RefreshTokenRecord {
  /** Database ID */
  id: string;
  /** Token ID (jti) */
  tokenId: string;
  /** User ID */
  userId: string;
  /** Hashed refresh token */
  tokenHash: string;
  /** Token family for rotation tracking */
  family?: string | undefined;
  /** Expiry timestamp */
  expiresAt: Date;
  /** Whether the token has been revoked */
  revoked: boolean;
  /** When the token was revoked */
  revokedAt?: Date | undefined;
  /** Reason for revocation */
  revokeReason?: string | undefined;
  /** User agent string */
  userAgent?: string | undefined;
  /** IP address */
  ipAddress?: string | undefined;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  /** Refresh token */
  refreshToken: string;
  /** Optional user agent */
  userAgent?: string | undefined;
  /** Optional IP address */
  ipAddress?: string | undefined;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  /** New token pair */
  tokens: JwtTokenPair;
  /** User information */
  user: {
    id: string;
    email: string;
    username?: string | undefined;
  };
}

/**
 * Token revocation options
 */
export interface TokenRevocationOptions {
  /** Reason for revocation */
  reason?: string | undefined;
  /** Whether to revoke all tokens for the user */
  revokeAllUserTokens?: boolean | undefined;
  /** Whether to revoke all tokens in the same family */
  revokeTokenFamily?: boolean | undefined;
}

/**
 * Token validation context
 */
export interface TokenValidationContext {
  /** User agent string */
  userAgent?: string | undefined;
  /** IP address */
  ipAddress?: string | undefined;
  /** Whether to check if token is revoked */
  checkRevocation?: boolean | undefined;
}

/**
 * JWT service error types
 */
export type JwtError =
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_MALFORMED'
  | 'TOKEN_REVOKED'
  | 'TOKEN_NOT_FOUND'
  | 'INVALID_TOKEN_TYPE'
  | 'TOKEN_FAMILY_REVOKED'
  | 'SIGNATURE_INVALID'
  | 'ISSUER_MISMATCH'
  | 'AUDIENCE_MISMATCH'
  | 'TOKEN_NOT_ACTIVE'
  | 'MISSING_CLAIMS';

/**
 * JWT operation result
 */
export interface JwtOperationResult<T = unknown> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data if successful */
  data?: T | undefined;
  /** Error type if failed */
  error?: JwtError | undefined;
  /** Error message if failed */
  message?: string | undefined;
}

/**
 * Token blacklist entry
 */
export interface TokenBlacklistEntry {
  /** Token ID (jti) */
  tokenId: string;
  /** Token type */
  type: 'access' | 'refresh';
  /** User ID */
  userId: string;
  /** Expiry timestamp */
  expiresAt: Date;
  /** Reason for blacklisting */
  reason?: string | undefined;
  /** Created timestamp */
  createdAt: Date;
}