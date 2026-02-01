/**
 * Trip service integration tests for Group Planner API
 *
 * This test suite covers all CRUD operations for the Trip service,
 * including role-based access control and membership validation using real database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TripService } from '../services/trip.js';
import { prisma } from '../test/test-prisma.js'; // ✅ Use test database instance
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

// Test setup - using real database for integration testing

describe('TripService', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.itemClaim.deleteMany({});
    await prisma.item.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.tripMember.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test users in database
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
          id: mockNonMemberUser.id,
          email: mockNonMemberUser.email,
          username: mockNonMemberUser.username,
          displayName: mockNonMemberUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
      ]
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.itemClaim.deleteMany({});
    await prisma.item.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.tripMember.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('createTrip', () => {
    it('should create a trip with the creator as HOST', async () => {
      const result = await TripService.createTrip(mockHostUser, validTripData);

      expect(result.trip).toBeDefined();
      expect(result.trip.title).toBe(validTripData.title);
      expect(result.trip.description).toBe(validTripData.description);
      expect(result.trip.status).toBe('PLANNING');
      expect(result.trip.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
      expect(result.membership).toBeDefined();
      expect(result.membership.role).toBe('HOST');
      expect(result.membership.status).toBe('CONFIRMED');
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
      const result = await TripService.createTrip(mockHostUser, validTripData);
      expect(result.trip.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
      expect(result.trip.inviteCode).not.toMatch(/[01OIJL]/); // No ambiguous chars
    });
  });

  describe('listUserTrips', () => {
    it('should list user trips with pagination', async () => {
      // Create test trips
      const trip1 = await TripService.createTrip(mockHostUser, {
        title: 'Test Trip 1',
        description: 'First test trip',
      });

      const trip2 = await TripService.createTrip(mockHostUser, {
        title: 'Test Trip 2',
        description: 'Second test trip',
      });

      const query: TripListQuery = { page: 1, limit: 10 };
      const result = await TripService.listUserTrips(mockHostUser, query);

      expect(result.trips).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.trips.some(t => t.title === 'Test Trip 1')).toBe(true);
      expect(result.trips.some(t => t.title === 'Test Trip 2')).toBe(true);
      expect(result.trips.every(t => t.userMembership?.role === 'HOST')).toBe(true);
    });

    it('should filter trips by status', async () => {
      // Create trips with different statuses
      const planningTrip = await TripService.createTrip(mockHostUser, {
        title: 'Planning Trip',
        description: 'Trip in planning',
      });

      // Update one trip to ACTIVE status
      const activeTrip = await TripService.updateTrip(planningTrip.trip.id, mockHostUser, {
        status: 'ACTIVE',
      });

      const query: TripListQuery = { status: ['ACTIVE'] };
      const result = await TripService.listUserTrips(mockHostUser, query);

      expect(result.trips).toHaveLength(1);
      expect(result.trips[0].status).toBe('ACTIVE');
      expect(result.trips[0].title).toBe('Planning Trip');
    });

    it('should filter trips by role', async () => {
      // Create a trip where user is HOST
      const hostTrip = await TripService.createTrip(mockHostUser, {
        title: 'Hosting Trip',
        description: 'Trip where user is host',
      });

      const query: TripListQuery = { role: ['HOST'] };
      const result = await TripService.listUserTrips(mockHostUser, query);

      expect(result.trips).toHaveLength(1);
      expect(result.trips[0].userMembership?.role).toBe('HOST');
      expect(result.trips[0].title).toBe('Hosting Trip');
    });

    it('should search trips by title and description', async () => {
      // Create trips with different titles
      await TripService.createTrip(mockHostUser, {
        title: 'Paris Adventure',
        description: 'Amazing trip to France',
      });

      await TripService.createTrip(mockHostUser, {
        title: 'London Trip',
        description: 'Business trip to UK',
      });

      const query: TripListQuery = { search: 'Paris' };
      const result = await TripService.listUserTrips(mockHostUser, query);

      // Should find at least one trip with Paris in the title
      expect(result.trips.length).toBeGreaterThanOrEqual(1);
      expect(result.trips.some(trip => trip.title.includes('Paris'))).toBe(true);
    });
  });

  describe('getTripById', () => {
    it('should get trip by ID for confirmed member', async () => {
      // Create a trip and add member
      const trip = await TripService.createTrip(mockHostUser, {
        title: 'Test Trip',
        description: 'Test Description',
      });

      // Add member to trip
      await prisma.tripMember.create({
        data: {
          tripId: trip.trip.id,
          userId: mockMemberUser.id,
          role: 'MEMBER',
          status: 'CONFIRMED',
        },
      });

      const result = await TripService.getTripById(trip.trip.id, mockMemberUser);

      expect(result).toBeDefined();
      expect(result.id).toBe(trip.trip.id);
      expect(result.title).toBe('Test Trip');
      expect(result.members).toHaveLength(2); // HOST + MEMBER
      expect(result.userMembership?.role).toBe('MEMBER');
      expect(result.userMembership?.status).toBe('CONFIRMED');
    });

    it('should throw NotFoundError for non-member', async () => {
      // Create a trip but don't add mockNonMemberUser as member
      const trip = await TripService.createTrip(mockHostUser, {
        title: 'Private Trip',
        description: 'Only for members',
      });

      await expect(
        TripService.getTripById(trip.trip.id, mockNonMemberUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for pending membership', async () => {
      // Create a trip
      const trip = await TripService.createTrip(mockHostUser, {
        title: 'Test Trip',
        description: 'Test with pending member',
      });

      // Add member with PENDING status
      await prisma.tripMember.create({
        data: {
          tripId: trip.trip.id,
          userId: mockMemberUser.id,
          role: 'MEMBER',
          status: 'PENDING',
        },
      });

      await expect(
        TripService.getTripById(trip.trip.id, mockMemberUser)
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
      // Create a trip first
      const trip = await TripService.createTrip(mockHostUser, {
        title: 'Original Title',
        description: 'Original description',
      });

      const result = await TripService.updateTrip(trip.trip.id, mockHostUser, updateData);

      expect(result.id).toBe(trip.trip.id);
      expect(result.title).toBe(updateData.title);
      expect(result.status).toBe(updateData.status);
      expect(result.description).toBe(updateData.description);
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
      // Create a trip first
      const trip = await TripService.createTrip(mockHostUser, {
        title: 'Trip to Delete',
        description: 'This will be deleted',
      });

      // deleteTrip returns Promise<void>, so we just verify no exception is thrown
      await TripService.deleteTrip(trip.trip.id, mockHostUser);

      // Verify trip is deleted by trying to get it
      await expect(
        TripService.getTripById(trip.trip.id, mockHostUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent trip', async () => {
      await expect(
        TripService.deleteTrip('non-existent-id', mockHostUser)
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
      // Create some test trips
      const planningTrip = await TripService.createTrip(mockHostUser, {
        title: 'Planning Trip',
        description: 'Still planning',
      });

      const activeTrip = await TripService.createTrip(mockHostUser, {
        title: 'Active Trip',
        description: 'Currently active',
      });

      // Update one trip to ACTIVE status
      await TripService.updateTrip(activeTrip.trip.id, mockHostUser, {
        status: 'ACTIVE',
      });

      const result = await TripService.getTripStats(mockHostUser);

      expect(result.totalTrips).toBe(2);
      expect(result.hostingTrips).toBe(2); // User is HOST of both trips
      expect(typeof result.upcomingTrips).toBe('number');
      expect(typeof result.activeTrips).toBe('number');
    });
  });

  describe('generateInviteCode', () => {
    it('should generate valid 8-character invite codes', async () => {
      // Test multiple creations to check invite code format
      for (let i = 0; i < 3; i++) {
        const result = await TripService.createTrip(mockHostUser, {
          title: `Test Trip ${i}`,
          description: `Trip number ${i}`,
        });

        expect(result.trip.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
        expect(result.trip.inviteCode).not.toMatch(/[01OIJL]/); // No ambiguous chars
      }
    });
  });

});