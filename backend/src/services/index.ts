/**
 * Services module exports for Group Planner API
 *
 * This module provides centralized exports for all service layer components
 * including authentication, user management, and business logic services.
 */

// Auth service exports
export {
  AuthService,
  PasswordUtils,
  UserValidation,
  UserTransforms,
  AUTH_CONFIG,
} from './auth.js';

// JWT service exports
export {
  JwtService,
} from './jwt.js';

export {
  NotificationService,
} from './notification.js';

// Health service exports
export {
  HealthService,
} from './health.js';

// Re-export auth types for convenience
export type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
  TokenPair,
  PasswordRequirements,
  PasswordValidation,
  AuthenticationContext,
  AuthContext,
  UnauthenticatedContext,
  ChangePasswordRequest,
  UpdateProfileRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  AuthConfig,
  DatabaseUser,
} from '../types/auth.js';

// Re-export JWT types for convenience
export type {
  JwtConfig,
  BaseJwtPayload,
  AccessTokenPayload,
  RefreshTokenPayload,
  JwtTokenPair,
  TokenVerificationResult,
  TokenGenerationOptions,
  RefreshTokenRecord,
  TokenRefreshRequest,
  TokenRefreshResponse,
  TokenRevocationOptions,
  TokenValidationContext,
  JwtError,
  JwtOperationResult,
} from '../types/jwt.js';
