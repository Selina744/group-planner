/**
 * Announcement types and interfaces for Group Planner API
 *
 * This module defines all types related to trip announcements including
 * create, update, list operations, and database representations.
 */

/**
 * Announcement creation request
 */
export interface CreateAnnouncementRequest {
  tripId: string;
  title: string;
  body: string;
  pinned?: boolean;
}

/**
 * Announcement update request
 */
export interface UpdateAnnouncementRequest {
  title?: string;
  body?: string;
}

/**
 * Announcement author info (safe for client)
 */
export interface AnnouncementAuthor {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
}

/**
 * Complete announcement information (API response)
 */
export interface Announcement {
  id: string;
  tripId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  author: AnnouncementAuthor;
}

/**
 * Pagination information for list responses
 */
export interface AnnouncementPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Announcement list query parameters
 */
export interface AnnouncementListQuery {
  tripId: string;
  page?: number;
  limit?: number;
  pinnedOnly?: boolean;
}

/**
 * Announcement list response
 */
export interface AnnouncementListResponse {
  announcements: Announcement[];
  pagination: AnnouncementPagination;
}

/**
 * Create announcement response
 */
export interface CreateAnnouncementResponse {
  announcement: Announcement;
}

/**
 * Pin/unpin announcement response
 */
export interface PinAnnouncementResponse {
  announcement: Announcement;
  pinnedCount: number;
}

/**
 * Database announcement type (from Prisma)
 */
export interface DatabaseAnnouncement {
  id: string;
  tripId: string;
  authorId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Database announcement with relations
 */
export interface DatabaseAnnouncementWithRelations extends DatabaseAnnouncement {
  author: {
    id: string;
    email: string;
    username?: string | null;
    displayName?: string | null;
  };
}

/**
 * Announcement service error types
 */
export type AnnouncementError =
  | 'ANNOUNCEMENT_NOT_FOUND'
  | 'TRIP_NOT_FOUND'
  | 'NOT_A_MEMBER'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INVALID_ANNOUNCEMENT_DATA'
  | 'MAX_PINNED_EXCEEDED';

/**
 * Announcement service method return type
 */
export interface AnnouncementServiceResult<T> {
  success: boolean;
  data?: T;
  error?: AnnouncementError;
  message?: string;
}

/**
 * Socket event payload for announcement creation
 */
export interface AnnouncementCreatedEvent {
  type: 'ANNOUNCEMENT_CREATED';
  tripId: string;
  announcement: Announcement;
}

/**
 * Socket event payload for announcement updates
 */
export interface AnnouncementUpdatedEvent {
  type: 'ANNOUNCEMENT_UPDATED';
  tripId: string;
  announcement: Announcement;
}

/**
 * Socket event payload for announcement deletion
 */
export interface AnnouncementDeletedEvent {
  type: 'ANNOUNCEMENT_DELETED';
  tripId: string;
  announcementId: string;
}

/**
 * Socket event payload for announcement pin/unpin
 */
export interface AnnouncementPinnedEvent {
  type: 'ANNOUNCEMENT_PINNED' | 'ANNOUNCEMENT_UNPINNED';
  tripId: string;
  announcement: Announcement;
}

/**
 * Maximum number of pinned announcements per trip
 */
export const MAX_PINNED_ANNOUNCEMENTS = 3;
