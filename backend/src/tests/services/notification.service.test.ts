/**
 * NotificationService Tests
 *
 * Tests for the notification inbox service including:
 * - getInbox with pagination and filtering
 * - markAsRead for individual notifications
 * - markAllAsRead for bulk operations
 * - Filter by type, read status, and tripId
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { NotificationService } from '../../services/notification.js';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase, getTestDb } from '../utils/test-database.js';
import { UserFixtures, TripFixtures } from '../utils/test-fixtures.js';
import type { NotificationType } from '../../types/notification.js';

describe('NotificationService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('getInbox', () => {
    it('should return empty inbox for user with no notifications', async () => {
      const user = await UserFixtures.createUser();

      const result = await NotificationService.getInbox(user.id);

      expect(result.notifications).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.page).toBe(1);
      expect(result.unreadCount).toBe(0);
    });

    it('should return notifications for a user with pagination', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      // Create 25 notifications
      for (let i = 0; i < 25; i++) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'trip_invite',
            title: `Notification ${i + 1}`,
            body: `Body ${i + 1}`,
            payload: {},
            read: false,
          },
        });
      }

      // First page
      const page1 = await NotificationService.getInbox(user.id, { page: 1, limit: 10 });
      expect(page1.notifications.length).toBe(10);
      expect(page1.pagination.total).toBe(25);
      expect(page1.pagination.totalPages).toBe(3);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      // Second page
      const page2 = await NotificationService.getInbox(user.id, { page: 2, limit: 10 });
      expect(page2.notifications.length).toBe(10);
      expect(page2.pagination.hasNext).toBe(true);
      expect(page2.pagination.hasPrev).toBe(true);

      // Third page
      const page3 = await NotificationService.getInbox(user.id, { page: 3, limit: 10 });
      expect(page3.notifications.length).toBe(5);
      expect(page3.pagination.hasNext).toBe(false);
      expect(page3.pagination.hasPrev).toBe(true);
    });

    it('should filter notifications by type', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      // Create different types of notifications
      await prisma.notification.createMany({
        data: [
          { userId: user.id, type: 'trip_invite', title: 'Trip Invite 1', payload: {} },
          { userId: user.id, type: 'trip_invite', title: 'Trip Invite 2', payload: {} },
          { userId: user.id, type: 'event_update', title: 'Event Update 1', payload: {} },
          { userId: user.id, type: 'item_claim', title: 'Item Claim 1', payload: {} },
        ],
      });

      // Filter by single type
      const tripInvites = await NotificationService.getInbox(user.id, {
        type: ['trip_invite'] as NotificationType[],
      });
      expect(tripInvites.notifications.length).toBe(2);
      expect(tripInvites.notifications.every((n) => n.type === 'trip_invite')).toBe(true);

      // Filter by multiple types
      const multipleTypes = await NotificationService.getInbox(user.id, {
        type: ['trip_invite', 'event_update'] as NotificationType[],
      });
      expect(multipleTypes.notifications.length).toBe(3);
    });

    it('should filter notifications by read status', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      // Create read and unread notifications
      await prisma.notification.createMany({
        data: [
          { userId: user.id, type: 'trip_invite', title: 'Unread 1', payload: {}, read: false },
          { userId: user.id, type: 'trip_invite', title: 'Unread 2', payload: {}, read: false },
          { userId: user.id, type: 'trip_invite', title: 'Read 1', payload: {}, read: true, readAt: new Date() },
        ],
      });

      // Filter unread only
      const unread = await NotificationService.getInbox(user.id, { read: false });
      expect(unread.notifications.length).toBe(2);
      expect(unread.notifications.every((n) => !n.read)).toBe(true);

      // Filter read only
      const read = await NotificationService.getInbox(user.id, { read: true });
      expect(read.notifications.length).toBe(1);
      expect(read.notifications.every((n) => n.read)).toBe(true);

      // Verify unreadCount
      expect(unread.unreadCount).toBe(2);
      expect(read.unreadCount).toBe(2); // unreadCount is always the total unread
    });

    it('should filter notifications by tripId', async () => {
      const user = await UserFixtures.createUser();
      const { trip: trip1 } = await TripFixtures.createTrip(user.id);
      const { trip: trip2 } = await TripFixtures.createTrip(user.id);
      const prisma = getTestDb();

      // Create notifications for different trips
      await prisma.notification.createMany({
        data: [
          { userId: user.id, tripId: trip1.id, type: 'trip_update', title: 'Trip 1 Update', payload: {} },
          { userId: user.id, tripId: trip1.id, type: 'event_update', title: 'Trip 1 Event', payload: {} },
          { userId: user.id, tripId: trip2.id, type: 'trip_update', title: 'Trip 2 Update', payload: {} },
          { userId: user.id, type: 'system', title: 'System Notification', payload: {} },
        ],
      });

      // Filter by trip1
      const trip1Notifications = await NotificationService.getInbox(user.id, { tripId: trip1.id });
      expect(trip1Notifications.notifications.length).toBe(2);
      expect(trip1Notifications.notifications.every((n) => n.tripId === trip1.id)).toBe(true);

      // Filter by trip2
      const trip2Notifications = await NotificationService.getInbox(user.id, { tripId: trip2.id });
      expect(trip2Notifications.notifications.length).toBe(1);
    });

    it('should return notifications sorted by createdAt desc by default', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      // Create notifications with slight time differences
      const notification1 = await prisma.notification.create({
        data: { userId: user.id, type: 'trip_invite', title: 'First', payload: {} },
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const notification2 = await prisma.notification.create({
        data: { userId: user.id, type: 'trip_invite', title: 'Second', payload: {} },
      });

      const result = await NotificationService.getInbox(user.id);

      expect(result.notifications.length).toBe(2);
      // Most recent should be first (desc order)
      expect(result.notifications[0].id).toBe(notification2.id);
      expect(result.notifications[1].id).toBe(notification1.id);
    });

    it('should limit to MAX_LIMIT even if higher limit requested', async () => {
      const user = await UserFixtures.createUser();

      const result = await NotificationService.getInbox(user.id, { limit: 500 });

      // Should be capped at MAX_LIMIT (100)
      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'trip_invite',
          title: 'Test Notification',
          payload: {},
          read: false,
        },
      });

      const result = await NotificationService.markAsRead(user.id, notification.id);

      expect(result.success).toBe(true);
      expect(result.notification).toBeDefined();
      expect(result.notification!.read).toBe(true);
      expect(result.notification!.readAt).toBeDefined();

      // Verify in database
      const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
      expect(updated!.read).toBe(true);
      expect(updated!.readAt).not.toBeNull();
    });

    it('should return success for already read notification', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();
      const readAt = new Date();

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'trip_invite',
          title: 'Test Notification',
          payload: {},
          read: true,
          readAt,
        },
      });

      const result = await NotificationService.markAsRead(user.id, notification.id);

      expect(result.success).toBe(true);
      expect(result.notification!.read).toBe(true);
    });

    it('should throw NotFoundError for non-existent notification', async () => {
      const user = await UserFixtures.createUser();

      await expect(NotificationService.markAsRead(user.id, 'non-existent-id')).rejects.toThrow(
        'Notification not found'
      );
    });

    it('should throw NotFoundError when notification belongs to different user', async () => {
      const user1 = await UserFixtures.createUser();
      const user2 = await UserFixtures.createUser();
      const prisma = getTestDb();

      const notification = await prisma.notification.create({
        data: {
          userId: user1.id,
          type: 'trip_invite',
          title: 'Test Notification',
          payload: {},
        },
      });

      // User2 should not be able to mark user1's notification as read
      await expect(NotificationService.markAsRead(user2.id, notification.id)).rejects.toThrow(
        'Notification not found'
      );
    });

    it('should throw BadRequestError for empty userId', async () => {
      await expect(NotificationService.markAsRead('', 'some-id')).rejects.toThrow(
        'User ID is required'
      );
    });

    it('should throw BadRequestError for empty notificationId', async () => {
      await expect(NotificationService.markAsRead('user-id', '')).rejects.toThrow(
        'Notification ID is required'
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      // Create multiple unread notifications
      await prisma.notification.createMany({
        data: [
          { userId: user.id, type: 'trip_invite', title: 'Notification 1', payload: {}, read: false },
          { userId: user.id, type: 'trip_invite', title: 'Notification 2', payload: {}, read: false },
          { userId: user.id, type: 'trip_invite', title: 'Notification 3', payload: {}, read: true, readAt: new Date() },
        ],
      });

      const result = await NotificationService.markAllAsRead(user.id);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2); // Only 2 were unread

      // Verify all are now read
      const allNotifications = await prisma.notification.findMany({ where: { userId: user.id } });
      expect(allNotifications.every((n) => n.read)).toBe(true);
    });

    it('should mark all unread notifications for a specific trip as read', async () => {
      const user = await UserFixtures.createUser();
      const { trip } = await TripFixtures.createTrip(user.id);
      const prisma = getTestDb();

      // Create notifications for different trips
      await prisma.notification.createMany({
        data: [
          { userId: user.id, tripId: trip.id, type: 'trip_update', title: 'Trip Update 1', payload: {}, read: false },
          { userId: user.id, tripId: trip.id, type: 'trip_update', title: 'Trip Update 2', payload: {}, read: false },
          { userId: user.id, type: 'system', title: 'System Notification', payload: {}, read: false },
        ],
      });

      const result = await NotificationService.markAllAsRead(user.id, trip.id);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2); // Only trip notifications

      // Verify trip notifications are read
      const tripNotifications = await prisma.notification.findMany({
        where: { userId: user.id, tripId: trip.id },
      });
      expect(tripNotifications.every((n) => n.read)).toBe(true);

      // Verify system notification is still unread
      const systemNotifications = await prisma.notification.findMany({
        where: { userId: user.id, tripId: null },
      });
      expect(systemNotifications[0].read).toBe(false);
    });

    it('should return count of 0 when no unread notifications', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      // Create only read notifications
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'trip_invite',
          title: 'Read Notification',
          payload: {},
          read: true,
          readAt: new Date(),
        },
      });

      const result = await NotificationService.markAllAsRead(user.id);

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it('should throw BadRequestError for empty userId', async () => {
      await expect(NotificationService.markAllAsRead('')).rejects.toThrow('User ID is required');
    });
  });

  describe('createNotification', () => {
    it('should create a notification with all fields', async () => {
      const user = await UserFixtures.createUser();
      const { trip } = await TripFixtures.createTrip(user.id);

      const notification = await NotificationService.createNotification({
        userId: user.id,
        tripId: trip.id,
        type: 'trip_invite',
        title: 'You have been invited!',
        body: 'Join our trip to San Francisco',
        payload: { invitedBy: 'host-user-id' },
      });

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(user.id);
      expect(notification.tripId).toBe(trip.id);
      expect(notification.type).toBe('trip_invite');
      expect(notification.title).toBe('You have been invited!');
      expect(notification.body).toBe('Join our trip to San Francisco');
      expect(notification.payload).toEqual({ invitedBy: 'host-user-id' });
      expect(notification.read).toBe(false);
      expect(notification.readAt).toBeUndefined();
      expect(notification.createdAt).toBeDefined();
    });

    it('should create a notification without optional fields', async () => {
      const user = await UserFixtures.createUser();

      const notification = await NotificationService.createNotification({
        userId: user.id,
        type: 'system',
        title: 'System Update',
      });

      expect(notification.id).toBeDefined();
      expect(notification.tripId).toBeUndefined();
      expect(notification.body).toBeUndefined();
      expect(notification.payload).toEqual({});
    });

    it('should throw BadRequestError for missing userId', async () => {
      await expect(
        NotificationService.createNotification({
          userId: '',
          type: 'system',
          title: 'Test',
        })
      ).rejects.toThrow('User ID is required');
    });

    it('should throw BadRequestError for missing type', async () => {
      const user = await UserFixtures.createUser();

      await expect(
        NotificationService.createNotification({
          userId: user.id,
          type: '' as any,
          title: 'Test',
        })
      ).rejects.toThrow('Notification type is required');
    });

    it('should throw BadRequestError for missing title', async () => {
      const user = await UserFixtures.createUser();

      await expect(
        NotificationService.createNotification({
          userId: user.id,
          type: 'system',
          title: '',
        })
      ).rejects.toThrow('Notification title is required');
    });
  });

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      await prisma.notification.createMany({
        data: [
          { userId: user.id, type: 'trip_invite', title: 'Invite 1', payload: {}, read: false },
          { userId: user.id, type: 'trip_invite', title: 'Invite 2', payload: {}, read: true, readAt: new Date() },
          { userId: user.id, type: 'event_update', title: 'Event 1', payload: {}, read: false },
          { userId: user.id, type: 'item_claim', title: 'Claim 1', payload: {}, read: false },
        ],
      });

      const stats = await NotificationService.getStats(user.id);

      expect(stats.total).toBe(4);
      expect(stats.unread).toBe(3);
      expect(stats.byType['trip_invite']).toBe(2);
      expect(stats.byType['event_update']).toBe(1);
      expect(stats.byType['item_claim']).toBe(1);
    });

    it('should return empty stats for user with no notifications', async () => {
      const user = await UserFixtures.createUser();

      const stats = await NotificationService.getStats(user.id);

      expect(stats.total).toBe(0);
      expect(stats.unread).toBe(0);
      expect(stats.byType).toEqual({});
    });
  });

  describe('getById', () => {
    it('should return a notification by ID', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      const created = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'trip_invite',
          title: 'Test Notification',
          body: 'Test Body',
          payload: { key: 'value' },
        },
      });

      const notification = await NotificationService.getById(user.id, created.id);

      expect(notification.id).toBe(created.id);
      expect(notification.title).toBe('Test Notification');
      expect(notification.body).toBe('Test Body');
    });

    it('should throw NotFoundError for non-existent notification', async () => {
      const user = await UserFixtures.createUser();

      await expect(NotificationService.getById(user.id, 'non-existent')).rejects.toThrow(
        'Notification not found'
      );
    });

    it('should throw NotFoundError when notification belongs to different user', async () => {
      const user1 = await UserFixtures.createUser();
      const user2 = await UserFixtures.createUser();
      const prisma = getTestDb();

      const notification = await prisma.notification.create({
        data: {
          userId: user1.id,
          type: 'trip_invite',
          title: 'Test',
          payload: {},
        },
      });

      await expect(NotificationService.getById(user2.id, notification.id)).rejects.toThrow(
        'Notification not found'
      );
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete old read notifications', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      // Create old read notification
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'trip_invite',
          title: 'Old Read',
          payload: {},
          read: true,
          readAt: oldDate,
          createdAt: oldDate,
        },
      });

      // Create recent read notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'trip_invite',
          title: 'Recent Read',
          payload: {},
          read: true,
          readAt: new Date(),
        },
      });

      // Create old unread notification (should not be deleted)
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'trip_invite',
          title: 'Old Unread',
          payload: {},
          read: false,
          createdAt: oldDate,
        },
      });

      const deletedCount = await NotificationService.deleteOldNotifications(user.id, 30);

      expect(deletedCount).toBe(1);

      // Verify remaining notifications
      const remaining = await prisma.notification.findMany({ where: { userId: user.id } });
      expect(remaining.length).toBe(2);
      expect(remaining.some((n) => n.title === 'Recent Read')).toBe(true);
      expect(remaining.some((n) => n.title === 'Old Unread')).toBe(true);
    });
  });

  describe('listNotifications (legacy)', () => {
    it('should work with legacy interface', async () => {
      const user = await UserFixtures.createUser();
      const prisma = getTestDb();

      await prisma.notification.createMany({
        data: [
          { userId: user.id, type: 'trip_invite', title: 'Notification 1', payload: {}, read: false },
          { userId: user.id, type: 'trip_invite', title: 'Notification 2', payload: {}, read: true, readAt: new Date() },
        ],
      });

      // Test basic call
      const all = await NotificationService.listNotifications(user.id);
      expect(all.length).toBe(2);

      // Test unreadOnly filter
      const unreadOnly = await NotificationService.listNotifications(user.id, { unreadOnly: true });
      expect(unreadOnly.length).toBe(1);
      expect(unreadOnly[0].read).toBe(false);
    });
  });
});
