/**
 * Socket.io Trip Broadcasting Integration Test
 *
 * This test validates the enhanced trip room management and broadcasting
 * functionality implemented in bd-2i4.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { io as Client, Socket } from 'socket.io-client';
import { createServer, Server as HTTPServer } from 'http';
import { app } from '../app.js';
import { socketService } from '../services/socket.js';
import { TripBroadcastService } from '../services/tripBroadcast.js';
import { prisma } from '../lib/prisma.js';
import { JwtService } from '../services/jwt.js';

describe('Socket.io Trip Broadcasting Integration', () => {
  let httpServer: HTTPServer;
  let clientSocket1: Socket;
  let clientSocket2: Socket;
  let testUser1: any;
  let testUser2: any;
  let testTrip: any;
  let accessToken1: string;
  let accessToken2: string;
  const port = 3001;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = createServer(app);

    // Initialize Socket.io service
    socketService.initialize(httpServer);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(port, resolve);
    });

    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        email: 'sockettest1@example.com',
        username: 'sockettest1',
        passwordHash: 'dummy_hash',
        emailVerified: true,
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'sockettest2@example.com',
        username: 'sockettest2',
        passwordHash: 'dummy_hash',
        emailVerified: true,
      },
    });

    // Generate access tokens
    accessToken1 = JwtService.generateAccessToken({
      sub: testUser1.id,
      email: testUser1.email,
      sessionId: 'test-session-1',
    }).token;

    accessToken2 = JwtService.generateAccessToken({
      sub: testUser2.id,
      email: testUser2.email,
      sessionId: 'test-session-2',
    }).token;

    // Create test trip
    testTrip = await prisma.trip.create({
      data: {
        title: 'Socket Test Trip',
        description: 'Test trip for socket broadcasting',
        status: 'PLANNING',
        inviteCode: 'TESTCODE',
        metadata: {},
      },
    });

    // Add both users as trip members
    await prisma.tripMember.createMany({
      data: [
        {
          tripId: testTrip.id,
          userId: testUser1.id,
          role: 'HOST',
          status: 'CONFIRMED',
          notifications: true,
          canInvite: true,
        },
        {
          tripId: testTrip.id,
          userId: testUser2.id,
          role: 'MEMBER',
          status: 'CONFIRMED',
          notifications: true,
          canInvite: false,
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.tripMember.deleteMany({
      where: { tripId: testTrip.id },
    });
    await prisma.trip.delete({ where: { id: testTrip.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [testUser1.id, testUser2.id] } },
    });

    // Close sockets and server
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();

    await socketService.shutdown();
    await new Promise<void>((resolve) => {
      httpServer.close(resolve);
    });
  });

  beforeEach(async () => {
    // Create socket connections
    clientSocket1 = Client(`http://localhost:${port}`, {
      auth: {
        token: accessToken1,
      },
      timeout: 5000,
    });

    clientSocket2 = Client(`http://localhost:${port}`, {
      auth: {
        token: accessToken2,
      },
      timeout: 5000,
    });

    // Wait for connections
    await Promise.all([
      new Promise<void>((resolve) => {
        clientSocket1.on('connected', () => resolve());
      }),
      new Promise<void>((resolve) => {
        clientSocket2.on('connected', () => resolve());
      }),
    ]);
  });

  afterEach(() => {
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();
  });

  it('should successfully authenticate and connect users', async () => {
    expect(clientSocket1.connected).toBe(true);
    expect(clientSocket2.connected).toBe(true);
  });

  it('should allow authorized users to join trip rooms', async () => {
    const joinPromise1 = new Promise<void>((resolve) => {
      clientSocket1.on('trip:joined', (data) => {
        expect(data.tripId).toBe(testTrip.id);
        expect(data.message).toBe('Successfully joined trip room');
        resolve();
      });
    });

    const joinPromise2 = new Promise<void>((resolve) => {
      clientSocket2.on('trip:joined', (data) => {
        expect(data.tripId).toBe(testTrip.id);
        resolve();
      });
    });

    const userJoinedPromise = new Promise<void>((resolve) => {
      clientSocket1.on('user:joined', (data) => {
        expect(data.tripId).toBe(testTrip.id);
        expect(data.user.id).toBe(testUser2.id);
        resolve();
      });
    });

    // Join trip rooms
    clientSocket1.emit('trip:join', { tripId: testTrip.id });
    clientSocket2.emit('trip:join', { tripId: testTrip.id });

    await Promise.all([joinPromise1, joinPromise2, userJoinedPromise]);
  });

  it('should prevent unauthorized users from joining trip rooms', async () => {
    // Create unauthorized user
    const unauthorizedUser = await prisma.user.create({
      data: {
        email: 'unauthorized@example.com',
        username: 'unauthorized',
        passwordHash: 'dummy_hash',
        emailVerified: true,
      },
    });

    const unauthorizedToken = JwtService.generateAccessToken({
      sub: unauthorizedUser.id,
      email: unauthorizedUser.email,
      sessionId: 'unauthorized-session',
    }).token;

    const unauthorizedSocket = Client(`http://localhost:${port}`, {
      auth: { token: unauthorizedToken },
    });

    const errorPromise = new Promise<void>((resolve) => {
      unauthorizedSocket.on('error', (error) => {
        expect(error.event).toBe('trip:join');
        expect(error.message).toBe('Access denied - not a member of this trip');
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      unauthorizedSocket.on('connected', () => resolve());
    });

    unauthorizedSocket.emit('trip:join', { tripId: testTrip.id });
    await errorPromise;

    // Cleanup
    unauthorizedSocket.disconnect();
    await prisma.user.delete({ where: { id: unauthorizedUser.id } });
  });

  it('should broadcast trip updates to all room members', async () => {
    // Join trip room
    clientSocket1.emit('trip:join', { tripId: testTrip.id });
    clientSocket2.emit('trip:join', { tripId: testTrip.id });

    // Wait for joins to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatePromise = new Promise<void>((resolve) => {
      clientSocket2.on('trip:updated', (data) => {
        expect(data.tripId).toBe(testTrip.id);
        expect(data.updateType).toBe('trip:updated');
        expect(data.payload.changes.title).toBe('Updated Trip Title');
        expect(data.updatedBy.id).toBe(testUser1.id);
        resolve();
      });
    });

    // Broadcast update using the service
    TripBroadcastService.broadcastTripUpdate(
      testTrip.id,
      { title: 'Updated Trip Title' },
      {
        id: testUser1.id,
        username: testUser1.username,
        email: testUser1.email,
      }
    );

    await updatePromise;
  });

  it('should broadcast member addition notifications', async () => {
    // Join trip room
    clientSocket1.emit('trip:join', { tripId: testTrip.id });
    clientSocket2.emit('trip:join', { tripId: testTrip.id });

    // Wait for joins to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const notificationPromise = new Promise<void>((resolve) => {
      clientSocket1.on('notification', (data) => {
        expect(data.type).toBe('info');
        expect(data.title).toBe('New Trip Member');
        expect(data.message).toContain('joined the trip as MEMBER');
        resolve();
      });
    });

    // Create new member
    const newUser = await prisma.user.create({
      data: {
        email: 'newmember@example.com',
        username: 'newmember',
        passwordHash: 'dummy_hash',
        emailVerified: true,
      },
    });

    // Broadcast member addition
    TripBroadcastService.broadcastMemberAdded(
      testTrip.id,
      {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: 'MEMBER',
      }
    );

    await notificationPromise;

    // Cleanup
    await prisma.user.delete({ where: { id: newUser.id } });
  });

  it('should get trip room statistics correctly', async () => {
    // Join trip room
    clientSocket1.emit('trip:join', { tripId: testTrip.id });
    clientSocket2.emit('trip:join', { tripId: testTrip.id });

    // Wait for joins to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    const stats = TripBroadcastService.getTripRoomStats(testTrip.id);

    expect(stats.tripId).toBe(testTrip.id);
    expect(stats.activeConnections).toBe(2);
    expect(stats.members).toHaveLength(2);
    expect(stats.members.map((m: any) => m.userId)).toContain(testUser1.id);
    expect(stats.members.map((m: any) => m.userId)).toContain(testUser2.id);
  });

  it('should handle user leaving trip room', async () => {
    // Join trip room
    clientSocket1.emit('trip:join', { tripId: testTrip.id });
    clientSocket2.emit('trip:join', { tripId: testTrip.id });

    // Wait for joins to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const userLeftPromise = new Promise<void>((resolve) => {
      clientSocket2.on('user:left', (data) => {
        expect(data.tripId).toBe(testTrip.id);
        expect(data.user.id).toBe(testUser1.id);
        resolve();
      });
    });

    const leftConfirmPromise = new Promise<void>((resolve) => {
      clientSocket1.on('trip:left', (data) => {
        expect(data.tripId).toBe(testTrip.id);
        expect(data.message).toBe('Successfully left trip room');
        resolve();
      });
    });

    // Leave trip room
    clientSocket1.emit('trip:leave', { tripId: testTrip.id });

    await Promise.all([userLeftPromise, leftConfirmPromise]);
  });
});