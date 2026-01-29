/**
 * Controllers module exports for Group Planner API
 *
 * This module provides centralized exports for all controller classes
 * and controller-related utilities.
 */

// Auth controller exports
export { AuthController } from './auth.js';

// Health controller exports
export { HealthController } from './health.js';

// Re-export types for convenience
export type {
  AuthenticatedRequest,
  MiddlewareFunction,
} from '../types/middleware.js';

export type {
  RegisterRequest,
  LoginRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfile,
} from '../types/auth.js';

export type {
  TokenRefreshRequest,
  RefreshTokenRecord,
} from '../types/jwt.js';