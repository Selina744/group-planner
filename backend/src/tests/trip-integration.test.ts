/**
 * Trip Integration Tests
 *
 * Tests the full Trip CRUD flow including:
 * - Authentication and RBAC integration
 * - Database operations
 * - API endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';

describe('Trip Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let tripId: string;

  // Test user credentials
  const testUser = {
    email: 'triptest@example.com',
    username: 'triptest',
    password: 'StrongPassword123!',
    displayName: 'Trip Test User',
  };

  beforeAll(async () => {
    // Create a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    userId = registerResponse.body.data.user.id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    authToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    if (tripId) {
      try {
        await prisma.trip.delete({ where: { id: tripId } });
      } catch (error) {
        // Trip might already be deleted in tests
      }
    }

    if (userId) {
      try {
        await prisma.user.delete({ where: { id: userId } });
      } catch (error) {
        // User might already be deleted
      }
    }

    await prisma.$disconnect();
  });

  describe('POST /api/v1/trips - Create Trip', () => {
    it('should create a trip with creator as HOST', async () => {
      const tripData = {
        title: 'Test Integration Trip',
        description: 'A test trip for integration testing',
        location: {
          name: 'San Francisco, CA',
          coordinates: { lat: 37.7749, lng: -122.4194 },
        },
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-08-15T00:00:00.000Z',
        metadata: { budget: 3000, currency: 'USD' },
      };

      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tripData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trip).toBeDefined();
      expect(response.body.data.trip.title).toBe(tripData.title);
      expect(response.body.data.trip.status).toBe('PLANNING');
      expect(response.body.data.trip.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
      expect(response.body.data.membership).toBeDefined();
      expect(response.body.data.membership.role).toBe('HOST');
      expect(response.body.data.membership.status).toBe('CONFIRMED');

      tripId = response.body.data.trip.id;
    });

    it('should reject trip creation without authentication', async () => {
      const tripData = {
        title: 'Unauthorized Trip',
      };

      await request(app)
        .post('/api/v1/trips')
        .send(tripData)
        .expect(401);
    });

    it('should reject invalid trip data', async () => {
      const invalidTripData = {
        title: '', // Invalid empty title
      };

      await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTripData)
        .expect(400);
    });
  });

  describe('GET /api/v1/trips - List Trips', () => {
    it('should list user trips with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trips).toBeDefined();
      expect(Array.isArray(response.body.data.trips)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.trips.length).toBeGreaterThan(0);

      const trip = response.body.data.trips.find((t: any) => t.id === tripId);
      expect(trip).toBeDefined();
      expect(trip.userMembership.role).toBe('HOST');
    });

    it('should filter trips by status', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: ['PLANNING'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trips.every((trip: any) => trip.status === 'PLANNING')).toBe(true);
    });

    it('should search trips by title', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'Integration' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trips.length).toBeGreaterThan(0);
      expect(response.body.data.trips[0].title).toContain('Integration');
    });
  });

  describe('GET /api/v1/trips/:id - Get Trip by ID', () => {
    it('should get trip details for member', async () => {
      const response = await request(app)
        .get(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(tripId);
      expect(response.body.data.title).toBe('Test Integration Trip');
      expect(response.body.data.members).toBeDefined();
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(response.body.data.members.length).toBe(1);
      expect(response.body.data.userMembership.role).toBe('HOST');
    });

    it('should reject access to non-existent trip', async () => {
      await request(app)
        .get('/api/v1/trips/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/trips/:id - Update Trip', () => {
    it('should update trip as HOST', async () => {
      const updateData = {
        title: 'Updated Integration Trip',
        description: 'Updated description for the test trip',
        status: 'ACTIVE',
        location: {
          name: 'Los Angeles, CA',
          coordinates: { lat: 34.0522, lng: -118.2437 },
        },
      };

      const response = await request(app)
        .put(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.status).toBe('ACTIVE');
      expect(response.body.data.location.name).toBe(updateData.location.name);
    });

    it('should reject invalid update data', async () => {
      const invalidUpdateData = {
        title: 'x'.repeat(201), // Too long
      };

      await request(app)
        .put(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });
  });

  describe('GET /api/v1/trips/stats - Get Trip Statistics', () => {
    it('should get user trip statistics', async () => {
      const response = await request(app)
        .get('/api/v1/trips/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.totalTrips).toBe('number');
      expect(typeof response.body.data.hostingTrips).toBe('number');
      expect(typeof response.body.data.upcomingTrips).toBe('number');
      expect(typeof response.body.data.activeTrips).toBe('number');
      expect(response.body.data.totalTrips).toBeGreaterThan(0);
      expect(response.body.data.hostingTrips).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/v1/trips/:id - Delete Trip', () => {
    it('should delete trip as HOST', async () => {
      await request(app)
        .delete(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify trip is deleted
      await request(app)
        .get(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      tripId = ''; // Mark as deleted for cleanup
    });

    it('should reject deletion of non-existent trip', async () => {
      await request(app)
        .delete('/api/v1/trips/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('RBAC Integration', () => {
    let secondUserId: string;
    let secondAuthToken: string;
    let testTripId: string;

    beforeEach(async () => {
      // Create second user
      const secondUser = {
        email: 'seconduser@example.com',
        username: 'seconduser',
        password: 'StrongPassword123!',
        displayName: 'Second User',
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(secondUser)
        .expect(201);

      secondUserId = registerResponse.body.data.user.id;

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: secondUser.email,
          password: secondUser.password,
        })
        .expect(200);

      secondAuthToken = loginResponse.body.data.accessToken;

      // Create a test trip as first user
      const tripResponse = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'RBAC Test Trip',
          description: 'Trip for RBAC testing',
        })
        .expect(201);

      testTripId = tripResponse.body.data.trip.id;
    });

    afterEach(async () => {
      // Clean up
      try {
        if (testTripId) {
          await prisma.trip.delete({ where: { id: testTripId } });
        }
        if (secondUserId) {
          await prisma.user.delete({ where: { id: secondUserId } });
        }
      } catch (error) {
        // Resources might already be cleaned up
      }
    });

    it('should prevent non-members from accessing trip', async () => {
      await request(app)
        .get(`/api/v1/trips/${testTripId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(404); // Should return 404 for access denied
    });

    it('should prevent non-hosts from updating trip', async () => {
      // First, add second user as member
      await prisma.tripMember.create({
        data: {
          tripId: testTripId,
          userId: secondUserId,
          role: 'MEMBER',
          status: 'CONFIRMED',
        },
      });

      await request(app)
        .put(`/api/v1/trips/${testTripId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403); // Should be forbidden
    });

    it('should prevent non-hosts from deleting trip', async () => {
      // Add second user as member
      await prisma.tripMember.create({
        data: {
          tripId: testTripId,
          userId: secondUserId,
          role: 'MEMBER',
          status: 'CONFIRMED',
        },
      });

      await request(app)
        .delete(`/api/v1/trips/${testTripId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(403); // Should be forbidden
    });
  });
});