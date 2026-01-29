/**
 * Trip types and interfaces for Group Planner API
 *
 * This module defines all types related to trip management, member roles,
 * and trip operations throughout the application.
 */

/**
 * Trip status enum matching database
 */
export type TripStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

/**
 * Member role enum matching database
 */
export type MemberRole = 'HOST' | 'CO_HOST' | 'MEMBER';

/**
 * Member status enum matching database
 */
export type MemberStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

/**
 * Trip location data structure (JSON field)
 */
export interface TripLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  placeId?: string; // Google Places ID
}

/**
 * Trip creation request
 */
export interface CreateTripRequest {
  title: string;
  description?: string;
  location?: TripLocation;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  metadata?: Record<string, unknown>;
}

/**
 * Trip update request
 */
export interface UpdateTripRequest {
  title?: string;
  description?: string;
  status?: TripStatus;
  location?: TripLocation;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  metadata?: Record<string, unknown>;
}

/**
 * Trip list filters
 */
export interface TripListFilters {
  status?: TripStatus[];
  role?: MemberRole[];
  startDateAfter?: string; // ISO string
  startDateBefore?: string; // ISO string
  search?: string; // Search in title/description
}

/**
 * Trip list query parameters
 */
export interface TripListQuery extends TripListFilters {
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'startDate' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Trip member information
 */
export interface TripMember {
  tripId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  notifications: boolean;
  canInvite: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string;
  user: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
}

/**
 * Complete trip information
 */
export interface Trip {
  id: string;
  title: string;
  description?: string;
  status: TripStatus;
  location?: TripLocation;
  inviteCode: string;
  metadata: Record<string, unknown>;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  // Member summary
  memberCount: number;
  members?: TripMember[];
  // User's membership in this trip (when viewing as authenticated user)
  userMembership?: {
    role: MemberRole;
    status: MemberStatus;
    canInvite: boolean;
  };
}

/**
 * Trip list response
 */
export interface TripListResponse {
  trips: Trip[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Trip creation result
 */
export interface CreateTripResponse {
  trip: Trip;
  membership: TripMember;
}

/**
 * Database trip type (from Prisma, including sensitive fields)
 */
export interface DatabaseTrip {
  id: string;
  title: string;
  description?: string;
  status: TripStatus;
  location?: Record<string, unknown>;
  inviteCode: string;
  metadata: Record<string, unknown>;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database trip member type (from Prisma)
 */
export interface DatabaseTripMember {
  tripId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  notifications: boolean;
  canInvite: boolean;
  createdAt: Date;
  updatedAt: Date;
  trip?: DatabaseTrip;
  user?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
}

/**
 * Trip service error types
 */
export type TripError =
  | 'TRIP_NOT_FOUND'
  | 'NOT_A_MEMBER'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INVALID_TRIP_DATA'
  | 'INVITE_CODE_CONFLICT'
  | 'MEMBER_ALREADY_EXISTS'
  | 'INVALID_DATE_RANGE';

/**
 * Trip service method return type
 */
export interface TripServiceResult<T> {
  success: boolean;
  data?: T;
  error?: TripError;
  message?: string;
}