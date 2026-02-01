/**
 * Full Integration Test Example
 *
 * Demonstrates complete testing setup with:
 * - Database transactions and cleanup
 * - API endpoint testing
 * - Authentication flows
 * - Complex data scenarios
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import {
  useDatabaseHooks,
  UserFixtures,
  TripFixtures,
  ScenarioFixtures,
  ApiTestHelpers,
  getTestDb,
  withTestTransaction
} from '../utils/index.js';

describe('Full Integration Example - Trip Management', () => {
  // Enable database hooks for all tests
  useDatabaseHooks();

  let testApp: any;
  let authenticatedUser: { user: any; token: string };

  beforeEach(async () => {
    // Import app after environment is set up
    const { app } = await import('../../app.js');
    testApp = app;

    // Create authenticated user for tests
    authenticatedUser = await UserFixtures.createAuthenticatedUser({
      displayName: 'Integration Test User'
    });
  });

  describe('Complete Trip Workflow', () => {
    it('should handle full trip lifecycle: create, invite, manage, delete', async () => {
      // Step 1: Create a trip
      const tripData = {
        title: 'Integration Test Adventure',
        description: 'A comprehensive test of trip functionality',
        location: {
          name: 'San Francisco, CA',
          coordinates: { lat: 37.7749, lng: -122.4194 }
        },
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-10T00:00:00.000Z',
        metadata: { budget: 5000, currency: 'USD' }
      };

      const createResponse = await request(testApp)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .send(tripData)
        .expect(201);

      ApiTestHelpers.expectSuccessResponse(createResponse, 201);

      const trip = createResponse.body.data.trip;
      const membership = createResponse.body.data.membership;

      expect(trip.title).toBe(tripData.title);
      expect(trip.status).toBe('PLANNING');
      expect(trip.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
      expect(membership.role).toBe('HOST');

      // Step 2: Create additional users to invite
      const members = await UserFixtures.createUsers(3, {
        displayName: 'Trip Member'
      });

      // Step 3: Invite members (simulated by adding them directly)
      for (const member of members) {
        await TripFixtures.addMemberToTrip(trip.id, member.id, 'MEMBER', 'CONFIRMED');
      }

      // Step 4: Verify trip membership
      const tripResponse = await request(testApp)
        .get(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .expect(200);

      const tripDetails = tripResponse.body.data;
      expect(tripDetails.members).toHaveLength(4); // Host + 3 members
      expect(tripDetails.userMembership.role).toBe('HOST');

      // Step 5: Update trip details
      const updateData = {
        title: 'Updated Integration Adventure',
        status: 'ACTIVE',
        metadata: { ...tripData.metadata, budget: 6000 }
      };

      const updateResponse = await request(testApp)
        .put(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.title).toBe(updateData.title);
      expect(updateResponse.body.data.status).toBe('ACTIVE');

      // Step 6: Add events to the trip
      const eventData = {
        title: 'Welcome Dinner',
        description: 'Kick-off dinner for the trip',
        startDate: '2026-09-01T19:00:00.000Z',
        endDate: '2026-09-01T21:00:00.000Z',
        location: {
          name: 'Downtown Restaurant',
          coordinates: { lat: 37.7849, lng: -122.4094 }
        },
        type: 'MEAL'
      };

      const eventResponse = await request(testApp)
        .post(`/api/v1/trips/${trip.id}/events`)
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .send(eventData)
        .expect(201);

      ApiTestHelpers.expectSuccessResponse(eventResponse, 201);

      // Step 7: Add items to the trip
      const itemData = {
        name: 'Travel Documents',
        description: 'Passports, IDs, tickets',
        category: 'DOCUMENTS',
        quantity: 1,
        assignedTo: authenticatedUser.user.id
      };

      const itemResponse = await request(testApp)
        .post(`/api/v1/trips/${trip.id}/items`)
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .send(itemData)
        .expect(201);

      ApiTestHelpers.expectSuccessResponse(itemResponse, 201);

      // Step 8: Get trip statistics
      const statsResponse = await request(testApp)
        .get('/api/v1/trips/stats')
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .expect(200);

      const stats = statsResponse.body.data;
      expect(stats.totalTrips).toBeGreaterThan(0);
      expect(stats.hostingTrips).toBeGreaterThan(0);
      expect(stats.activeTrips).toBeGreaterThan(0);

      // Step 9: Search and filter trips
      const searchResponse = await request(testApp)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .query({ search: 'Integration', status: ['ACTIVE'] })
        .expect(200);

      ApiTestHelpers.expectPaginationResponse(searchResponse, 1);
      const foundTrip = searchResponse.body.data.trips[0];
      expect(foundTrip.title).toContain('Integration');
      expect(foundTrip.status).toBe('ACTIVE');

      // Step 10: Delete the trip (cleanup)
      const deleteResponse = await request(testApp)
        .delete(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .expect(200);

      ApiTestHelpers.expectSuccessResponse(deleteResponse);

      // Step 11: Verify deletion
      await request(testApp)
        .get(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .expect(404);
    });
  });

  describe('Advanced Database Scenarios', () => {
    it('should handle complex queries with transactions', async () => {
      await withTestTransaction(async (prisma) => {
        // Create a complex scenario within a transaction
        const scenario = await ScenarioFixtures.createFullTripScenario();

        // Verify the scenario was created correctly
        expect(scenario.host).toBeDefined();
        expect(scenario.members).toHaveLength(3);
        expect(scenario.events).toHaveLength(2);
        expect(scenario.items).toHaveLength(2);

        // Test complex queries
        const tripsWithMembers = await prisma.trip.findMany({
          where: {
            id: scenario.trip.id
          },
          include: {
            members: {
              include: {
                user: true
              }
            },
            events: true,
            items: true
          }
        });

        expect(tripsWithMembers).toHaveLength(1);
        const trip = tripsWithMembers[0];

        expect(trip.members).toHaveLength(4); // Host + 3 members
        expect(trip.events).toHaveLength(2);
        expect(trip.items).toHaveLength(2);

        // Test aggregation queries
        const memberCounts = await prisma.tripMember.groupBy({
          by: ['role'],
          where: {
            tripId: scenario.trip.id
          },
          _count: {
            role: true
          }
        });

        const hostCount = memberCounts.find(m => m.role === 'HOST')?._count?.role || 0;
        const memberCount = memberCounts.find(m => m.role === 'MEMBER')?._count?.role || 0;

        expect(hostCount).toBe(1);
        expect(memberCount).toBe(3);

        // Transaction will automatically rollback at the end
      });
    });

    it('should maintain data integrity during concurrent operations', async () => {
      const user = await UserFixtures.createUser();
      const { trip } = await TripFixtures.createTrip(user.id);

      // Simulate concurrent operations
      const operations = [
        // Multiple users trying to join the same trip
        TripFixtures.addMemberToTrip(trip.id, (await UserFixtures.createUser()).id),
        TripFixtures.addMemberToTrip(trip.id, (await UserFixtures.createUser()).id),
        TripFixtures.addMemberToTrip(trip.id, (await UserFixtures.createUser()).id),
      ];

      const results = await Promise.all(operations);

      // All operations should succeed
      expect(results).toHaveLength(3);
      results.forEach(membership => {
        expect(membership.tripId).toBe(trip.id);
        expect(membership.role).toBe('MEMBER');
      });

      // Verify final state
      const prisma = getTestDb();
      const memberCount = await prisma.tripMember.count({
        where: { tripId: trip.id }
      });

      expect(memberCount).toBe(4); // Original host + 3 new members
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle authentication errors gracefully', async () => {
      // Test without authentication
      const response = await request(testApp)
        .get('/api/v1/trips')
        .expect(401);

      ApiTestHelpers.expectErrorResponse(response, 401);
    });

    it('should handle invalid input data', async () => {
      const invalidTripData = {
        title: '', // Empty title
        startDate: 'invalid-date',
        endDate: '2026-01-01', // End before start
      };

      const response = await request(testApp)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .send(invalidTripData)
        .expect(400);

      ApiTestHelpers.expectErrorResponse(response, 400);
    });

    it('should handle non-existent resources', async () => {
      const nonExistentId = 'non-existent-trip-id';

      const response = await request(testApp)
        .get(`/api/v1/trips/${nonExistentId}`)
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .expect(404);

      ApiTestHelpers.expectErrorResponse(response, 404);
    });

    it('should handle authorization violations', async () => {
      // Create a trip with one user
      const otherUser = await UserFixtures.createUser();
      const { trip } = await TripFixtures.createTrip(otherUser.id);

      // Try to access it with different user
      const response = await request(testApp)
        .get(`/api/v1/trips/${trip.id}`)
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .expect(404); // Should return 404 for non-members

      ApiTestHelpers.expectErrorResponse(response, 404);
    });
  });

  describe('Performance and Pagination', () => {
    beforeEach(async () => {
      // Create multiple trips for pagination testing
      for (let i = 0; i < 15; i++) {
        await TripFixtures.createTrip(authenticatedUser.user.id, {
          title: `Pagination Test Trip ${i + 1}`
        });
      }
    });

    it('should handle pagination correctly', async () => {
      // Test first page
      const page1Response = await request(testApp)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      ApiTestHelpers.expectPaginationResponse(page1Response, 5);

      const page1Data = page1Response.body.data;
      expect(page1Data.trips).toHaveLength(5);
      expect(page1Data.pagination.page).toBe(1);
      expect(page1Data.pagination.total).toBeGreaterThanOrEqual(15);

      // Test second page
      const page2Response = await request(testApp)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .query({ page: 2, limit: 5 })
        .expect(200);

      const page2Data = page2Response.body.data;
      expect(page2Data.trips).toHaveLength(5);
      expect(page2Data.pagination.page).toBe(2);

      // Ensure different results on different pages
      const page1Ids = page1Data.trips.map((trip: any) => trip.id);
      const page2Ids = page2Data.trips.map((trip: any) => trip.id);

      const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });

    it('should handle sorting and filtering', async () => {
      const response = await request(testApp)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authenticatedUser.token}`)
        .query({
          sort: 'title',
          order: 'desc',
          status: ['PLANNING'],
          limit: 20
        })
        .expect(200);

      const trips = response.body.data.trips;
      expect(trips.length).toBeGreaterThan(0);

      // Verify sorting (titles should be in descending order)
      for (let i = 1; i < trips.length; i++) {
        expect(trips[i - 1].title >= trips[i].title).toBe(true);
      }

      // Verify filtering
      trips.forEach((trip: any) => {
        expect(trip.status).toBe('PLANNING');
      });
    });
  });
});