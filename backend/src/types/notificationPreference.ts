/**
 * Notification Preference types for Group Planner API
 *
 * This module defines types for user notification preferences including
 * per-trip toggles and digest frequency settings.
 */

import type { DigestFrequency } from '../generated/prisma/index.js';

/**
 * Notification preference settings
 */
export interface NotificationPreference {
  id: string;
  userId: string;
  tripId?: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  scheduleChanges: boolean;
  itemUpdates: boolean;
  announcements: boolean;
  digestFrequency: DigestFrequency;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database notification preference record
 */
export interface DatabaseNotificationPreference {
  id: string;
  userId: string;
  tripId: string | null;
  emailEnabled: boolean;
  pushEnabled: boolean;
  scheduleChanges: boolean;
  itemUpdates: boolean;
  announcements: boolean;
  digestFrequency: DigestFrequency;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to get notification preferences
 */
export interface GetPreferencesRequest {
  userId: string;
  tripId?: string;
}

/**
 * Request to update notification preferences
 */
export interface UpdatePreferencesRequest {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  scheduleChanges?: boolean;
  itemUpdates?: boolean;
  announcements?: boolean;
  digestFrequency?: DigestFrequency;
}

/**
 * Response for preference operations
 */
export interface PreferenceResponse {
  success: boolean;
  preference: NotificationPreference;
}

/**
 * Response for getting all user preferences
 */
export interface UserPreferencesResponse {
  global: NotificationPreference;
  tripPreferences: NotificationPreference[];
}

/**
 * Service result type
 */
export type NotificationPreferenceServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: NotificationPreferenceError };

/**
 * Error types for notification preferences
 */
export interface NotificationPreferenceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Digest frequency type (re-export for convenience)
 */
export { DigestFrequency } from '../generated/prisma/index.js';
