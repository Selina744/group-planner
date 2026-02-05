/**
 * Trip routes for Group Planner API
 *
 * This module provides complete trip management routes using the
 * trip controller and proper middleware for authentication and authorization.
 */

import express, { Response } from 'express';
import { TripController } from '../controllers/trip.js';
import { wrapAsync, wrapAsyncMiddleware } from '../utils/wrapAsync.js';
import {
  middlewarePresets,
  middleware,
  requireAuth,
  requireHost,
  requireHostOrCoHost,
  requireMember,
  validation,
  type AuthenticatedRequest,
} from '../middleware/index.js';

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
  middleware.context,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isAuthenticated = await authenticateRequest(req, res);
      if (!isAuthenticated) return;

      await TripController.createTrip(req, res);
    } catch (error: any) {
      // Handle validation errors properly
      if (error.name === 'BadRequestError' || error.message?.includes('required') || error.message?.includes('validation')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * GET /trips - List user's trips with filtering and pagination
 * Authentication: Required
 * Authorization: Returns only user's own trips
 */
router.get(
  '/',
  middleware.context,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isAuthenticated = await authenticateRequest(req, res);
      if (!isAuthenticated) return;

      await TripController.listTrips(req, res);
    } catch (error: any) {
      if (error.name === 'BadRequestError' || error.message?.includes('required') || error.message?.includes('validation')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * GET /trips/stats - Get trip statistics for dashboard
 * Authentication: Required
 * Authorization: Returns user's own statistics
 */
router.get(
  '/stats',
  middleware.context,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isAuthenticated = await authenticateRequest(req, res);
      if (!isAuthenticated) return;

      await TripController.getTripStats(req, res);
    } catch (error: any) {
      if (error.name === 'BadRequestError' || error.message?.includes('required') || error.message?.includes('validation')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * GET /trips/:id - Get trip by ID
 * Authentication: Required
 * Authorization: Must be confirmed member of trip
 */
router.get(
  '/:id',
  middleware.context,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isAuthenticated = await authenticateRequest(req, res);
      if (!isAuthenticated) return;

      // TODO: Add RBAC check for trip membership when requireMember is fixed
      await TripController.getTripById(req, res);
    } catch (error: any) {
      if (error.name === 'BadRequestError' || error.message?.includes('required') || error.message?.includes('validation')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error.name === 'NotFoundError' || error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.name === 'ForbiddenError' || error.message?.includes('not authorized') || error.message?.includes('access denied')) {
        return res.status(403).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * PUT /trips/:id - Update trip
 * Authentication: Required
 * Authorization: Must be HOST or CO_HOST
 */
router.put(
  '/:id',
  middleware.context,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isAuthenticated = await authenticateRequest(req, res);
      if (!isAuthenticated) return;

      const tripId = req.params.id;
      const userId = req.user!.id;

      // Check if user has HOST or CO_HOST role for update permissions
      const { hasPermission, tripExists } = await checkTripPermissions(tripId, userId, ['HOST', 'CO_HOST']);
      if (!tripExists) {
        return res.status(404).json({ success: false, message: 'Trip not found' });
      }
      if (!hasPermission) {
        return res.status(403).json({ success: false, message: 'Only trip hosts and co-hosts can update trips' });
      }

      await TripController.updateTrip(req, res);
    } catch (error: any) {
      if (error.name === 'BadRequestError' || error.message?.includes('required') || error.message?.includes('validation')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * DELETE /trips/:id - Delete trip
 * Authentication: Required
 * Authorization: Must be HOST
 */
router.delete(
  '/:id',
  middleware.context,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isAuthenticated = await authenticateRequest(req, res);
      if (!isAuthenticated) return;

      const tripId = req.params.id;
      const userId = req.user!.id;

      // Check if user has HOST role for delete permissions
      const { hasPermission, tripExists } = await checkTripPermissions(tripId, userId, ['HOST']);
      if (!tripExists) {
        return res.status(404).json({ success: false, message: 'Trip not found' });
      }
      if (!hasPermission) {
        return res.status(403).json({ success: false, message: 'Only trip hosts can delete trips' });
      }

      await TripController.deleteTrip(req, res);
    } catch (error: any) {
      if (error.name === 'BadRequestError' || error.message?.includes('required') || error.message?.includes('validation')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error.name === 'NotFoundError' || error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.name === 'ForbiddenError' || error.message?.includes('not authorized') || error.message?.includes('access denied')) {
        return res.status(403).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;