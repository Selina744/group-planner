/**
 * Trip service tests for Group Planner API
 *
 * This test suite covers all CRUD operations for the Trip service,
 * including role-based access control and membership validation.
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { TripService } from '../services/trip.js';
import { prisma } from '../lib/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import type { UserProfile } from '../types/auth.js';
import type {
  CreateTripRequest,
  UpdateTripRequest,
  TripListQuery,
  TripStatus,
  MemberRole,
} from '../types/trip.js';

// Mock user profiles for testing
const mockHostUser: UserProfile = {
  id: 'user-host-1',
  email: 'host@example.com',
  username: 'testhost',
  displayName: 'Test Host',
  emailVerified: true,
  timezone: 'UTC',
};

const mockCoHostUser: UserProfile = {
  id: 'user-cohost-1',
  email: 'cohost@example.com',
  username: 'testcohost',
  displayName: 'Test CoHost',
  emailVerified: true,
  timezone: 'UTC',
};

const mockMemberUser: UserProfile = {
  id: 'user-member-1',
  email: 'member@example.com',
  username: 'testmember',
  displayName: 'Test Member',
  emailVerified: true,
  timezone: 'UTC',
};

const mockNonMemberUser: UserProfile = {
  id: 'user-nonmember-1',
  email: 'nonmember@example.com',
  username: 'nonmember',
  displayName: 'Non Member',
  emailVerified: true,
  timezone: 'UTC',
};

// Mock trip data
const validTripData: CreateTripRequest = {
  title: 'Test Trip to Paris',
  description: 'A wonderful trip to the city of lights',
  location: {
    name: 'Paris, France',
    coordinates: { lat: 48.8566, lng: 2.3522 },
  },
  startDate: '2026-06-01T00:00:00.000Z',
  endDate: '2026-06-15T00:00:00.000Z',
  metadata: { budget: 5000, currency: 'EUR' },
};

// Mock Prisma methods
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    trip: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    tripMember: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  safePrismaOperation: vi.fn((fn) => fn()),
}));

describe('TripService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTrip', () => {
    it('should create a trip with the creator as HOST', async () => {
      const mockTrip = {
        id: 'trip-1',
        title: validTripData.title,
        description: validTripData.description,
        status: 'PLANNING',
        location: validTripData.location,
        inviteCode: 'ABC12345',
        metadata: validTripData.metadata,
        startDate: new Date(validTripData.startDate!),
        endDate: new Date(validTripData.endDate!),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMembership = {
        tripId: 'trip-1',
        userId: mockHostUser.id,
        role: 'HOST',
        status: 'CONFIRMED',
        notifications: true,
        canInvite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: mockHostUser.id,
          email: mockHostUser.email,
          username: mockHostUser.username,
          displayName: mockHostUser.displayName,
        },
      };

      (prisma.trip.create as any).mockResolvedValue(mockTrip);
      (prisma.tripMember.create as any).mockResolvedValue(mockMembership);

      const result = await TripService.createTrip(mockHostUser, validTripData);

      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: {
          title: validTripData.title,
          description: validTripData.description,
          status: 'PLANNING',
          location: validTripData.location,
          inviteCode: expect.any(String),
          metadata: validTripData.metadata,
          startDate: new Date(validTripData.startDate!),
          endDate: new Date(validTripData.endDate!),
        },
      });

      expect(prisma.tripMember.create).toHaveBeenCalledWith({
        data: {
          tripId: 'trip-1',
          userId: mockHostUser.id,
          role: 'HOST',
          status: 'CONFIRMED',
          notifications: true,
          canInvite: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      expect(result.trip).toBeDefined();
      expect(result.trip.id).toBe('trip-1');
      expect(result.trip.title).toBe(validTripData.title);
      expect(result.membership).toBeDefined();
      expect(result.membership.role).toBe('HOST');
    });

    it('should throw BadRequestError for invalid title', async () => {
      await expect(
        TripService.createTrip(mockHostUser, { ...validTripData, title: '' })
      ).rejects.toThrow(BadRequestError);

      await expect(
        TripService.createTrip(mockHostUser, { ...validTripData, title: 'a'.repeat(201) })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for invalid date range', async () => {
      await expect(
        TripService.createTrip(mockHostUser, {
          ...validTripData,
          startDate: '2026-06-15T00:00:00.000Z',
          endDate: '2026-06-01T00:00:00.000Z',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should generate unique invite codes', async () => {
      const mockTrip = {
        id: 'trip-1',
        title: validTripData.title,
        status: 'PLANNING',
        inviteCode: 'ABC12345',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMembership = {
        tripId: 'trip-1',
        userId: mockHostUser.id,
        role: 'HOST',
        status: 'CONFIRMED',
        user: { id: mockHostUser.id, email: mockHostUser.email },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.trip.create as any).mockResolvedValue(mockTrip);
      (prisma.tripMember.create as any).mockResolvedValue(mockMembership);

      const result = await TripService.createTrip(mockHostUser, validTripData);
      expect(result.trip.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
    });
  });

  describe('listUserTrips', () => {
    it('should list user trips with pagination', async () => {
      const mockTripMembers = [
        {
          tripId: 'trip-1',
          userId: mockHostUser.id,
          role: 'HOST',
          status: 'CONFIRMED',
          canInvite: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          trip: {
            id: 'trip-1',
            title: 'Test Trip 1',
            status: 'PLANNING',
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 3 },
          },
        },
        {
          tripId: 'trip-2',
          userId: mockHostUser.id,
          role: 'MEMBER',
          status: 'CONFIRMED',
          canInvite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          trip: {
            id: 'trip-2',
            title: 'Test Trip 2',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 5 },
          },
        },
      ];

      (prisma.tripMember.findMany as any).mockResolvedValue(mockTripMembers);
      (prisma.tripMember.count as any).mockResolvedValue(2);

      const query: TripListQuery = { page: 1, limit: 10 };
      const result = await TripService.listUserTrips(mockHostUser, query);

      expect(result.trips).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.trips[0].id).toBe('trip-1');
      expect(result.trips[0].userMembership?.role).toBe('HOST');
    });

    it('should filter trips by status', async () => {
      const mockTripMembers = [
        {
          tripId: 'trip-1',
          userId: mockHostUser.id,
          role: 'HOST',
          status: 'CONFIRMED',
          trip: {
            id: 'trip-1',
            title: 'Active Trip',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 1 },
          },
        },
      ];

      (prisma.tripMember.findMany as any).mockResolvedValue(mockTripMembers);
      (prisma.tripMember.count as any).mockResolvedValue(1);

      const query: TripListQuery = { status: ['ACTIVE'] };
      const result = await TripService.listUserTrips(mockHostUser, query);

      expect(result.trips).toHaveLength(1);
      expect(result.trips[0].status).toBe('ACTIVE');
    });

    it('should filter trips by role', async () => {
      const mockTripMembers = [
        {
          tripId: 'trip-1',
          userId: mockHostUser.id,
          role: 'HOST',
          status: 'CONFIRMED',
          trip: {
            id: 'trip-1',
            title: 'Hosting Trip',
            status: 'PLANNING',
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 1 },
          },
        },
      ];

      (prisma.tripMember.findMany as any).mockResolvedValue(mockTripMembers);
      (prisma.tripMember.count as any).mockResolvedValue(1);

      const query: TripListQuery = { role: ['HOST'] };
      const result = await TripService.listUserTrips(mockHostUser, query);

      expect(result.trips).toHaveLength(1);
      expect(result.trips[0].userMembership?.role).toBe('HOST');
    });

    it('should search trips by title and description', async () => {
      const mockTripMembers = [
        {
          tripId: 'trip-1',
          userId: mockHostUser.id,
          role: 'MEMBER',
          status: 'CONFIRMED',
          trip: {
            id: 'trip-1',
            title: 'Paris Adventure',
            description: 'Amazing trip to France',
            status: 'PLANNING',
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 2 },
          },
        },
      ];

      (prisma.tripMember.findMany as any).mockResolvedValue(mockTripMembers);
      (prisma.tripMember.count as any).mockResolvedValue(1);

      const query: TripListQuery = { search: 'Paris' };
      const result = await TripService.listUserTrips(mockHostUser, query);

      expect(result.trips).toHaveLength(1);
      expect(result.trips[0].title).toContain('Paris');
    });
  });

  describe('getTripById', () => {
    it('should get trip by ID for confirmed member', async () => {
      const mockMembership = {
        tripId: 'trip-1',
        userId: mockMemberUser.id,
        role: 'MEMBER',
        status: 'CONFIRMED',
        notifications: true,
        canInvite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        trip: {
          id: 'trip-1',
          title: 'Test Trip',
          description: 'Test Description',
          status: 'PLANNING',
          location: { name: 'Paris' },
          inviteCode: 'ABC12345',
          metadata: {},
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-15'),
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { members: 2 },
          members: [
            {
              tripId: 'trip-1',
              userId: mockHostUser.id,
              role: 'HOST',
              status: 'CONFIRMED',
              notifications: true,
              canInvite: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: mockHostUser.id,
                email: mockHostUser.email,
                username: mockHostUser.username,
                displayName: mockHostUser.displayName,
              },
            },
            {
              tripId: 'trip-1',
              userId: mockMemberUser.id,
              role: 'MEMBER',
              status: 'CONFIRMED',
              notifications: true,
              canInvite: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: mockMemberUser.id,
                email: mockMemberUser.email,
                username: mockMemberUser.username,
                displayName: mockMemberUser.displayName,
              },
            },
          ],
        },
      };

      (prisma.tripMember.findUnique as any).mockResolvedValue(mockMembership);

      const result = await TripService.getTripById('trip-1', mockMemberUser);

      expect(result).toBeDefined();
      expect(result.id).toBe('trip-1');
      expect(result.title).toBe('Test Trip');
      expect(result.members).toHaveLength(2);
      expect(result.userMembership?.role).toBe('MEMBER');
      expect(result.userMembership?.status).toBe('CONFIRMED');
    });

    it('should throw NotFoundError for non-member', async () => {
      (prisma.tripMember.findUnique as any).mockResolvedValue(null);

      await expect(
        TripService.getTripById('trip-1', mockNonMemberUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for pending membership', async () => {
      const mockMembership = {
        tripId: 'trip-1',
        userId: mockMemberUser.id,
        role: 'MEMBER',
        status: 'PENDING',
        trip: {
          id: 'trip-1',
          title: 'Test Trip',
        },
      };

      (prisma.tripMember.findUnique as any).mockResolvedValue(mockMembership);

      await expect(
        TripService.getTripById('trip-1', mockMemberUser)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError for empty trip ID', async () => {
      await expect(
        TripService.getTripById('', mockMemberUser)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('updateTrip', () => {
    const updateData: UpdateTripRequest = {
      title: 'Updated Trip Title',
      description: 'Updated description',
      status: 'ACTIVE' as TripStatus,
      location: { name: 'London, UK' },
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-15T00:00:00.000Z',
      metadata: { budget: 6000 },
    };

    it('should update trip successfully for HOST', async () => {
      const mockUpdatedTrip = {
        id: 'trip-1',
        title: updateData.title,
        description: updateData.description,
        status: updateData.status,
        location: updateData.location,
        startDate: new Date(updateData.startDate!),
        endDate: new Date(updateData.endDate!),
        metadata: updateData.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMembership = {
        tripId: 'trip-1',
        userId: mockHostUser.id,
        role: 'HOST',
        status: 'CONFIRMED',
      };

      (prisma.trip.update as any).mockResolvedValue(mockUpdatedTrip);
      (prisma.tripMember.findUnique as any).mockResolvedValue(mockMembership);
      (prisma.tripMember.count as any).mockResolvedValue(3);

      const result = await TripService.updateTrip('trip-1', mockHostUser, updateData);

      expect(result.id).toBe('trip-1');
      expect(result.title).toBe(updateData.title);
      expect(result.status).toBe(updateData.status);

      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: {
          title: updateData.title,
          description: updateData.description,
          status: updateData.status,
          location: updateData.location,
          startDate: new Date(updateData.startDate!),
          endDate: new Date(updateData.endDate!),
          metadata: updateData.metadata,
        },
      });
    });

    it('should throw BadRequestError for invalid title', async () => {
      await expect(
        TripService.updateTrip('trip-1', mockHostUser, { title: '' })
      ).rejects.toThrow(BadRequestError);

      await expect(
        TripService.updateTrip('trip-1', mockHostUser, { title: 'a'.repeat(201) })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for invalid date range', async () => {
      await expect(
        TripService.updateTrip('trip-1', mockHostUser, {
          startDate: '2026-07-15T00:00:00.000Z',
          endDate: '2026-07-01T00:00:00.000Z',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for empty trip ID', async () => {
      await expect(
        TripService.updateTrip('', mockHostUser, updateData)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('deleteTrip', () => {
    it('should delete trip successfully for HOST', async () => {
      const mockTrip = {
        id: 'trip-1',
        title: 'Trip to Delete',
        _count: { members: 2 },
      };

      (prisma.trip.findUnique as any).mockResolvedValue(mockTrip);
      (prisma.trip.delete as any).mockResolvedValue(undefined);

      await expect(
        TripService.deleteTrip('trip-1', mockHostUser)
      ).resolves.toBeUndefined();

      expect(prisma.trip.delete).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
      });
    });

    it('should throw NotFoundError for non-existent trip', async () => {
      (prisma.trip.findUnique as any).mockResolvedValue(null);

      await expect(
        TripService.deleteTrip('non-existent', mockHostUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError for empty trip ID', async () => {
      await expect(
        TripService.deleteTrip('', mockHostUser)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getTripStats', () => {
    it('should return trip statistics for user', async () => {
      (prisma.tripMember.count as any)
        .mockResolvedValueOnce(5) // totalTrips
        .mockResolvedValueOnce(2) // hostingTrips
        .mockResolvedValueOnce(3) // upcomingTrips
        .mockResolvedValueOnce(1); // activeTrips

      const result = await TripService.getTripStats(mockHostUser);

      expect(result).toEqual({
        totalTrips: 5,
        hostingTrips: 2,
        upcomingTrips: 3,
        activeTrips: 1,
      });

      expect(prisma.tripMember.count).toHaveBeenCalledTimes(4);
    });
  });

  describe('generateInviteCode', () => {
    it('should generate valid 8-character invite codes', async () => {
      // Test multiple creations to check uniqueness attempts
      const mockTrip = {
        id: 'trip-1',
        title: 'Test',
        inviteCode: 'TESTCODE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMembership = {
        tripId: 'trip-1',
        userId: mockHostUser.id,
        role: 'HOST',
        user: { id: mockHostUser.id, email: mockHostUser.email },
      };

      (prisma.trip.create as any).mockResolvedValue(mockTrip);
      (prisma.tripMember.create as any).mockResolvedValue(mockMembership);

      for (let i = 0; i < 5; i++) {
        const result = await TripService.createTrip(mockHostUser, {
          title: `Test Trip ${i}`,
        });

        expect(result.trip.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
        expect(result.trip.inviteCode).not.toMatch(/[01OIJL]/); // No ambiguous chars
      }
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully in createTrip', async () => {
      (prisma.trip.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        TripService.createTrip(mockHostUser, validTripData)
      ).rejects.toThrow('Failed to create trip');
    });

    it('should handle database errors gracefully in listUserTrips', async () => {
      (prisma.tripMember.findMany as any).mockRejectedValue(new Error('Database error'));

      await expect(
        TripService.listUserTrips(mockHostUser, {})
      ).rejects.toThrow('Failed to retrieve trips');
    });

    it('should handle database errors gracefully in getTripById', async () => {
      (prisma.tripMember.findUnique as any).mockRejectedValue(new Error('Database error'));

      await expect(
        TripService.getTripById('trip-1', mockMemberUser)
      ).rejects.toThrow('Failed to retrieve trip');
    });

    it('should handle database errors gracefully in updateTrip', async () => {
      (prisma.trip.update as any).mockRejectedValue(new Error('Database error'));

      await expect(
        TripService.updateTrip('trip-1', mockHostUser, { title: 'New Title' })
      ).rejects.toThrow('Failed to update trip');
    });

    it('should handle database errors gracefully in deleteTrip', async () => {
      (prisma.trip.findUnique as any).mockResolvedValue({ id: 'trip-1', title: 'Test' });
      (prisma.trip.delete as any).mockRejectedValue(new Error('Database error'));

      await expect(
        TripService.deleteTrip('trip-1', mockHostUser)
      ).rejects.toThrow('Failed to delete trip');
    });

    it('should handle database errors gracefully in getTripStats', async () => {
      (prisma.tripMember.count as any).mockRejectedValue(new Error('Database error'));

      await expect(
        TripService.getTripStats(mockHostUser)
      ).rejects.toThrow('Failed to retrieve trip statistics');
    });
  });
});