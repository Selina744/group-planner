/**
 * Socket.io service tests for Group Planner API
 *
 * This module tests Socket.io server functionality including JWT authentication,
 * connection management, room handling, and real-time messaging.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { SocketService } from '../services/socket.js';
import { JwtService } from '../services/jwt.js';
import { AuthService } from '../services/auth.js';
import { DatabaseManager } from '../lib/database.js';
import type { UserProfile } from '../types/auth.js';

// Test configuration
const TEST_PORT = 3001;
const TEST_HOST = 'localhost';
const SERVER_URL = `http://${TEST_HOST}:${TEST_PORT}`;

describe('Socket.io Service', () => {
  let socketService: SocketService;
  let httpServer: ReturnType<typeof createServer>;
  let testUser: UserProfile;
  let validToken: string;

  beforeAll(async () => {
    // Initialize database for testing
    await DatabaseManager.initialize();

    // Create a test user
    testUser = await AuthService.createUser({
      email: 'test-socket@example.com',
      password: 'TestPassword123!',
      username: 'socket-test-user',
    });

    // Generate a valid token
    const tokenResult = JwtService.generateTokens(testUser.id, testUser.email, testUser.username);
    if (!tokenResult.success) {
      throw new Error('Failed to generate test token');
    }
    validToken = tokenResult.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup database
    await DatabaseManager.shutdown();
  });

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();

    // Initialize Socket.io service
    socketService = new SocketService({
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    socketService.initialize(httpServer);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(TEST_PORT, TEST_HOST, () => {
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Shutdown Socket.io service
    await socketService.shutdown();

    // Close HTTP server
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  describe('JWT Authentication', () => {
    it('should reject connection without token', async () => {
      const client = ioClient(SERVER_URL, {
        transports: ['websocket'],
        timeout: 1000,
      });

      const connectionPromise = new Promise<boolean>((resolve) => {
        client.on('connect', () => resolve(true));
        client.on('connect_error', () => resolve(false));

        // Set timeout for the test
        setTimeout(() => resolve(false), 2000);
      });

      const connected = await connectionPromise;
      expect(connected).toBe(false);

      client.disconnect();
    });

    it('should reject connection with invalid token', async () => {
      const client = ioClient(SERVER_URL, {
        auth: {
          token: 'invalid-token',
        },
        transports: ['websocket'],
        timeout: 1000,
      });

      const connectionPromise = new Promise<boolean>((resolve) => {
        client.on('connect', () => resolve(true));
        client.on('connect_error', () => resolve(false));

        setTimeout(() => resolve(false), 2000);
      });

      const connected = await connectionPromise;
      expect(connected).toBe(false);

      client.disconnect();
    });

    it('should accept connection with valid token via auth parameter', async () => {
      const client = ioClient(SERVER_URL, {
        auth: {
          token: validToken,
        },
        transports: ['websocket'],
      });

      const connectionPromise = new Promise<boolean>((resolve) => {
        client.on('connect', () => resolve(true));
        client.on('connect_error', () => resolve(false));

        setTimeout(() => resolve(false), 5000);
      });

      const connected = await connectionPromise;
      expect(connected).toBe(true);

      client.disconnect();
    });

    it('should accept connection with valid token via Authorization header', async () => {
      const client = ioClient(SERVER_URL, {
        extraHeaders: {
          Authorization: `Bearer ${validToken}`,
        },
        transports: ['websocket'],
      });

      const connectionPromise = new Promise<boolean>((resolve) => {
        client.on('connect', () => resolve(true));
        client.on('connect_error', () => resolve(false));

        setTimeout(() => resolve(false), 5000);
      });

      const connected = await connectionPromise;
      expect(connected).toBe(true);

      client.disconnect();
    });
  });

  describe('Connection Management', () => {
    let client: ClientSocket;

    beforeEach(async () => {
      client = ioClient(SERVER_URL, {
        auth: { token: validToken },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should receive welcome message on connection', async () => {
      const welcomePromise = new Promise<any>((resolve) => {
        client.on('connected', resolve);
        setTimeout(() => resolve(null), 2000);
      });

      const welcomeMessage = await welcomePromise;
      expect(welcomeMessage).toBeTruthy();
      expect(welcomeMessage.message).toBe('Connected to Group Planner');
      expect(welcomeMessage.userId).toBe(testUser.id);
    });

    it('should track connection in statistics', () => {
      const stats = socketService.getStats();
      expect(stats.totalConnections).toBeGreaterThan(0);
      expect(stats.connections).toHaveLength(stats.totalConnections);

      const userConnection = stats.connections.find(conn => conn.userId === testUser.id);
      expect(userConnection).toBeTruthy();
    });

    it('should handle ping-pong', async () => {
      const pongPromise = new Promise<any>((resolve) => {
        client.on('pong', resolve);
        setTimeout(() => resolve(null), 2000);
      });

      client.emit('ping');
      const pongMessage = await pongPromise;

      expect(pongMessage).toBeTruthy();
      expect(pongMessage.timestamp).toBeTruthy();
    });
  });

  describe('Trip Room Management', () => {
    let client: ClientSocket;
    const testTripId = 'test-trip-123';

    beforeEach(async () => {
      client = ioClient(SERVER_URL, {
        auth: { token: validToken },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should successfully join a trip room', async () => {
      const joinPromise = new Promise<any>((resolve) => {
        client.on('trip:joined', resolve);
        setTimeout(() => resolve(null), 2000);
      });

      client.emit('trip:join', { tripId: testTripId });
      const joinMessage = await joinPromise;

      expect(joinMessage).toBeTruthy();
      expect(joinMessage.tripId).toBe(testTripId);
      expect(joinMessage.message).toBe('Successfully joined trip room');
    });

    it('should successfully leave a trip room', async () => {
      // First join the room
      await new Promise<void>((resolve) => {
        client.on('trip:joined', () => resolve());
        client.emit('trip:join', { tripId: testTripId });
      });

      // Then leave the room
      const leavePromise = new Promise<any>((resolve) => {
        client.on('trip:left', resolve);
        setTimeout(() => resolve(null), 2000);
      });

      client.emit('trip:leave', { tripId: testTripId });
      const leaveMessage = await leavePromise;

      expect(leaveMessage).toBeTruthy();
      expect(leaveMessage.tripId).toBe(testTripId);
      expect(leaveMessage.message).toBe('Successfully left trip room');
    });

    it('should track rooms in statistics', async () => {
      // Join a room
      await new Promise<void>((resolve) => {
        client.on('trip:joined', () => resolve());
        client.emit('trip:join', { tripId: testTripId });
      });

      const stats = socketService.getStats();
      expect(stats.totalRooms).toBeGreaterThan(0);

      const tripRoom = stats.rooms.find(room => room.roomName === `trip:${testTripId}`);
      expect(tripRoom).toBeTruthy();
      expect(tripRoom!.memberCount).toBeGreaterThan(0);
    });
  });

  describe('Real-time Updates', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    const testTripId = 'test-trip-456';

    beforeEach(async () => {
      // Create two clients
      client1 = ioClient(SERVER_URL, {
        auth: { token: validToken },
        transports: ['websocket'],
      });

      client2 = ioClient(SERVER_URL, {
        auth: { token: validToken },
        transports: ['websocket'],
      });

      // Wait for both to connect
      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);

      // Join both to the same trip room
      await Promise.all([
        new Promise<void>((resolve) => {
          client1.on('trip:joined', () => resolve());
          client1.emit('trip:join', { tripId: testTripId });
        }),
        new Promise<void>((resolve) => {
          client2.on('trip:joined', () => resolve());
          client2.emit('trip:join', { tripId: testTripId });
        }),
      ]);
    });

    afterEach(() => {
      if (client1.connected) client1.disconnect();
      if (client2.connected) client2.disconnect();
    });

    it('should broadcast trip updates to room members', async () => {
      const updatePromise = new Promise<any>((resolve) => {
        client2.on('trip:updated', resolve);
        setTimeout(() => resolve(null), 3000);
      });

      // Client1 sends an update
      client1.emit('trip:update', {
        tripId: testTripId,
        updateType: 'trip:updated',
        payload: {
          message: 'Test update from client1',
          data: { test: true },
        },
      });

      const updateMessage = await updatePromise;

      expect(updateMessage).toBeTruthy();
      expect(updateMessage.tripId).toBe(testTripId);
      expect(updateMessage.updateType).toBe('trip:updated');
      expect(updateMessage.payload.message).toBe('Test update from client1');
    });

    it('should notify when users join/leave rooms', async () => {
      const userJoinPromise = new Promise<any>((resolve) => {
        client1.on('user:joined', resolve);
        setTimeout(() => resolve(null), 2000);
      });

      // Create a third client and join the room
      const client3 = ioClient(SERVER_URL, {
        auth: { token: validToken },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        client3.on('connect', () => resolve());
      });

      client3.emit('trip:join', { tripId: testTripId });

      const joinNotification = await userJoinPromise;

      expect(joinNotification).toBeTruthy();
      expect(joinNotification.tripId).toBe(testTripId);
      expect(joinNotification.user.id).toBe(testUser.id);

      client3.disconnect();
    });
  });

  describe('Service Methods', () => {
    let client: ClientSocket;
    const testTripId = 'test-trip-789';

    beforeEach(async () => {
      client = ioClient(SERVER_URL, {
        auth: { token: validToken },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should send notifications to specific users', async () => {
      const notificationPromise = new Promise<any>((resolve) => {
        client.on('notification', resolve);
        setTimeout(() => resolve(null), 2000);
      });

      // Send notification via service method
      socketService.sendNotificationToUser(testUser.id, {
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification',
        data: { testData: true },
      });

      const notification = await notificationPromise;

      expect(notification).toBeTruthy();
      expect(notification.type).toBe('info');
      expect(notification.title).toBe('Test Notification');
      expect(notification.message).toBe('This is a test notification');
      expect(notification.data.testData).toBe(true);
    });

    it('should send trip updates to room members', async () => {
      // Join the trip room first
      await new Promise<void>((resolve) => {
        client.on('trip:joined', () => resolve());
        client.emit('trip:join', { tripId: testTripId });
      });

      const updatePromise = new Promise<any>((resolve) => {
        client.on('trip:updated', resolve);
        setTimeout(() => resolve(null), 2000);
      });

      // Send update via service method
      socketService.sendTripUpdate(testTripId, 'event:created', {
        eventName: 'New Event',
        eventDate: '2024-01-01',
        createdBy: testUser.id,
      });

      const update = await updatePromise;

      expect(update).toBeTruthy();
      expect(update.tripId).toBe(testTripId);
      expect(update.updateType).toBe('event:created');
      expect(update.payload.eventName).toBe('New Event');
    });
  });
});