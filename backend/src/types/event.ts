/**
 * Event types and interfaces for Group Planner API
 *
 * This module defines all types related to event management, proposal/approval workflow,
 * and event operations throughout the application.
 */

/**
 * Event status enum matching database
 */
export type EventStatus = 'PROPOSED' | 'APPROVED' | 'CANCELLED';

/**
 * Event category types (flexible string for extensibility)
 */
export type EventCategory =
  | 'ACCOMMODATION'
  | 'TRANSPORTATION'
  | 'ACTIVITY'
  | 'DINING'
  | 'MEETING'
  | 'OTHER';

/**
 * Event location data structure (JSON field)
 */
export interface EventLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  placeId?: string; // Google Places ID
  venue?: string;   // Venue name
}

/**
 * Event creation request
 */
export interface CreateEventRequest {
  tripId: string;
  title: string;
  description?: string;
  location?: EventLocation;
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  isAllDay?: boolean;
  category?: EventCategory;
  estimatedCost?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Event update request
 */
export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: EventLocation;
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  isAllDay?: boolean;
  category?: EventCategory;
  estimatedCost?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Event approval request
 */
export interface ApprovalRequest {
  status: 'APPROVED' | 'CANCELLED';
  reason?: string; // Optional reason for cancellation
}

/**
 * Event list filters
 */
export interface EventListFilters {
  tripId?: string;
  status?: EventStatus[];
  category?: EventCategory[];
  startTimeAfter?: string; // ISO string
  startTimeBefore?: string; // ISO string
  suggestedBy?: string; // User ID
  search?: string; // Search in title/description
}

/**
 * Event list query parameters
 */
export interface EventListQuery extends EventListFilters {
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'startTime' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Event participant information
 */
export interface EventParticipant {
  userId: string;
  eventId: string;
  status: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE'; // Future feature
  createdAt: string; // ISO string
  user: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
}

/**
 * Complete event information
 */
export interface Event {
  id: string;
  tripId: string;
  title: string;
  description?: string;
  location?: EventLocation;
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  isAllDay: boolean;
  status: EventStatus;
  category?: EventCategory;
  estimatedCost?: number;
  currency: string;
  metadata: Record<string, unknown>;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  // User information
  suggestedBy: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
  approvedBy?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
  // Future feature - participants
  participants?: EventParticipant[];
}

/**
 * Event list response
 */
export interface EventListResponse {
  events: Event[];
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
 * Event creation result
 */
export interface CreateEventResponse {
  event: Event;
}

/**
 * Database event type (from Prisma, including sensitive fields)
 */
export interface DatabaseEvent {
  id: string;
  tripId: string;
  title: string;
  description?: string;
  location?: Record<string, unknown>;
  startTime?: Date;
  endTime?: Date;
  isAllDay: boolean;
  status: EventStatus;
  category?: string;
  estimatedCost?: any; // Prisma Decimal
  currency: string;
  suggestedById: string;
  approvedById?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database event with relations (from Prisma)
 */
export interface DatabaseEventWithRelations extends DatabaseEvent {
  trip?: {
    id: string;
    title: string;
  };
  suggestedBy?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
  approvedBy?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
}

/**
 * Event service error types
 */
export type EventError =
  | 'EVENT_NOT_FOUND'
  | 'TRIP_NOT_FOUND'
  | 'NOT_A_MEMBER'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INVALID_EVENT_DATA'
  | 'INVALID_TIME_RANGE'
  | 'EVENT_CONFLICT'
  | 'ALREADY_APPROVED'
  | 'CANNOT_MODIFY_APPROVED'
  | 'INVALID_STATUS_TRANSITION';

/**
 * Event service method return type
 */
export interface EventServiceResult<T> {
  success: boolean;
  data?: T;
  error?: EventError;
  message?: string;
}

/**
 * Event conflict information
 */
export interface EventConflict {
  conflictingEventId: string;
  conflictingEventTitle: string;
  overlapStart: string; // ISO string
  overlapEnd: string; // ISO string
  severity: 'MINOR' | 'MAJOR' | 'COMPLETE';
}

/**
 * Event validation result
 */
export interface EventValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: EventConflict[];
}