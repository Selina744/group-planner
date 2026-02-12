/**
 * Trip routes for Group Planner API
 *
 * This module provides complete trip management routes using the
 * trip controller and proper middleware for authentication and authorization.
 */

import express, { type Response } from 'express';
import { TripController } from '../controllers/trip.js';
import { wrapAsync } from '../utils/wrapAsync.js';
import {
  middlewarePresets,
  middleware,
  type AuthenticatedRequest,
} from '../middleware/index.js';
import { TripService } from '../services/index.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router: express.Router = express.Router();

// Temporary inline auth function to replace problematic requireAuth middleware
async function authenticateRequest(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  const token = req.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return false;
  }

  try {
    const { AuthService } = await import('../services/index.js');
    const { JwtService } = await import('../services/jwt.js');

    const verification = JwtService.verifyAccessToken(token);
    if (!verification.valid || !verification.payload) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return false;
    }

    const user = await AuthService.getUserById(verification.payload.sub);
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return false;
    }

    // Set user in request for controller
    req.user = user;
    req.auth = { user, isAuthenticated: true };
    return true;
  } catch (error) {
    res.status(401).json({ success: false, message: 'Authentication failed' });
    return false;
  }
}

// Helper function to check trip permissions
async function checkTripPermissions(tripId: string, userId: string, requiredRoles: string[]): Promise<{ hasPermission: boolean; userRole?: string; tripExists: boolean }> {
  try {
    const { prisma } = await import('../lib/prisma.js');

    // First check if trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    });

    if (!trip) {
      return { hasPermission: false, tripExists: false };
    }

    const membership = await prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId
        }
      }
    });

    if (!membership || membership.status !== 'CONFIRMED') {
      return { hasPermission: false, tripExists: true };
    }

    const hasPermission = requiredRoles.includes(membership.role);
    return { hasPermission, userRole: membership.role, tripExists: true };
  } catch (error) {
    return { hasPermission: false, tripExists: true };
  }
}

/**
 * POST /trips - Create a new trip
 * Authentication: Required
 * Authorization: Any authenticated user (becomes HOST)
 */
router.post(
  '/',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(async (req, res): Promise<void> => {
    const isAuthenticated = await authenticateRequest(req, res);
    if (!isAuthenticated) return;

    await TripController.createTrip(req, res);
  }) as any
);

/**
 * POST /trips/join - Join a trip using an invite code
 * Authentication: Required
 * Authorization: Any authenticated user
 */
router.post(
  '/join',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(async (req, res): Promise<void> => {
    const isAuthenticated = await authenticateRequest(req, res);
    if (!isAuthenticated) return;

    const { inviteCode } = req.body;

    if (!inviteCode) {
      res.status(400).json({ success: false, message: 'Invite code is required' });
      return;
    }

    const result = await TripService.joinTripByCode(req.user!, inviteCode);

    ApiResponse.success(res, 'Successfully joined the trip', {
      trip: {
        id: result.trip.id,
        title: result.trip.title,
      },
      membership: result.membership,
    });
  }) as any
);

/**
 * GET /trips - List user's trips with filtering and pagination
 * Authentication: Required
 * Authorization: Returns only user's own trips
 */
router.get(
  '/',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(async (req, res): Promise<void> => {
    const isAuthenticated = await authenticateRequest(req, res);
    if (!isAuthenticated) return;

    await TripController.listTrips(req, res);
  }) as any
);

/**
 * GET /trips/stats - Get trip statistics for dashboard
 * Authentication: Required
 * Authorization: Returns user's own statistics
 */
router.get(
  '/stats',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(async (req, res): Promise<void> => {
    const isAuthenticated = await authenticateRequest(req, res);
    if (!isAuthenticated) return;

    await TripController.getTripStats(req, res);
  }) as any
);

/**
 * GET /trips/:id - Get trip by ID
 * Authentication: Required
 * Authorization: Must be confirmed member of trip
 */
router.get(
  '/:id',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(async (req, res): Promise<void> => {
    const isAuthenticated = await authenticateRequest(req, res);
    if (!isAuthenticated) return;

    await TripController.getTripById(req, res);
  }) as any
);

/**
 * GET /trips/:id/members - Get trip members
 * Authentication: Required
 * Authorization: Must be confirmed member of trip
 */
router.get(
  '/:id/members',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(async (req, res): Promise<void> => {
    const isAuthenticated = await authenticateRequest(req, res);
    if (!isAuthenticated) return;

    const tripId = req.params.id;
    if (!tripId) {
      res.status(400).json({ success: false, message: 'Trip ID is required' });
      return;
    }

    const result = await TripService.getTripMembers(tripId, req.user!);

    ApiResponse.success(res, 'Trip members retrieved successfully', result);
  }) as any
);

/**
 * PUT /trips/:id - Update trip
 * Authentication: Required
 * Authorization: Must be HOST or CO_HOST
 */
router.put(
  '/:id',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(async (req, res): Promise<void> => {
    const isAuthenticated = await authenticateRequest(req, res);
    if (!isAuthenticated) return;

    const tripId = req.params.id;
    if (!tripId) {
      res.status(400).json({ success: false, message: 'Trip ID is required' });
      return;
    }

    const userId = req.user!.id;

    // Check if user has HOST or CO_HOST role for update permissions
    const { hasPermission, tripExists } = await checkTripPermissions(tripId, userId, ['HOST', 'CO_HOST']);
    if (!tripExists) {
      res.status(404).json({ success: false, message: 'Trip not found' });
      return;
    }
    if (!hasPermission) {
      res.status(403).json({ success: false, message: 'Only trip hosts and co-hosts can update trips' });
      return;
    }

    await TripController.updateTrip(req, res);
  }) as any
);

/**
 * DELETE /trips/:id - Delete trip
 * Authentication: Required
 * Authorization: Must be HOST
 */
router.delete(
  '/:id',
  middleware.context as any,
  wrapAsync<AuthenticatedRequest>(async (req, res): Promise<void> => {
    const isAuthenticated = await authenticateRequest(req, res);
    if (!isAuthenticated) return;

    const tripId = req.params.id;
    if (!tripId) {
      res.status(400).json({ success: false, message: 'Trip ID is required' });
      return;
    }

    const userId = req.user!.id;

    // Check if user has HOST role for delete permissions
    const { hasPermission, tripExists } = await checkTripPermissions(tripId, userId, ['HOST']);
    if (!tripExists) {
      res.status(404).json({ success: false, message: 'Trip not found' });
      return;
    }
    if (!hasPermission) {
      res.status(403).json({ success: false, message: 'Only trip hosts can delete trips' });
      return;
    }

    await TripController.deleteTrip(req, res);
  }) as any
);

export default router;
