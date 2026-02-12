/**
 * Notification types and interfaces for Group Planner API
 *
 * This module defines all types related to notifications, inbox management,
 * and notification filtering throughout the application.
 */

/**
 * Notification type enum - defines all possible notification types
 */
export type NotificationType =
  | 'trip_invite'
  | 'trip_update'
  | 'trip_cancelled'
  | 'event_update'
  | 'event_cancelled'
  | 'event_approved'
  | 'item_claim'
  | 'item_unclaim'
  | 'item_brought'
  | 'member_joined'
  | 'member_left'
  | 'announcement'
  | 'reminder'
  | 'system';

/**
 * Notification importance levels
 */
export type NotificationImportance = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Notification creation input
 */
export interface NotificationCreateInput {
  userId: string;
  tripId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}

/**
 * Inbox query filters
 */
export interface InboxFilters {
  type?: NotificationType[];
  tripId?: string;
  read?: boolean;
  search?: string;
}

/**
 * Inbox query parameters with pagination
 */
export interface InboxQuery extends InboxFilters {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'type' | 'read';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Complete notification information for API responses
 */
export interface Notification {
  id: string;
  userId: string;
  tripId?: string;
  type: string;
  title: string;
  body?: string;
  payload: Record<string, unknown>;
  read: boolean;
  readAt?: string; // ISO string
  createdAt: string; // ISO string
}

/**
 * Notification summary for lists
 */
export interface NotificationSummary {
  id: string;
  type: string;
  title: string;
  body?: string;
  tripId?: string;
  read: boolean;
  createdAt: string; // ISO string
}

/**
 * Inbox response with pagination
 */
export interface InboxResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  unreadCount: number;
}

/**
 * Mark as read response
 */
export interface MarkReadResponse {
  success: boolean;
  notification?: Notification;
}

/**
 * Mark all as read response
 */
export interface MarkAllReadResponse {
  success: boolean;
  count: number;
}

/**
 * Database notification type (from Prisma)
 */
export interface DatabaseNotification {
  id: string;
  userId: string;
  tripId: string | null;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Database notification with relations
 */
export interface DatabaseNotificationWithRelations extends DatabaseNotification {
  user?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
  trip?: {
    id: string;
    title: string;
  } | null;
}

/**
 * Notification service error types
 */
export type NotificationError =
  | 'NOTIFICATION_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'INVALID_NOTIFICATION_DATA'
  | 'UNAUTHORIZED_ACCESS';

/**
 * Notification service method return type
 */
export interface NotificationServiceResult<T> {
  success: boolean;
  data?: T;
  error?: NotificationError;
  message?: string;
}

/**
 * Notification statistics for a user
 */
export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

/**
 * Notification validation result
 */
export interface NotificationValidation {
  valid: boolean;
  errors: string[];
}
