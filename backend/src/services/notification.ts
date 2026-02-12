/**
 * Notification service for Group Planner API
 *
 * This service provides complete notification inbox management including
 * fetching notifications with pagination, filtering by type and read status,
 * and marking notifications as read (individual and bulk).
 */

import { prisma, safePrismaOperation } from '../lib/prisma.js';
import { log } from '../utils/logger.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import type {
  NotificationCreateInput,
  InboxQuery,
  InboxResponse,
  Notification,
  MarkReadResponse,
  MarkAllReadResponse,
  DatabaseNotification,
  NotificationStats,
} from '../types/notification.js';

/**
 * Notification transforms for converting database objects to API responses
 */
class NotificationTransforms {
  /**
   * Convert database notification to API response
   */
  static toNotification(dbNotification: DatabaseNotification): Notification {
    return {
      id: dbNotification.id,
      userId: dbNotification.userId,
      ...(dbNotification.tripId && { tripId: dbNotification.tripId }),
      type: dbNotification.type,
      title: dbNotification.title,
      ...(dbNotification.body && { body: dbNotification.body }),
      payload: dbNotification.payload as Record<string, unknown>,
      read: dbNotification.read,
      ...(dbNotification.readAt && { readAt: dbNotification.readAt.toISOString() }),
      createdAt: dbNotification.createdAt.toISOString(),
    };
  }
}

/**
 * Notification service class
 */
export class NotificationService {
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 100;

  /**
   * Get inbox notifications for a user with pagination and filtering
   */
  static async getInbox(userId: string, query: InboxQuery = {}): Promise<InboxResponse> {
    const {
      page = 1,
      limit = this.DEFAULT_LIMIT,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      type,
      tripId,
      read,
      search,
    } = query;

    // Validate and sanitize pagination
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), this.MAX_LIMIT);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Record<string, unknown> = { userId };

    // Filter by notification type(s)
    if (type && type.length > 0) {
      where.type = { in: type };
    }

    // Filter by trip
    if (tripId) {
      where.tripId = tripId;
    }

    // Filter by read status
    if (read !== undefined) {
      where.read = read;
    }

    // Search in title and body
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { body: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Build order by clause
    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    log.debug('Fetching inbox', { userId, pageNum, limitNum, filters: { type, tripId, read, search } });

    try {
      // Execute queries in parallel for better performance
      const [notifications, totalCount, unreadCount] = await Promise.all([
        safePrismaOperation(async () => {
          return prisma.notification.findMany({
            where,
            orderBy,
            skip: offset,
            take: limitNum,
          });
        }, 'Fetch inbox notifications'),

        safePrismaOperation(async () => {
          return prisma.notification.count({ where });
        }, 'Count inbox notifications'),

        safePrismaOperation(async () => {
          return prisma.notification.count({
            where: { userId, read: false },
          });
        }, 'Count unread notifications'),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      log.debug('Inbox fetched successfully', {
        userId,
        total: totalCount,
        unread: unreadCount,
        page: pageNum,
      });

      return {
        notifications: notifications.map((n) =>
          NotificationTransforms.toNotification(n as DatabaseNotification)
        ),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
        unreadCount,
      };
    } catch (error) {
      log.error('Failed to fetch inbox', error, { userId, query });
      throw new Error('Failed to retrieve notifications');
    }
  }

  /**
   * Create a new notification
   */
  static async createNotification(input: NotificationCreateInput): Promise<Notification> {
    // Validate required fields
    if (!input.userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!input.type) {
      throw new BadRequestError('Notification type is required');
    }

    if (!input.title || input.title.trim().length === 0) {
      throw new BadRequestError('Notification title is required');
    }

    const record = {
      userId: input.userId,
      tripId: input.tripId ?? null,
      type: input.type,
      title: input.title.trim(),
      body: input.body?.trim() ?? null,
      payload: (input.payload ?? {}) as object,
      read: false,
      readAt: null,
    };

    log.info('Creating notification', {
      userId: input.userId,
      tripId: input.tripId,
      type: input.type,
    });

    try {
      const notification = await safePrismaOperation(async () => {
        return prisma.notification.create({
          data: record,
        });
      }, 'Create notification');

      return NotificationTransforms.toNotification(notification as DatabaseNotification);
    } catch (error) {
      log.error('Failed to create notification', error, { input });
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(userId: string, notificationId: string): Promise<MarkReadResponse> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!notificationId) {
      throw new BadRequestError('Notification ID is required');
    }

    log.debug('Marking notification as read', { userId, notificationId });

    try {
      // First verify the notification exists and belongs to the user
      const existing = await safePrismaOperation(async () => {
        return prisma.notification.findFirst({
          where: { id: notificationId, userId },
        });
      }, 'Find notification');

      if (!existing) {
        throw new NotFoundError('Notification not found');
      }

      // If already read, return current state
      if (existing.read) {
        return {
          success: true,
          notification: NotificationTransforms.toNotification(existing as DatabaseNotification),
        };
      }

      // Update to read
      const now = new Date();
      const updated = await safePrismaOperation(async () => {
        return prisma.notification.update({
          where: { id: notificationId },
          data: { read: true, readAt: now },
        });
      }, 'Mark notification as read');

      log.info('Notification marked as read', { userId, notificationId });

      return {
        success: true,
        notification: NotificationTransforms.toNotification(updated as DatabaseNotification),
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to mark notification as read', error, { userId, notificationId });
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user (optionally filtered by trip)
   */
  static async markAllAsRead(userId: string, tripId?: string): Promise<MarkAllReadResponse> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const where: Record<string, unknown> = { userId, read: false };

    if (tripId) {
      where.tripId = tripId;
    }

    log.debug('Marking all notifications as read', { userId, tripId });

    try {
      const result = await safePrismaOperation(async () => {
        return prisma.notification.updateMany({
          where,
          data: { read: true, readAt: new Date() },
        });
      }, 'Mark all notifications as read');

      log.info('All notifications marked as read', {
        userId,
        tripId,
        count: result.count,
      });

      return {
        success: true,
        count: result.count,
      };
    } catch (error) {
      log.error('Failed to mark all notifications as read', error, { userId, tripId });
      throw new Error('Failed to mark notifications as read');
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getStats(userId: string): Promise<NotificationStats> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    log.debug('Fetching notification stats', { userId });

    try {
      const [total, unread, byType] = await Promise.all([
        safePrismaOperation(async () => {
          return prisma.notification.count({ where: { userId } });
        }, 'Count total notifications'),

        safePrismaOperation(async () => {
          return prisma.notification.count({ where: { userId, read: false } });
        }, 'Count unread notifications'),

        safePrismaOperation(async () => {
          return prisma.notification.groupBy({
            by: ['type'],
            where: { userId },
            _count: { type: true },
          });
        }, 'Group notifications by type'),
      ]);

      // Convert grouped results to record
      const byTypeRecord: Record<string, number> = {};
      for (const group of byType) {
        byTypeRecord[group.type] = group._count.type;
      }

      return {
        total,
        unread,
        byType: byTypeRecord,
      };
    } catch (error) {
      log.error('Failed to get notification stats', error, { userId });
      throw new Error('Failed to retrieve notification statistics');
    }
  }

  /**
   * Delete old read notifications (housekeeping)
   */
  static async deleteOldNotifications(
    userId: string,
    olderThanDays: number = 30
  ): Promise<number> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    log.debug('Deleting old notifications', { userId, olderThanDays, cutoffDate });

    try {
      const result = await safePrismaOperation(async () => {
        return prisma.notification.deleteMany({
          where: {
            userId,
            read: true,
            createdAt: { lt: cutoffDate },
          },
        });
      }, 'Delete old notifications');

      log.info('Old notifications deleted', {
        userId,
        count: result.count,
        olderThanDays,
      });

      return result.count;
    } catch (error) {
      log.error('Failed to delete old notifications', error, { userId, olderThanDays });
      throw new Error('Failed to delete old notifications');
    }
  }

  /**
   * Get a single notification by ID
   */
  static async getById(userId: string, notificationId: string): Promise<Notification> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!notificationId) {
      throw new BadRequestError('Notification ID is required');
    }

    log.debug('Fetching notification by ID', { userId, notificationId });

    try {
      const notification = await safePrismaOperation(async () => {
        return prisma.notification.findFirst({
          where: { id: notificationId, userId },
        });
      }, 'Get notification by ID');

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      return NotificationTransforms.toNotification(notification as DatabaseNotification);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to get notification', error, { userId, notificationId });
      throw new Error('Failed to retrieve notification');
    }
  }

  // Legacy method compatibility
  static async listNotifications(
    userId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
  ) {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    const query: InboxQuery = {
      page: Math.floor(offset / limit) + 1,
      limit,
    };

    // Only set read filter if unreadOnly is true
    if (unreadOnly) {
      query.read = false;
    }

    const result = await this.getInbox(userId, query);
    return result.notifications;
  }
}
