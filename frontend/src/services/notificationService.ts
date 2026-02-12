/**
 * Notification service for handling notification API operations
 * Uses the configured API client with JWT interceptor
 */

import { apiClient } from '../api/client';
import type { Notification, NotificationType } from '../stores/notificationStore';

// API response types
export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  persistent?: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationsListResponse {
  notifications: NotificationResponse[];
  total: number;
  unreadCount: number;
}

export interface NotificationFilters {
  unread?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export interface MarkReadResponse {
  success: boolean;
  notificationId: string;
}

export interface MarkAllReadResponse {
  success: boolean;
  count: number;
}

export interface UnreadCountResponse {
  count: number;
}

export class NotificationService {
  /**
   * Get list of notifications for the current user
   */
  static async getNotifications(filters?: NotificationFilters): Promise<NotificationsListResponse> {
    try {
      const params = new URLSearchParams();

      if (filters?.unread !== undefined) {
        params.append('unread', String(filters.unread));
      }
      if (filters?.type) {
        params.append('type', filters.type);
      }
      if (filters?.limit !== undefined) {
        params.append('limit', String(filters.limit));
      }
      if (filters?.offset !== undefined) {
        params.append('offset', String(filters.offset));
      }

      const queryString = params.toString();
      const url = queryString ? `/notifications?${queryString}` : '/notifications';

      const response = await apiClient.get<NotificationsListResponse>(url);
      return response;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
      return response.count;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      throw error;
    }
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string): Promise<MarkReadResponse> {
    try {
      const response = await apiClient.patch<MarkReadResponse>(
        `/notifications/${encodeURIComponent(notificationId)}/read`
      );
      return response;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark a single notification as unread
   */
  static async markAsUnread(notificationId: string): Promise<MarkReadResponse> {
    try {
      const response = await apiClient.patch<MarkReadResponse>(
        `/notifications/${encodeURIComponent(notificationId)}/unread`
      );
      return response;
    } catch (error) {
      console.error('Failed to mark notification as unread:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<MarkAllReadResponse> {
    try {
      const response = await apiClient.patch<MarkAllReadResponse>('/notifications/mark-all-read');
      return response;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${encodeURIComponent(notificationId)}`);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications
   */
  static async deleteReadNotifications(): Promise<{ count: number }> {
    try {
      const response = await apiClient.delete<{ count: number }>('/notifications/read');
      return response;
    } catch (error) {
      console.error('Failed to delete read notifications:', error);
      throw error;
    }
  }

  /**
   * Transform API notification to store notification format
   * Handles optional properties correctly to satisfy exactOptionalPropertyTypes
   */
  static toStoreNotification(apiNotification: NotificationResponse): Notification {
    const notification: Notification = {
      id: apiNotification.id,
      type: apiNotification.type,
      title: apiNotification.title,
      message: apiNotification.message,
      read: apiNotification.read,
      createdAt: apiNotification.createdAt,
    };

    // Only add optional properties if they are defined
    if (apiNotification.persistent !== undefined) {
      notification.persistent = apiNotification.persistent;
    }
    if (apiNotification.actionUrl !== undefined) {
      notification.actionUrl = apiNotification.actionUrl;
    }
    if (apiNotification.metadata !== undefined) {
      notification.metadata = apiNotification.metadata as Record<string, any>;
    }
    if (apiNotification.expiresAt !== undefined) {
      notification.expiresAt = apiNotification.expiresAt;
    }

    return notification;
  }
}
