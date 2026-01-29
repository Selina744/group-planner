/**
 * Authentication types and interfaces for Group Planner API
 *
 * This module defines all types related to authentication, user management,
 * and session handling throughout the application.
 */

/**
 * User registration input data
 */
export interface RegisterRequest {
  email: string;
  username?: string | undefined;
  password: string;
  displayName?: string | undefined;
  timezone?: string | undefined;
}

/**
 * User login input data
 */
export interface LoginRequest {
  identifier: string; // Can be email or username
  password: string;
}

/**
 * User registration result
 */
export interface RegisterResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

/**
 * User login result
 */
export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

/**
 * Public user profile (safe for client consumption)
 */
export interface UserProfile {
  id: string;
  email: string;
  username?: string | undefined;
  displayName?: string | undefined;
  timezone: string;
  emailVerified: boolean;
  preferences: Record<string, unknown>;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * JWT token pair
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT payload for access tokens
 */
export interface AccessTokenPayload {
  sub: string; // user ID
  email: string;
  username?: string | undefined;
  type: 'access';
  iat: number;
  exp: number;
}

/**
 * JWT payload for refresh tokens
 */
export interface RefreshTokenPayload {
  sub: string; // user ID
  tokenId: string; // refresh token ID in database
  type: 'refresh';
  iat: number;
  exp: number;
}

/**
 * Password validation requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Password validation result
 */
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * User authentication context (for middleware)
 */
export interface AuthContext {
  user: UserProfile;
  isAuthenticated: true;
}

/**
 * Unauthenticated context
 */
export interface UnauthenticatedContext {
  user: null;
  isAuthenticated: false;
}

/**
 * Combined authentication context
 */
export type AuthenticationContext = AuthContext | UnauthenticatedContext;

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Email verification request
 */
export interface EmailVerificationRequest {
  token: string;
}

/**
 * Session information
 */
export interface SessionInfo {
  userId: string;
  email: string;
  username?: string | undefined;
  createdAt: Date;
  expiresAt: Date;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

/**
 * Auth service configuration
 */
export interface AuthConfig {
  bcryptRounds: number;
  accessTokenExpiryMinutes: number;
  refreshTokenExpiryDays: number;
  passwordRequirements: PasswordRequirements;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

/**
 * Login attempt tracking
 */
export interface LoginAttempt {
  identifier: string; // email or username
  ipAddress: string;
  userAgent?: string | undefined;
  success: boolean;
  timestamp: Date;
}

/**
 * Account lockout information
 */
export interface AccountLockout {
  userId: string;
  lockedUntil: Date;
  attempts: number;
  lastAttempt: Date;
}

/**
 * Password change request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * User preferences update
 */
export interface UpdatePreferencesRequest {
  preferences: Record<string, unknown>;
}

/**
 * Profile update request
 */
export interface UpdateProfileRequest {
  displayName?: string | undefined;
  timezone?: string | undefined;
  username?: string | undefined;
  preferences?: Record<string, unknown> | undefined;
}

/**
 * Auth service error types
 */
export type AuthError =
  | 'USER_NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'USERNAME_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'ACCOUNT_LOCKED'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_EMAIL_FORMAT'
  | 'INVALID_USERNAME_FORMAT';

/**
 * Auth service method return type
 */
export interface AuthServiceResult<T> {
  success: boolean;
  data?: T | undefined;
  error?: AuthError | undefined;
  message?: string | undefined;
}

/**
 * Database user type (from Prisma, including sensitive fields)
 */
export interface DatabaseUser {
  id: string;
  email: string;
  username?: string | undefined;
  passwordHash: string;
  displayName?: string | undefined;
  timezone: string;
  emailVerified: boolean;
  preferences: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}