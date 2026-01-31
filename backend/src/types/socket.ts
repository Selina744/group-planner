/**
 * TypeScript type definitions for Socket.io integration
 *
 * This module defines all types related to Socket.io real-time communication,
 * including authentication, connection management, and event handling.
 */

import type { Socket } from 'socket.io';
import type { Request } from 'express';
import type { UserProfile } from './auth.js';
import type { AccessTokenPayload } from './jwt.js';

/**
 * Socket.io server configuration
 */
export interface SocketConfig {
  cors: {
    origin: string | string[];
    methods: string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  maxHttpBufferSize: number;
  transports: ('websocket' | 'polling')[];
  allowEIO3: boolean;
}

/**
 * Authenticated socket interface
 */
export interface AuthenticatedSocket extends Socket {
  user: UserProfile;
  jwt: AccessTokenPayload;
  connectionStartTime: number;
}

/**
 * Socket connection information
 */
export interface SocketConnection {
  socketId: string;
  userId: string;
  user: UserProfile;
  connectedAt: Date;
  lastActivity: Date;
  rooms: Set<string>;
}

/**
 * Socket authentication middleware type
 */
export type SocketAuthMiddleware = (
  socket: Socket,
  next: (error?: Error) => void
) => Promise<void> | void;

/**
 * Socket security audit entry
 */
export interface SocketSecurityAuditEntry {
  event: string;
  socketId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string | undefined;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  context?: Record<string, unknown>;
}

/**
 * Socket event handler map
 */
export interface SocketEventHandlers {
  'trip:join': (data: SocketJoinRoomData) => Promise<void>;
  'trip:leave': (data: { tripId: string }) => Promise<void>;
  'trip:update': (data: SocketTripUpdateData) => Promise<void>;
  'ping': () => void;
  'disconnect': (reason: string) => void;
  'error': (error: Error) => void;
}

/**
 * Data for joining a trip room
 */
export interface SocketJoinRoomData {
  tripId: string;
  permissions?: string[];
}

/**
 * Data for trip updates
 */
export interface SocketTripUpdateData {
  tripId: string;
  updateType: SocketTripUpdateType;
  payload: any;
}

/**
 * Types of trip updates that can be sent via Socket.io
 */
export type SocketTripUpdateType =
  | 'trip:created'
  | 'trip:updated'
  | 'trip:deleted'
  | 'trip:member_added'
  | 'trip:member_removed'
  | 'trip:member_role_changed'
  | 'event:created'
  | 'event:updated'
  | 'event:deleted'
  | 'event:rsvp_updated'
  | 'item:created'
  | 'item:updated'
  | 'item:deleted'
  | 'item:assigned'
  | 'item:completed'
  | 'chat:message'
  | 'location:updated'
  | 'itinerary:updated'
  | 'expense:created'
  | 'expense:updated'
  | 'expense:deleted';

/**
 * Socket connection status
 */
export type SocketConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * Real-time notification types
 */
export interface SocketNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  data?: any;
  persistent?: boolean;
}

/**
 * Trip room membership data
 */
export interface SocketTripRoom {
  tripId: string;
  roomName: string;
  members: SocketRoomMember[];
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Room member information
 */
export interface SocketRoomMember {
  socketId: string;
  userId: string;
  username?: string;
  email: string;
  joinedAt: Date;
  lastSeen: Date;
  role?: string;
}

/**
 * Socket server statistics
 */
export interface SocketStats {
  totalConnections: number;
  totalRooms: number;
  connections: {
    socketId: string;
    userId: string;
    connectedAt: Date;
    lastActivity: Date;
    rooms: string[];
  }[];
  rooms: {
    roomName: string;
    memberCount: number;
  }[];
}

/**
 * Client-to-server events interface
 */
export interface ClientToServerEvents {
  'trip:join': (data: SocketJoinRoomData) => void;
  'trip:leave': (data: { tripId: string }) => void;
  'trip:update': (data: SocketTripUpdateData) => void;
  'ping': () => void;
  'typing:start': (data: { tripId: string; eventId?: string }) => void;
  'typing:stop': (data: { tripId: string; eventId?: string }) => void;
}

/**
 * Server-to-client events interface
 */
export interface ServerToClientEvents {
  'connected': (data: { message: string; userId: string; timestamp: string }) => void;
  'trip:joined': (data: { tripId: string; message: string; timestamp: string }) => void;
  'trip:left': (data: { tripId: string; message: string; timestamp: string }) => void;
  'trip:updated': (data: {
    tripId: string;
    updateType: SocketTripUpdateType;
    payload: any;
    updatedBy?: {
      id: string;
      username?: string;
      email: string;
    };
    timestamp: string;
  }) => void;
  'user:joined': (data: {
    tripId: string;
    user: {
      id: string;
      username?: string;
      email: string;
    };
    timestamp: string;
  }) => void;
  'user:left': (data: {
    tripId: string;
    user: {
      id: string;
      username?: string;
      email: string;
    };
    timestamp: string;
  }) => void;
  'user:status': (data: {
    userId: string;
    status: 'online' | 'offline';
    timestamp: string;
  }) => void;
  'notification': (data: SocketNotification & { timestamp: string }) => void;
  'pong': (data: { timestamp: string }) => void;
  'typing:user': (data: {
    tripId: string;
    eventId?: string;
    user: {
      id: string;
      username?: string;
      email: string;
    };
    isTyping: boolean;
    timestamp: string;
  }) => void;
  'error': (data: {
    event: string;
    message: string;
    error?: string;
  }) => void;
}

/**
 * Inter-server events (for Socket.io clustering)
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Socket data attached to each socket instance
 */
export interface SocketData {
  user: UserProfile;
  jwt: AccessTokenPayload;
  connectionStartTime: number;
}

/**
 * Socket.io server type with proper typing
 */
export type TypedSocketIOServer = import('socket.io').Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Typed socket instance
 */
export type TypedSocket = import('socket.io').Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Socket middleware error types
 */
export interface SocketAuthError extends Error {
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

/**
 * Socket room management utilities
 */
export interface SocketRoomManager {
  joinRoom: (socketId: string, roomName: string) => Promise<void>;
  leaveRoom: (socketId: string, roomName: string) => Promise<void>;
  getRoomMembers: (roomName: string) => Promise<string[]>;
  getUserRooms: (userId: string) => Promise<string[]>;
  broadcastToRoom: (roomName: string, event: string, data: any) => void;
  broadcastToUser: (userId: string, event: string, data: any) => void;
}

/**
 * Socket connection health check
 */
export interface SocketHealthCheck {
  isConnected: boolean;
  lastPing: Date;
  latency: number;
  reconnectCount: number;
  errors: string[];
}

/**
 * Socket rate limiting configuration
 */
export interface SocketRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (socket: Socket) => string;
  onLimitReached?: (socket: Socket) => void;
}

/**
 * Socket monitoring metrics
 */
export interface SocketMetrics {
  connectionsPerSecond: number;
  messagesPerSecond: number;
  disconnectionsPerSecond: number;
  averageConnectionDuration: number;
  errorRate: number;
  topActiveRooms: Array<{
    roomName: string;
    memberCount: number;
    messageCount: number;
  }>;
}

/**
 * Socket cluster configuration (for horizontal scaling)
 */
export interface SocketClusterConfig {
  adapter: 'redis' | 'memory' | 'custom';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  sticky?: boolean;
  workers?: number;
}

/**
 * Socket namespace configuration
 */
export interface SocketNamespaceConfig {
  name: string;
  auth: SocketAuthMiddleware;
  rateLimit?: SocketRateLimitConfig;
  middlewares?: SocketAuthMiddleware[];
}