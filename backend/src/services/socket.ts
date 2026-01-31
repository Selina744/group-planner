/**
 * Socket.io service for real-time communication in Group Planner API
 *
 * This module provides Socket.io server configuration with JWT handshake
 * authentication, connection management, and room-based messaging for
 * trip-based real-time features.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { JwtService } from './jwt.js';
import { AuthService } from './auth.js';
import { log } from '../utils/logger.js';
import { getSecureClientIp } from '../utils/ipUtils.js';
import { prisma, safePrismaOperation } from '../lib/prisma.js';
import type {
  SocketAuthMiddleware,
  SocketConnection,
  SocketEventHandlers,
  SocketSecurityAuditEntry,
  AuthenticatedSocket,
  SocketConfig,
  SocketJoinRoomData,
  SocketTripUpdateData,
  SocketTripUpdateType,
} from '../types/socket.js';
import type { UserProfile } from '../types/auth.js';
import type { AccessTokenPayload } from '../types/jwt.js';

/**
 * Default Socket.io configuration
 */
const DEFAULT_SOCKET_CONFIG: SocketConfig = {
  cors: {
    origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  maxHttpBufferSize: 1e6, // 1MB
  transports: ['websocket', 'polling'],
  allowEIO3: true,
};

/**
 * Socket security audit logger
 */
class SocketSecurityAudit {
  /**
   * Log socket security event
   */
  static log(entry: SocketSecurityAuditEntry): void {
    log.auth('Socket security audit event', {
      event: entry.event,
      socketId: entry.socketId,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      severity: entry.severity,
      context: entry.context,
    });

    // High severity events need immediate attention
    if (entry.severity === 'HIGH' || entry.severity === 'CRITICAL') {
      log.error('High severity socket security event', {
        event: entry.event,
        socketId: entry.socketId,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        context: entry.context,
      });
    }
  }

  /**
   * Log unauthorized socket connection attempt
   */
  static logUnauthorizedConnection(
    socket: Socket,
    reason: string,
    context?: Record<string, unknown>
  ): void {
    this.log({
      event: 'UNAUTHORIZED_SOCKET_CONNECTION',
      socketId: socket.id,
      ipAddress: getSecureClientIp(socket.handshake as any) || socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || undefined,
      timestamp: new Date(),
      severity: 'MEDIUM',
      context: {
        reason,
        headers: socket.handshake.headers,
        ...context,
      },
    });
  }

  /**
   * Log successful socket connection
   */
  static logSuccessfulConnection(socket: AuthenticatedSocket, user: UserProfile): void {
    this.log({
      event: 'SOCKET_CONNECTION_SUCCESS',
      socketId: socket.id,
      userId: user.id,
      ipAddress: getSecureClientIp(socket.handshake as any) || socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || undefined,
      timestamp: new Date(),
      severity: 'LOW',
      context: {
        email: user.email,
        connectionTime: new Date().toISOString(),
      },
    });
  }

  /**
   * Log socket disconnection
   */
  static logDisconnection(socket: AuthenticatedSocket, reason: string): void {
    this.log({
      event: 'SOCKET_DISCONNECTION',
      socketId: socket.id,
      userId: socket.user?.id,
      ipAddress: getSecureClientIp(socket.handshake as any) || socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || undefined,
      timestamp: new Date(),
      severity: 'LOW',
      context: {
        reason,
        connectionDuration: socket.connectionStartTime
          ? Date.now() - socket.connectionStartTime
          : undefined,
      },
    });
  }
}

/**
 * Socket.io service class
 */
export class SocketService {
  private io: SocketIOServer | null = null;
  private connections = new Map<string, SocketConnection>();
  private rooms = new Map<string, Set<string>>(); // roomId -> Set of socketIds
  private config: SocketConfig;

  constructor(config?: Partial<SocketConfig>) {
    this.config = { ...DEFAULT_SOCKET_CONFIG, ...config };
  }

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer: HTTPServer): void {
    if (this.io) {
      log.warn('Socket.io server already initialized');
      return;
    }

    log.info('Initializing Socket.io server...', {
      cors: this.config.cors,
      pingTimeout: this.config.pingTimeout,
      pingInterval: this.config.pingInterval,
    });

    // Create Socket.io server
    this.io = new SocketIOServer(httpServer, this.config);

    // Setup authentication middleware
    this.setupAuthMiddleware();

    // Setup connection handlers
    this.setupConnectionHandlers();

    log.info('Socket.io server initialized successfully');
  }

  /**
   * Setup JWT authentication middleware
   */
  private setupAuthMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket: Socket, next) => {
      try {
        log.debug('Authenticating socket connection', {
          socketId: socket.id,
          headers: socket.handshake.headers,
        });

        // Extract JWT token from handshake
        const token = this.extractToken(socket);

        if (!token) {
          SocketSecurityAudit.logUnauthorizedConnection(
            socket,
            'Missing JWT token in handshake'
          );
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const verification = JwtService.verifyAccessToken(token);

        if (!verification.valid || !verification.payload) {
          SocketSecurityAudit.logUnauthorizedConnection(
            socket,
            'Invalid JWT token',
            { error: verification.error }
          );
          return next(new Error('Invalid authentication token'));
        }

        // Load user profile
        const user = await AuthService.getUserById(verification.payload.sub);
        if (!user) {
          SocketSecurityAudit.logUnauthorizedConnection(
            socket,
            'User not found for valid token',
            { userId: verification.payload.sub }
          );
          return next(new Error('User not found'));
        }

        // Attach user data to socket
        const authenticatedSocket = socket as AuthenticatedSocket;
        authenticatedSocket.user = user;
        authenticatedSocket.jwt = verification.payload;
        authenticatedSocket.connectionStartTime = Date.now();

        log.debug('Socket authenticated successfully', {
          socketId: socket.id,
          userId: user.id,
          email: user.email,
        });

        next();
      } catch (error) {
        log.error('Socket authentication error', error);
        SocketSecurityAudit.logUnauthorizedConnection(
          socket,
          'Authentication middleware error',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(socket: Socket): string | null {
    // Try Authorization header first
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try token query parameter
    const tokenQuery = socket.handshake.query.token;
    if (tokenQuery && typeof tokenQuery === 'string') {
      return tokenQuery;
    }

    // Try cookie (if using cookie-based auth)
    const cookies = socket.handshake.headers.cookie;
    if (cookies) {
      const match = cookies.match(/(?:^|; )accessToken=([^;]*)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    return null;
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      const authenticatedSocket = socket as AuthenticatedSocket;

      try {
        this.handleConnection(authenticatedSocket);
        this.setupSocketEventHandlers(authenticatedSocket);
      } catch (error) {
        log.error('Error setting up socket connection', error);
        socket.disconnect(true);
      }
    });
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const user = socket.user;
    const socketId = socket.id;

    log.info('New socket connection established', {
      socketId,
      userId: user.id,
      email: user.email,
    });

    // Store connection information
    const connection: SocketConnection = {
      socketId,
      userId: user.id,
      user,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
    };

    this.connections.set(socketId, connection);

    // Log successful connection
    SocketSecurityAudit.logSuccessfulConnection(socket, user);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Group Planner',
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Broadcast user online status to relevant rooms
    this.broadcastUserStatus(user.id, 'online');
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketEventHandlers(socket: AuthenticatedSocket): void {
    const handlers: SocketEventHandlers = {
      // Join trip room for real-time updates
      'trip:join': async (data: SocketJoinRoomData) => {
        await this.handleJoinTripRoom(socket, data);
      },

      // Leave trip room
      'trip:leave': async (data: { tripId: string }) => {
        await this.handleLeaveTripRoom(socket, data.tripId);
      },

      // Handle trip updates
      'trip:update': async (data: SocketTripUpdateData) => {
        await this.handleTripUpdate(socket, data);
      },

      // Handle ping for connection health
      'ping': () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
        this.updateLastActivity(socket.id);
      },

      // Handle disconnection
      'disconnect': (reason: string) => {
        this.handleDisconnection(socket, reason);
      },

      // Handle errors
      'error': (error: Error) => {
        log.error('Socket error', error, {
          socketId: socket.id,
          userId: socket.user?.id,
        });
      },
    };

    // Register event handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Update last activity on any event
    socket.onAny(() => {
      this.updateLastActivity(socket.id);
    });
  }

  /**
   * Handle joining a trip room
   */
  private async handleJoinTripRoom(
    socket: AuthenticatedSocket,
    data: SocketJoinRoomData
  ): Promise<void> {
    try {
      const { tripId } = data;
      const userId = socket.user.id;
      const roomName = `trip:${tripId}`;

      log.debug('User joining trip room', {
        socketId: socket.id,
        userId,
        tripId,
        roomName,
      });

      // Verify user has access to the trip by checking trip membership
      const isAuthorized = await this.verifyTripMembership(tripId, userId);
      if (!isAuthorized) {
        socket.emit('error', {
          event: 'trip:join',
          message: 'Access denied - not a member of this trip',
          error: 'FORBIDDEN',
        });

        SocketSecurityAudit.log({
          event: 'UNAUTHORIZED_TRIP_ACCESS',
          socketId: socket.id,
          userId,
          ipAddress: getSecureClientIp(socket.handshake as any) || socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'] || undefined,
          timestamp: new Date(),
          severity: 'MEDIUM',
          context: { tripId, action: 'join_room' },
        });

        return;
      }

      // Join the socket.io room
      await socket.join(roomName);

      // Track the room in connection data
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.rooms.add(roomName);
      }

      // Track room membership
      if (!this.rooms.has(roomName)) {
        this.rooms.set(roomName, new Set());
      }
      this.rooms.get(roomName)!.add(socket.id);

      // Confirm join to client
      socket.emit('trip:joined', {
        tripId,
        message: 'Successfully joined trip room',
        timestamp: new Date().toISOString(),
      });

      // Notify other room members
      socket.to(roomName).emit('user:joined', {
        tripId,
        user: {
          id: userId,
          username: socket.user.username,
          email: socket.user.email,
        },
        timestamp: new Date().toISOString(),
      });

      log.info('User joined trip room successfully', {
        socketId: socket.id,
        userId,
        tripId,
        roomName,
        roomSize: this.rooms.get(roomName)?.size || 0,
      });
    } catch (error) {
      log.error('Error joining trip room', error, {
        socketId: socket.id,
        userId: socket.user.id,
        tripId: data.tripId,
      });

      socket.emit('error', {
        event: 'trip:join',
        message: 'Failed to join trip room',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle leaving a trip room
   */
  private async handleLeaveTripRoom(socket: AuthenticatedSocket, tripId: string): Promise<void> {
    try {
      const userId = socket.user.id;
      const roomName = `trip:${tripId}`;

      log.debug('User leaving trip room', {
        socketId: socket.id,
        userId,
        tripId,
        roomName,
      });

      // Leave the socket.io room
      await socket.leave(roomName);

      // Update connection tracking
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.rooms.delete(roomName);
      }

      // Update room membership
      const room = this.rooms.get(roomName);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          this.rooms.delete(roomName);
        }
      }

      // Confirm leave to client
      socket.emit('trip:left', {
        tripId,
        message: 'Successfully left trip room',
        timestamp: new Date().toISOString(),
      });

      // Notify other room members
      socket.to(roomName).emit('user:left', {
        tripId,
        user: {
          id: userId,
          username: socket.user.username,
          email: socket.user.email,
        },
        timestamp: new Date().toISOString(),
      });

      log.info('User left trip room successfully', {
        socketId: socket.id,
        userId,
        tripId,
        roomName,
        remainingRoomSize: this.rooms.get(roomName)?.size || 0,
      });
    } catch (error) {
      log.error('Error leaving trip room', error, {
        socketId: socket.id,
        userId: socket.user.id,
        tripId,
      });

      socket.emit('error', {
        event: 'trip:leave',
        message: 'Failed to leave trip room',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle trip update events
   */
  private async handleTripUpdate(
    socket: AuthenticatedSocket,
    data: SocketTripUpdateData
  ): Promise<void> {
    try {
      const { tripId, updateType, payload } = data;
      const userId = socket.user.id;
      const roomName = `trip:${tripId}`;

      log.debug('Broadcasting trip update', {
        socketId: socket.id,
        userId,
        tripId,
        updateType,
        roomName,
      });

      // Verify user has permission for this update type
      const hasPermission = await this.verifyUpdatePermission(tripId, userId, updateType);
      if (!hasPermission) {
        socket.emit('error', {
          event: 'trip:update',
          message: 'Insufficient permissions for this update',
          error: 'FORBIDDEN',
        });

        SocketSecurityAudit.log({
          event: 'UNAUTHORIZED_UPDATE_ATTEMPT',
          socketId: socket.id,
          userId,
          ipAddress: getSecureClientIp(socket.handshake as any) || socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'] || undefined,
          timestamp: new Date(),
          severity: 'MEDIUM',
          context: { tripId, updateType },
        });

        return;
      }

      // Broadcast update to all room members except sender
      socket.to(roomName).emit('trip:updated', {
        tripId,
        updateType,
        payload,
        updatedBy: {
          id: userId,
          username: socket.user.username,
          email: socket.user.email,
        },
        timestamp: new Date().toISOString(),
      });

      log.info('Trip update broadcasted successfully', {
        socketId: socket.id,
        userId,
        tripId,
        updateType,
        roomSize: this.rooms.get(roomName)?.size || 0,
      });
    } catch (error) {
      log.error('Error handling trip update', error, {
        socketId: socket.id,
        userId: socket.user.id,
        tripId: data.tripId,
        updateType: data.updateType,
      });

      socket.emit('error', {
        event: 'trip:update',
        message: 'Failed to broadcast trip update',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    const socketId = socket.id;
    const user = socket.user;

    log.info('Socket disconnected', {
      socketId,
      userId: user?.id,
      reason,
    });

    // Log disconnection
    SocketSecurityAudit.logDisconnection(socket, reason);

    // Clean up connection data
    const connection = this.connections.get(socketId);
    if (connection) {
      // Remove from all rooms
      connection.rooms.forEach(roomName => {
        const room = this.rooms.get(roomName);
        if (room) {
          room.delete(socketId);
          if (room.size === 0) {
            this.rooms.delete(roomName);
          }
        }
      });

      this.connections.delete(socketId);
    }

    // Broadcast user offline status
    if (user) {
      this.broadcastUserStatus(user.id, 'offline');
    }
  }

  /**
   * Update last activity timestamp for a connection
   */
  private updateLastActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Broadcast user status to relevant rooms
   */
  private broadcastUserStatus(userId: string, status: 'online' | 'offline'): void {
    if (!this.io) return;

    // Find all rooms where this user has connections
    const userRooms = new Set<string>();

    this.connections.forEach(connection => {
      if (connection.userId === userId) {
        connection.rooms.forEach(room => userRooms.add(room));
      }
    });

    // Broadcast status to each room
    userRooms.forEach(roomName => {
      this.io!.to(roomName).emit('user:status', {
        userId,
        status,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId: string, notification: any): void {
    if (!this.io) {
      log.warn('Socket.io not initialized, cannot send notification');
      return;
    }

    // Find all sockets for this user
    const userSockets: string[] = [];
    this.connections.forEach(connection => {
      if (connection.userId === userId) {
        userSockets.push(connection.socketId);
      }
    });

    // Send notification to all user's sockets
    userSockets.forEach(socketId => {
      this.io!.to(socketId).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });
    });

    log.debug('Notification sent to user', {
      userId,
      socketCount: userSockets.length,
      notification: notification.type || 'unknown',
    });
  }

  /**
   * Send update to trip room
   */
  sendTripUpdate(tripId: string, updateType: string, payload: any, excludeUserId?: string): void {
    if (!this.io) {
      log.warn('Socket.io not initialized, cannot send trip update');
      return;
    }

    const roomName = `trip:${tripId}`;
    const room = this.rooms.get(roomName);

    if (!room || room.size === 0) {
      log.debug('No active connections in trip room', { tripId, roomName });
      return;
    }

    // If we need to exclude a specific user, filter out their sockets
    if (excludeUserId) {
      const targetSockets: string[] = [];

      this.connections.forEach(connection => {
        if (connection.userId !== excludeUserId && connection.rooms.has(roomName)) {
          targetSockets.push(connection.socketId);
        }
      });

      targetSockets.forEach(socketId => {
        this.io!.to(socketId).emit('trip:updated', {
          tripId,
          updateType,
          payload,
          timestamp: new Date().toISOString(),
        });
      });

      log.debug('Trip update sent to filtered room', {
        tripId,
        updateType,
        targetSocketCount: targetSockets.length,
        excludeUserId,
      });
    } else {
      this.io.to(roomName).emit('trip:updated', {
        tripId,
        updateType,
        payload,
        timestamp: new Date().toISOString(),
      });

      log.debug('Trip update sent to room', {
        tripId,
        updateType,
        roomSize: room.size,
      });
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      totalRooms: this.rooms.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        socketId: conn.socketId,
        userId: conn.userId,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity,
        rooms: Array.from(conn.rooms),
      })),
      rooms: Array.from(this.rooms.entries()).map(([roomName, socketIds]) => ({
        roomName,
        memberCount: socketIds.size,
      })),
    };
  }

  /**
   * Verify user membership in a trip
   */
  private async verifyTripMembership(tripId: string, userId: string): Promise<boolean> {
    try {
      const membership = await safePrismaOperation(async () => {
        return await prisma.tripMember.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId,
            },
          },
        });
      }, 'Verify trip membership');

      return membership?.status === 'CONFIRMED';
    } catch (error) {
      log.error('Error verifying trip membership', error, {
        tripId,
        userId,
      });
      return false;
    }
  }

  /**
   * Verify user permission for specific update types
   */
  private async verifyUpdatePermission(
    tripId: string,
    userId: string,
    updateType: SocketTripUpdateType
  ): Promise<boolean> {
    try {
      const membership = await safePrismaOperation(async () => {
        return await prisma.tripMember.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId,
            },
          },
        });
      }, 'Verify update permission');

      if (!membership || membership.status !== 'CONFIRMED') {
        return false;
      }

      // Define permissions based on member role and update type
      const userRole = membership.role;

      // HOST and CO_HOST can do everything
      if (userRole === 'HOST' || userRole === 'CO_HOST') {
        return true;
      }

      // MEMBER permissions for specific update types
      const memberAllowedUpdates: SocketTripUpdateType[] = [
        'event:rsvp_updated',
        'item:assigned',
        'item:completed',
        'chat:message',
      ];

      return memberAllowedUpdates.includes(updateType);
    } catch (error) {
      log.error('Error verifying update permission', error, {
        tripId,
        userId,
        updateType,
      });
      return false;
    }
  }

  /**
   * Get trip members for a specific trip
   */
  private async getTripMembers(tripId: string): Promise<string[]> {
    try {
      const members = await safePrismaOperation(async () => {
        return await prisma.tripMember.findMany({
          where: {
            tripId,
            status: 'CONFIRMED',
          },
          select: {
            userId: true,
          },
        });
      }, 'Get trip members');

      return members.map(member => member.userId);
    } catch (error) {
      log.error('Error getting trip members', error, { tripId });
      return [];
    }
  }

  /**
   * Enhanced broadcasting utilities
   */

  /**
   * Broadcast trip update with automatic member filtering
   */
  broadcastTripUpdate(
    tripId: string,
    updateType: SocketTripUpdateType,
    payload: any,
    options: {
      excludeUserId?: string;
      updatedBy?: {
        id: string;
        username?: string;
        email: string;
      };
      requiresPermission?: boolean;
    } = {}
  ): void {
    if (!this.io) {
      log.warn('Socket.io not initialized, cannot broadcast trip update');
      return;
    }

    const roomName = `trip:${tripId}`;
    const room = this.rooms.get(roomName);

    if (!room || room.size === 0) {
      log.debug('No active connections in trip room', { tripId, roomName });
      return;
    }

    const updateData = {
      tripId,
      updateType,
      payload,
      ...(options.updatedBy && { updatedBy: options.updatedBy }),
      timestamp: new Date().toISOString(),
    };

    // If we need to exclude a specific user, filter out their sockets
    if (options.excludeUserId) {
      const targetSockets: string[] = [];

      this.connections.forEach(connection => {
        if (connection.userId !== options.excludeUserId && connection.rooms.has(roomName)) {
          targetSockets.push(connection.socketId);
        }
      });

      targetSockets.forEach(socketId => {
        this.io!.to(socketId).emit('trip:updated', updateData);
      });

      log.info('Trip update sent to filtered room', {
        tripId,
        updateType,
        targetSocketCount: targetSockets.length,
        excludeUserId: options.excludeUserId,
      });
    } else {
      this.io.to(roomName).emit('trip:updated', updateData);

      log.info('Trip update sent to room', {
        tripId,
        updateType,
        roomSize: room.size,
      });
    }
  }

  /**
   * Broadcast member join event
   */
  broadcastMemberJoin(
    tripId: string,
    member: {
      id: string;
      username?: string;
      email: string;
      role: string;
    }
  ): void {
    this.broadcastTripUpdate(tripId, 'trip:member_added', {
      member,
    });
  }

  /**
   * Broadcast member leave event
   */
  broadcastMemberLeave(
    tripId: string,
    member: {
      id: string;
      username?: string;
      email: string;
      role: string;
    }
  ): void {
    this.broadcastTripUpdate(tripId, 'trip:member_removed', {
      member,
    });
  }

  /**
   * Broadcast trip details update
   */
  broadcastTripDetailsUpdate(
    tripId: string,
    changes: {
      title?: string;
      description?: string;
      location?: any;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
    updatedBy: {
      id: string;
      username?: string;
      email: string;
    }
  ): void {
    this.broadcastTripUpdate(tripId, 'trip:updated', {
      changes,
    }, { updatedBy });
  }

  /**
   * Broadcast event creation
   */
  broadcastEventCreated(
    tripId: string,
    event: any,
    createdBy: {
      id: string;
      username?: string;
      email: string;
    }
  ): void {
    this.broadcastTripUpdate(tripId, 'event:created', {
      event,
    }, { updatedBy: createdBy });
  }

  /**
   * Broadcast event update
   */
  broadcastEventUpdated(
    tripId: string,
    event: any,
    changes: Record<string, any>,
    updatedBy: {
      id: string;
      username?: string;
      email: string;
    }
  ): void {
    this.broadcastTripUpdate(tripId, 'event:updated', {
      event,
      changes,
    }, { updatedBy });
  }

  /**
   * Broadcast event deletion
   */
  broadcastEventDeleted(
    tripId: string,
    eventId: string,
    deletedBy: {
      id: string;
      username?: string;
      email: string;
    }
  ): void {
    this.broadcastTripUpdate(tripId, 'event:deleted', {
      eventId,
    }, { updatedBy: deletedBy });
  }

  /**
   * Broadcast item assignment
   */
  broadcastItemAssigned(
    tripId: string,
    item: any,
    assignedTo: {
      id: string;
      username?: string;
      email: string;
    },
    assignedBy: {
      id: string;
      username?: string;
      email: string;
    }
  ): void {
    this.broadcastTripUpdate(tripId, 'item:assigned', {
      item,
      assignedTo,
    }, { updatedBy: assignedBy });
  }

  /**
   * Broadcast item status change
   */
  broadcastItemStatusChanged(
    tripId: string,
    item: any,
    oldStatus: string,
    newStatus: string,
    changedBy: {
      id: string;
      username?: string;
      email: string;
    }
  ): void {
    this.broadcastTripUpdate(tripId, 'item:updated', {
      item,
      changes: {
        status: { from: oldStatus, to: newStatus },
      },
    }, { updatedBy: changedBy });
  }

  /**
   * Send targeted notification to specific trip members
   */
  async sendNotificationToTripMembers(
    tripId: string,
    notification: any,
    options: {
      excludeUserId?: string;
      targetRoles?: string[];
    } = {}
  ): Promise<void> {
    if (!this.io) {
      log.warn('Socket.io not initialized, cannot send notification');
      return;
    }

    try {
      // Get trip members
      const membersQuery: any = {
        tripId,
        status: 'CONFIRMED',
      };

      if (options.targetRoles && options.targetRoles.length > 0) {
        membersQuery.role = { in: options.targetRoles };
      }

      const members = await safePrismaOperation(async () => {
        return await prisma.tripMember.findMany({
          where: membersQuery,
          select: {
            userId: true,
            role: true,
          },
        });
      }, 'Get trip members for notification');

      // Filter out excluded user
      const targetUserIds = members
        .map(member => member.userId)
        .filter(userId => userId !== options.excludeUserId);

      // Send notification to each target user
      let sentCount = 0;
      targetUserIds.forEach(userId => {
        const userSockets: string[] = [];
        this.connections.forEach(connection => {
          if (connection.userId === userId) {
            userSockets.push(connection.socketId);
          }
        });

        userSockets.forEach(socketId => {
          this.io!.to(socketId).emit('notification', {
            ...notification,
            tripId,
            timestamp: new Date().toISOString(),
          });
          sentCount++;
        });
      });

      log.info('Trip notification sent to members', {
        tripId,
        targetMemberCount: targetUserIds.length,
        sentSocketCount: sentCount,
        notificationType: notification.type || 'unknown',
      });
    } catch (error) {
      log.error('Error sending notification to trip members', error, {
        tripId,
        notification,
      });
    }
  }

  /**
   * Get real-time trip room statistics
   */
  getTripRoomStats(tripId: string) {
    const roomName = `trip:${tripId}`;
    const room = this.rooms.get(roomName);

    if (!room) {
      return {
        tripId,
        roomName,
        activeConnections: 0,
        members: [],
      };
    }

    const members: any[] = [];
    this.connections.forEach(connection => {
      if (connection.rooms.has(roomName)) {
        members.push({
          socketId: connection.socketId,
          userId: connection.userId,
          username: connection.user.username,
          email: connection.user.email,
          connectedAt: connection.connectedAt,
          lastActivity: connection.lastActivity,
        });
      }
    });

    return {
      tripId,
      roomName,
      activeConnections: room.size,
      members,
    };
  }

  /**
   * Shutdown the Socket.io server
   */
  shutdown(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.io) {
        return resolve();
      }

      log.info('Shutting down Socket.io server...');

      // Disconnect all clients
      this.io.disconnectSockets(true);

      // Clear internal state
      this.connections.clear();
      this.rooms.clear();

      // Close the server
      this.io.close(() => {
        log.info('Socket.io server shut down successfully');
        this.io = null;
        resolve();
      });
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();