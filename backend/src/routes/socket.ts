/**
 * Socket.io management routes for Group Planner API
 *
 * This module provides HTTP endpoints for managing and monitoring
 * Socket.io connections, rooms, and real-time features.
 */

import express, { type Request, type Response } from 'express';
import { socketService } from '../services/socket.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrapAsync } from '../utils/wrapAsync.js';
import type { ApiResponse } from '../types/api.js';
import type { AuthenticatedRequest } from '../types/middleware.js';

const router: express.Router = express.Router();

/**
 * Get Socket.io server status and statistics
 * @route GET /socket/stats
 * @access Admin only
 */
router.get(
  '/stats',
  requireAdmin() as any,
  wrapAsync<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const stats = socketService.getStats();

    const response: ApiResponse = {
      success: true,
      data: {
        server: 'Socket.io',
        status: 'running',
        timestamp: new Date().toISOString(),
        ...stats,
      },
    };

    return res.json(response);
  }) as any
);

/**
 * Get user's active Socket.io connections
 * @route GET /socket/my-connections
 * @access Authenticated users
 */
router.get(
  '/my-connections',
  requireAuth() as any,
  wrapAsync<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const stats = socketService.getStats();

    // Filter connections for the current user
    const userConnections = stats.connections.filter(conn => conn.userId === userId);

    const response: ApiResponse = {
      success: true,
      data: {
        userId,
        connectionCount: userConnections.length,
        connections: userConnections.map(conn => ({
          socketId: conn.socketId,
          connectedAt: conn.connectedAt,
          lastActivity: conn.lastActivity,
          rooms: conn.rooms,
        })),
        totalActiveRooms: userConnections.reduce(
          (acc, conn) => acc + conn.rooms.length,
          0
        ),
      },
    };

    return res.json(response);
  }) as any
);

/**
 * Send a test notification to the current user
 * @route POST /socket/test-notification
 * @access Authenticated users
 */
router.post(
  '/test-notification',
  requireAuth() as any,
  wrapAsync<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { message = 'Test notification from Socket.io server' } = req.body;

    socketService.sendNotificationToUser(userId, {
      type: 'info',
      title: 'Test Notification',
      message,
      data: {
        testId: Date.now(),
        source: 'api',
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Test notification sent',
        userId,
        timestamp: new Date().toISOString(),
      },
    };

    return res.json(response);
  }) as any
);

/**
 * Send a test trip update to a specific trip room
 * @route POST /socket/test-trip-update
 * @access Authenticated users
 */
router.post(
  '/test-trip-update',
  requireAuth() as any,
  wrapAsync<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const {
      tripId,
      updateType = 'trip:updated',
      message = 'Test update from API',
    } = req.body;

    if (!tripId) {
      const response: ApiResponse = {
        success: false,
        error: 'MISSING_TRIP_ID',
        message: 'tripId is required',
      };
      return res.status(400).json(response);
    }

    // Send the test update
    socketService.sendTripUpdate(tripId, updateType, {
      message,
      testId: Date.now(),
      source: 'api',
      triggeredBy: {
        id: userId,
        email: req.user!.email,
        username: req.user!.username,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Test trip update sent',
        tripId,
        updateType,
        userId,
        timestamp: new Date().toISOString(),
      },
    };

    return res.json(response);
  }) as any
);

/**
 * Get active rooms and their members
 * @route GET /socket/rooms
 * @access Admin only
 */
router.get(
  '/rooms',
  requireAdmin() as any,
  wrapAsync<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const stats = socketService.getStats();

    const response: ApiResponse = {
      success: true,
      data: {
        totalRooms: stats.totalRooms,
        rooms: stats.rooms,
        timestamp: new Date().toISOString(),
      },
    };

    return res.json(response);
  }) as any
);

/**
 * Socket.io health check endpoint
 * @route GET /socket/health
 * @access Public
 */
router.get(
  '/health',
  wrapAsync(async (req: Request, res: Response) => {
    const stats = socketService.getStats();
    const isHealthy = stats.totalConnections >= 0; // Socket.io is healthy if stats are available

    const response: ApiResponse = {
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'Socket.io',
        totalConnections: stats.totalConnections,
        totalRooms: stats.totalRooms,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(isHealthy ? 200 : 503).json(response);
  })
);

/**
 * Broadcast a notification to all connected users (Admin only)
 * @route POST /socket/broadcast
 * @access Admin only
 */
router.post(
  '/broadcast',
  requireAdmin() as any,
  wrapAsync<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const {
      type = 'info',
      title = 'System Notification',
      message,
      persistent = false,
    } = req.body;

    if (!message) {
      const response: ApiResponse = {
        success: false,
        error: 'MISSING_MESSAGE',
        message: 'message is required',
      };
      return res.status(400).json(response);
    }

    const stats = socketService.getStats();

    // Send notification to all connected users
    const userIds = [...new Set(stats.connections.map(conn => conn.userId))];

    userIds.forEach(userId => {
      socketService.sendNotificationToUser(userId, {
        type,
        title,
        message,
        persistent,
        data: {
          broadcast: true,
          adminId: req.user!.id,
          timestamp: new Date().toISOString(),
        },
      });
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Broadcast notification sent',
        recipientCount: userIds.length,
        totalConnections: stats.totalConnections,
        notification: {
          type,
          title,
          message,
          persistent,
        },
        timestamp: new Date().toISOString(),
      },
    };

    return res.json(response);
  }) as any
);

export default router;