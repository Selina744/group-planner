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

// Notification Preference service exports
export {
  NotificationPreferenceService,
} from './notificationPreference.js';

// Trip service exports
export {
  TripService,
} from './trip.js';


// Event service exports
export {
  EventService,
} from './event.js';

// Item service exports
export {
  ItemService,
} from './item.js';

// Health service exports
export {
  HealthService,
} from './health.js';

// Email service exports
export {
  EmailService,
} from './email.js';

// Announcement service exports
export {
  AnnouncementService,
} from './announcement.js';

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

// Re-export Item types for convenience
export type {
  Item,
  ItemSummary,
  ItemClaim,
  CreateItemRequest,
  UpdateItemRequest,
  ClaimItemRequest,
  UpdateClaimRequest,
  ItemListFilters,
  ItemListQuery,
  ItemListResponse,
  CreateItemResponse,
  CreateClaimResponse,
  ItemType,
  ItemCategory,
  ClaimStatus,
  DatabaseItem,
  DatabaseItemWithRelations,
  DatabaseItemClaim,
  DatabaseItemClaimWithRelations,
  ItemError,
  ItemServiceResult,
  TripItemStats,
  UserClaimStats,
  ItemValidation,
} from '../types/item.js';

// Re-export Announcement types for convenience
export type {
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  AnnouncementListQuery,
  AnnouncementListResponse,
  AnnouncementPagination,
  CreateAnnouncementResponse,
  PinAnnouncementResponse,
  AnnouncementAuthor,
  DatabaseAnnouncement,
  DatabaseAnnouncementWithRelations,
  AnnouncementError,
  AnnouncementServiceResult,
  AnnouncementCreatedEvent,
  AnnouncementUpdatedEvent,
  AnnouncementDeletedEvent,
  AnnouncementPinnedEvent,
} from '../types/announcement.js';

export { MAX_PINNED_ANNOUNCEMENTS } from '../types/announcement.js';

// Re-export Notification types for convenience
export type {
  NotificationType,
  NotificationImportance,
  NotificationCreateInput,
  InboxFilters,
  InboxQuery,
  Notification,
  NotificationSummary,
  InboxResponse,
  MarkReadResponse,
  MarkAllReadResponse,
  DatabaseNotification,
  DatabaseNotificationWithRelations,
  NotificationError,
  NotificationServiceResult,
  NotificationStats,
  NotificationValidation,
} from '../types/notification.js';

// Re-export Notification Preference types for convenience
export type {
  NotificationPreference,
  DatabaseNotificationPreference,
  GetPreferencesRequest,
  UpdatePreferencesRequest,
  PreferenceResponse,
  UserPreferencesResponse,
  NotificationPreferenceServiceResult,
  NotificationPreferenceError,
} from '../types/notificationPreference.js';
export { DigestFrequency } from '../types/notificationPreference.js';
