/**
 * Announcement service comprehensive test suite
 *
 * Tests all CRUD operations, role-based access control, pin/unpin functionality,
 * pagination, soft delete, and edge cases for the Announcement service.
 */

import { describe, beforeEach, afterEach, it, expect } from 'bun:test';
import { AnnouncementService } from '../../services/announcement.js';
import { TripService } from '../../services/trip.js';
import { prisma } from '../../test/test-prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../utils/errors.js';
import { MAX_PINNED_ANNOUNCEMENTS } from '../../types/announcement.js';
import type { UserProfile } from '../../types/auth.js';

// Test data interfaces
interface TestTrip {
  id: string;
  title: string;
  inviteCode: string;
}

// Mock user profiles for testing
const mockHostUser: UserProfile = {
  id: 'user-host-ann-1',
  email: 'host-ann@example.com',
  username: 'testhost-ann',
  displayName: 'Test Host',
  emailVerified: true,
  timezone: 'UTC',
};

const mockCoHostUser: UserProfile = {
  id: 'user-cohost-ann-1',
  email: 'cohost-ann@example.com',
  username: 'testcohost-ann',
  displayName: 'Test CoHost',
  emailVerified: true,
  timezone: 'UTC',
};

const mockMemberUser: UserProfile = {
  id: 'user-member-ann-1',
  email: 'member-ann@example.com',
  username: 'testmember-ann',
  displayName: 'Test Member',
  emailVerified: true,
  timezone: 'UTC',
};

const mockOutsiderUser: UserProfile = {
  id: 'user-outsider-ann-1',
  email: 'outsider-ann@example.com',
  username: 'testoutsider-ann',
  displayName: 'Test Outsider',
  emailVerified: true,
  timezone: 'UTC',
};

describe('Announcement Service', () => {
  let testTrip: TestTrip;

  beforeEach(async () => {
    // Clean database in correct order to avoid foreign key issues
    await prisma.announcement.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.notificationPreference.deleteMany({});
    await prisma.itemClaim.deleteMany({});
    await prisma.item.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.tripExtension.deleteMany({});
    await prisma.tripMember.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.passwordReset.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.loginAttempt.deleteMany({});
    await prisma.user.deleteMany({});

    // Create mock users in database
    await prisma.user.createMany({
      data: [
        {
          id: mockHostUser.id,
          email: mockHostUser.email,
          username: mockHostUser.username,
          displayName: mockHostUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
        {
          id: mockCoHostUser.id,
          email: mockCoHostUser.email,
          username: mockCoHostUser.username,
          displayName: mockCoHostUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
        {
          id: mockMemberUser.id,
          email: mockMemberUser.email,
          username: mockMemberUser.username,
          displayName: mockMemberUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
        {
          id: mockOutsiderUser.id,
          email: mockOutsiderUser.email,
          username: mockOutsiderUser.username,
          displayName: mockOutsiderUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
      ],
    });

    // Create test trip with memberships
    const tripResult = await TripService.createTrip(mockHostUser, {
      title: 'Announcement Test Trip',
      description: 'A trip for testing announcements',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    testTrip = {
      id: tripResult.trip.id,
      title: tripResult.trip.title,
      inviteCode: tripResult.trip.inviteCode,
    };

    // Add co-host and member to trip
    await prisma.tripMember.create({
      data: {
        tripId: testTrip.id,
        userId: mockCoHostUser.id,
        role: 'CO_HOST',
        status: 'CONFIRMED',
      },
    });

    await prisma.tripMember.create({
      data: {
        tripId: testTrip.id,
        userId: mockMemberUser.id,
        role: 'MEMBER',
        status: 'CONFIRMED',
      },
    });
  });

  afterEach(async () => {
    // Clean database in correct order to avoid foreign key issues
    await prisma.announcement.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.notificationPreference.deleteMany({});
    await prisma.itemClaim.deleteMany({});
    await prisma.item.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.tripExtension.deleteMany({});
    await prisma.tripMember.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.passwordReset.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.loginAttempt.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('Create Announcement', () => {
    it('should create an announcement as HOST', async () => {
      const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'Test Announcement',
        body: 'This is a test announcement body',
      });

      expect(result.announcement).toMatchObject({
        title: 'Test Announcement',
        body: 'This is a test announcement body',
        pinned: false,
        tripId: testTrip.id,
      });

      expect(result.announcement.author.id).toBe(mockHostUser.id);
      expect(result.announcement.id).toBeDefined();
      expect(result.announcement.createdAt).toBeDefined();
      expect(result.announcement.updatedAt).toBeDefined();
    });

    it('should create an announcement as CO_HOST', async () => {
      const result = await AnnouncementService.create(testTrip.id, mockCoHostUser.id, {
        title: 'CoHost Announcement',
        body: 'Announcement from co-host',
      });

      expect(result.announcement.title).toBe('CoHost Announcement');
      expect(result.announcement.author.id).toBe(mockCoHostUser.id);
    });

    it('should create a pinned announcement', async () => {
      const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'Pinned Announcement',
        body: 'This is pinned',
        pinned: true,
      });

      expect(result.announcement.pinned).toBe(true);
    });

    it('should reject creation by regular MEMBER', async () => {
      await expect(
        AnnouncementService.create(testTrip.id, mockMemberUser.id, {
          title: 'Member Announcement',
          body: 'Should not work',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject creation by non-trip member', async () => {
      await expect(
        AnnouncementService.create(testTrip.id, mockOutsiderUser.id, {
          title: 'Outsider Announcement',
          body: 'Should not work',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate required fields', async () => {
      await expect(
        AnnouncementService.create(testTrip.id, mockHostUser.id, {
          title: '',
          body: 'Body without title',
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        AnnouncementService.create(testTrip.id, mockHostUser.id, {
          title: 'Title without body',
          body: '',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should validate title length', async () => {
      await expect(
        AnnouncementService.create(testTrip.id, mockHostUser.id, {
          title: 'A'.repeat(201),
          body: 'Valid body',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should validate body length', async () => {
      await expect(
        AnnouncementService.create(testTrip.id, mockHostUser.id, {
          title: 'Valid title',
          body: 'B'.repeat(10001),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should trim whitespace from title and body', async () => {
      const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: '  Trimmed Title  ',
        body: '  Trimmed Body  ',
      });

      expect(result.announcement.title).toBe('Trimmed Title');
      expect(result.announcement.body).toBe('Trimmed Body');
    });
  });

  describe('List Announcements', () => {
    beforeEach(async () => {
      // Create test announcements
      await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'First Announcement',
        body: 'First body',
        pinned: true,
      });

      await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'Second Announcement',
        body: 'Second body',
      });

      await AnnouncementService.create(testTrip.id, mockCoHostUser.id, {
        title: 'Third Announcement',
        body: 'Third body',
        pinned: true,
      });
    });

    it('should list all announcements with pinned first', async () => {
      const result = await AnnouncementService.list(testTrip.id, mockMemberUser.id);

      expect(result.announcements).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      // Pinned announcements should come first
      expect(result.announcements[0].pinned).toBe(true);
      expect(result.announcements[1].pinned).toBe(true);
      expect(result.announcements[2].pinned).toBe(false);
    });

    it('should filter pinned only', async () => {
      const result = await AnnouncementService.list(testTrip.id, mockMemberUser.id, {
        pinnedOnly: true,
      });

      expect(result.announcements).toHaveLength(2);
      result.announcements.forEach((a) => expect(a.pinned).toBe(true));
    });

    it('should support pagination', async () => {
      const page1 = await AnnouncementService.list(testTrip.id, mockMemberUser.id, {
        page: 1,
        limit: 2,
      });

      expect(page1.announcements).toHaveLength(2);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.totalPages).toBe(2);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      const page2 = await AnnouncementService.list(testTrip.id, mockMemberUser.id, {
        page: 2,
        limit: 2,
      });

      expect(page2.announcements).toHaveLength(1);
      expect(page2.pagination.hasNext).toBe(false);
      expect(page2.pagination.hasPrev).toBe(true);
    });

    it('should reject access by non-trip member', async () => {
      await expect(
        AnnouncementService.list(testTrip.id, mockOutsiderUser.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should not include soft-deleted announcements', async () => {
      // Delete one announcement
      const announcements = await prisma.announcement.findMany({
        where: { tripId: testTrip.id },
      });

      await AnnouncementService.delete(announcements[0].id, mockHostUser.id);

      const result = await AnnouncementService.list(testTrip.id, mockMemberUser.id);
      expect(result.announcements).toHaveLength(2);
    });
  });

  describe('Get Announcement By ID', () => {
    let testAnnouncementId: string;

    beforeEach(async () => {
      const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'Test Announcement',
        body: 'Test body',
      });
      testAnnouncementId = result.announcement.id;
    });

    it('should get announcement by ID', async () => {
      const announcement = await AnnouncementService.getById(testAnnouncementId, mockMemberUser.id);

      expect(announcement).toMatchObject({
        id: testAnnouncementId,
        title: 'Test Announcement',
        body: 'Test body',
      });
    });

    it('should reject access by non-trip member', async () => {
      await expect(
        AnnouncementService.getById(testAnnouncementId, mockOutsiderUser.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject invalid announcement ID', async () => {
      await expect(
        AnnouncementService.getById('invalid-id', mockMemberUser.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject soft-deleted announcement', async () => {
      await AnnouncementService.delete(testAnnouncementId, mockHostUser.id);

      await expect(
        AnnouncementService.getById(testAnnouncementId, mockMemberUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Update Announcement', () => {
    let testAnnouncementId: string;

    beforeEach(async () => {
      const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'Original Title',
        body: 'Original body',
      });
      testAnnouncementId = result.announcement.id;
    });

    it('should allow HOST to update announcement', async () => {
      const updated = await AnnouncementService.update(testAnnouncementId, mockHostUser.id, {
        title: 'Updated Title',
        body: 'Updated body',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.body).toBe('Updated body');
    });

    it('should allow CO_HOST to update announcement', async () => {
      const updated = await AnnouncementService.update(testAnnouncementId, mockCoHostUser.id, {
        title: 'CoHost Updated',
      });

      expect(updated.title).toBe('CoHost Updated');
    });

    it('should reject update by regular MEMBER', async () => {
      await expect(
        AnnouncementService.update(testAnnouncementId, mockMemberUser.id, {
          title: 'Member Update',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject update by non-trip member', async () => {
      await expect(
        AnnouncementService.update(testAnnouncementId, mockOutsiderUser.id, {
          title: 'Outsider Update',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate update data', async () => {
      await expect(
        AnnouncementService.update(testAnnouncementId, mockHostUser.id, {
          title: '',
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        AnnouncementService.update(testAnnouncementId, mockHostUser.id, {
          body: '',
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        AnnouncementService.update(testAnnouncementId, mockHostUser.id, {
          title: 'A'.repeat(201),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject update of soft-deleted announcement', async () => {
      await AnnouncementService.delete(testAnnouncementId, mockHostUser.id);

      await expect(
        AnnouncementService.update(testAnnouncementId, mockHostUser.id, {
          title: 'Updated',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Pin Announcement', () => {
    let testAnnouncementId: string;

    beforeEach(async () => {
      const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'Unpinned Announcement',
        body: 'Test body',
      });
      testAnnouncementId = result.announcement.id;
    });

    it('should pin an announcement', async () => {
      const result = await AnnouncementService.pin(testAnnouncementId, mockHostUser.id);

      expect(result.announcement.pinned).toBe(true);
      expect(result.pinnedCount).toBe(1);
    });

    it('should allow CO_HOST to pin', async () => {
      const result = await AnnouncementService.pin(testAnnouncementId, mockCoHostUser.id);

      expect(result.announcement.pinned).toBe(true);
    });

    it('should reject pin by regular MEMBER', async () => {
      await expect(
        AnnouncementService.pin(testAnnouncementId, mockMemberUser.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject pinning already pinned announcement', async () => {
      await AnnouncementService.pin(testAnnouncementId, mockHostUser.id);

      await expect(
        AnnouncementService.pin(testAnnouncementId, mockHostUser.id)
      ).rejects.toThrow(BadRequestError);
    });

    it('should enforce max pinned limit', async () => {
      // Create and pin MAX_PINNED_ANNOUNCEMENTS announcements
      for (let i = 0; i < MAX_PINNED_ANNOUNCEMENTS; i++) {
        const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
          title: `Pinned ${i}`,
          body: 'Body',
          pinned: true,
        });
      }

      // Try to pin one more
      await expect(
        AnnouncementService.pin(testAnnouncementId, mockHostUser.id)
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject pin of soft-deleted announcement', async () => {
      await AnnouncementService.delete(testAnnouncementId, mockHostUser.id);

      await expect(
        AnnouncementService.pin(testAnnouncementId, mockHostUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Unpin Announcement', () => {
    let testAnnouncementId: string;

    beforeEach(async () => {
      const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'Pinned Announcement',
        body: 'Test body',
        pinned: true,
      });
      testAnnouncementId = result.announcement.id;
    });

    it('should unpin an announcement', async () => {
      const result = await AnnouncementService.unpin(testAnnouncementId, mockHostUser.id);

      expect(result.announcement.pinned).toBe(false);
      expect(result.pinnedCount).toBe(0);
    });

    it('should allow CO_HOST to unpin', async () => {
      const result = await AnnouncementService.unpin(testAnnouncementId, mockCoHostUser.id);

      expect(result.announcement.pinned).toBe(false);
    });

    it('should reject unpin by regular MEMBER', async () => {
      await expect(
        AnnouncementService.unpin(testAnnouncementId, mockMemberUser.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject unpinning already unpinned announcement', async () => {
      await AnnouncementService.unpin(testAnnouncementId, mockHostUser.id);

      await expect(
        AnnouncementService.unpin(testAnnouncementId, mockHostUser.id)
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject unpin of soft-deleted announcement', async () => {
      await AnnouncementService.delete(testAnnouncementId, mockHostUser.id);

      await expect(
        AnnouncementService.unpin(testAnnouncementId, mockHostUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Delete Announcement (Soft Delete)', () => {
    let testAnnouncementId: string;

    beforeEach(async () => {
      const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'To Be Deleted',
        body: 'Test body',
        pinned: true,
      });
      testAnnouncementId = result.announcement.id;
    });

    it('should soft delete an announcement', async () => {
      await AnnouncementService.delete(testAnnouncementId, mockHostUser.id);

      // Verify it's soft deleted (not visible in list)
      const result = await AnnouncementService.list(testTrip.id, mockMemberUser.id);
      expect(result.announcements.find((a) => a.id === testAnnouncementId)).toBeUndefined();

      // Verify it still exists in database with deletedAt set
      const dbAnnouncement = await prisma.announcement.findUnique({
        where: { id: testAnnouncementId },
      });
      expect(dbAnnouncement).not.toBeNull();
      expect(dbAnnouncement?.deletedAt).not.toBeNull();
      expect(dbAnnouncement?.pinned).toBe(false); // Should be unpinned on delete
    });

    it('should allow CO_HOST to delete', async () => {
      await AnnouncementService.delete(testAnnouncementId, mockCoHostUser.id);

      const result = await AnnouncementService.list(testTrip.id, mockMemberUser.id);
      expect(result.announcements.find((a) => a.id === testAnnouncementId)).toBeUndefined();
    });

    it('should reject delete by regular MEMBER', async () => {
      await expect(
        AnnouncementService.delete(testAnnouncementId, mockMemberUser.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject delete by non-trip member', async () => {
      await expect(
        AnnouncementService.delete(testAnnouncementId, mockOutsiderUser.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject deleting already deleted announcement', async () => {
      await AnnouncementService.delete(testAnnouncementId, mockHostUser.id);

      await expect(
        AnnouncementService.delete(testAnnouncementId, mockHostUser.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should not count soft-deleted pinned announcements towards limit', async () => {
      // Create max pinned announcements
      for (let i = 0; i < MAX_PINNED_ANNOUNCEMENTS - 1; i++) {
        await AnnouncementService.create(testTrip.id, mockHostUser.id, {
          title: `Pinned ${i}`,
          body: 'Body',
          pinned: true,
        });
      }

      // We already have one pinned (testAnnouncementId), so we're at max

      // Delete the first one
      await AnnouncementService.delete(testAnnouncementId, mockHostUser.id);

      // Now we should be able to create a new pinned one
      const result = await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'New Pinned',
        body: 'Body',
        pinned: true,
      });

      expect(result.announcement.pinned).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-existent trip', async () => {
      await expect(
        AnnouncementService.create('fake-trip-id', mockHostUser.id, {
          title: 'Test',
          body: 'Test body',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle empty trip ID', async () => {
      await expect(
        AnnouncementService.create('', mockHostUser.id, {
          title: 'Test',
          body: 'Test body',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should handle empty announcement ID for operations', async () => {
      await expect(AnnouncementService.getById('', mockHostUser.id)).rejects.toThrow(
        BadRequestError
      );

      await expect(
        AnnouncementService.update('', mockHostUser.id, { title: 'Test' })
      ).rejects.toThrow(BadRequestError);

      await expect(AnnouncementService.pin('', mockHostUser.id)).rejects.toThrow(
        BadRequestError
      );

      await expect(AnnouncementService.unpin('', mockHostUser.id)).rejects.toThrow(
        BadRequestError
      );

      await expect(AnnouncementService.delete('', mockHostUser.id)).rejects.toThrow(
        BadRequestError
      );
    });

    it('should handle extreme pagination values', async () => {
      await AnnouncementService.create(testTrip.id, mockHostUser.id, {
        title: 'Test',
        body: 'Body',
      });

      // Very large page number
      const result = await AnnouncementService.list(testTrip.id, mockMemberUser.id, {
        page: 999999,
        limit: 1,
      });

      expect(result.announcements).toHaveLength(0);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should handle pagination limits correctly', async () => {
      // Create multiple announcements
      for (let i = 0; i < 5; i++) {
        await AnnouncementService.create(testTrip.id, mockHostUser.id, {
          title: `Announcement ${i}`,
          body: 'Body',
        });
      }

      // Request with limit > 100 should be capped at 100
      const result = await AnnouncementService.list(testTrip.id, mockMemberUser.id, {
        limit: 150,
      });

      expect(result.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('should handle PENDING member status correctly', async () => {
      // Create a pending member
      const pendingUser: UserProfile = {
        id: 'user-pending-ann-1',
        email: 'pending-ann@example.com',
        username: 'pendinguser-ann',
        displayName: 'Pending User',
        emailVerified: true,
        timezone: 'UTC',
      };

      await prisma.user.create({
        data: {
          id: pendingUser.id,
          email: pendingUser.email,
          username: pendingUser.username,
          displayName: pendingUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
      });

      await prisma.tripMember.create({
        data: {
          tripId: testTrip.id,
          userId: pendingUser.id,
          role: 'MEMBER',
          status: 'PENDING',
        },
      });

      // Pending member should not be able to access announcements
      await expect(
        AnnouncementService.list(testTrip.id, pendingUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
