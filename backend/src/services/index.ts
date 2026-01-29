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

// Trip service exports
export {
  TripService,
} from './trip.js';

// Event service exports
export {
  EventService,
} from './event.js';

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

// Re-export Trip types for convenience
export type {
  Trip,
  TripMember,
  CreateTripRequest,
  UpdateTripRequest,
  TripListQuery,
  TripListResponse,
  CreateTripResponse,
  TripLocation,
  TripStatus,
  MemberRole,
  MemberStatus,
  TripListFilters,
  DatabaseTrip,
  DatabaseTripMember,
  TripError,
  TripServiceResult,
} from '../types/trip.js';

// Re-export Event types for convenience
export type {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  ApprovalRequest,
  EventListQuery,
  EventListResponse,
  CreateEventResponse,
  EventLocation,
  EventStatus,
  EventCategory,
  EventParticipant,
  DatabaseEvent,
  DatabaseEventWithRelations,
  EventError,
  EventServiceResult,
  EventConflict,
  EventValidation,
} from '../types/event.js';
