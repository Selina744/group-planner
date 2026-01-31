/**
 * Trip routes for Group Planner API
 *
 * This module provides complete trip management routes using the
 * trip controller and proper middleware for authentication and authorization.
 */

import express from 'express';
import { TripController } from '../controllers/trip.js';
import { wrapAsync, wrapAsyncMiddleware } from '../utils/wrapAsync.js';
import {
  middlewarePresets,
  requireHost,
  requireHostOrCoHost,
  requireMember,
  validation,
  type AuthenticatedRequest,
} from '../middleware/index.js';

const router: express.Router = express.Router();

/**
 * POST /trips - Create a new trip
 * Authentication: Required
 * Authorization: Any authenticated user (becomes HOST)
 */
router.post(
  '/',
  ...(middlewarePresets.protected as any),
  wrapAsyncMiddleware(validation.schemas.createTripSchema()),
  wrapAsync<AuthenticatedRequest>(TripController.createTrip) as any
);

/**
 * GET /trips - List user's trips with filtering and pagination
 * Authentication: Required
 * Authorization: Returns only user's own trips
 */
router.get(
  '/',
  ...(middlewarePresets.protected as any),
  wrapAsyncMiddleware(validation.common.pagination()),
  wrapAsync<AuthenticatedRequest>(TripController.listTrips) as any
);

/**
 * GET /trips/stats - Get trip statistics for dashboard
 * Authentication: Required
 * Authorization: Returns user's own statistics
 */
router.get(
  '/stats',
  ...(middlewarePresets.protected as any),
  wrapAsync<AuthenticatedRequest>(TripController.getTripStats) as any
);

/**
 * GET /trips/:id - Get trip by ID
 * Authentication: Required
 * Authorization: Must be confirmed member of trip
 */
router.get(
  '/:id',
  ...(middlewarePresets.protected as any),
  wrapAsyncMiddleware(validation.common.uuidParam('id')),
  requireMember() as any,
  wrapAsync<AuthenticatedRequest>(TripController.getTripById) as any
);

/**
 * PUT /trips/:id - Update trip
 * Authentication: Required
 * Authorization: Must be HOST or CO_HOST
 */
router.put(
  '/:id',
  ...(middlewarePresets.protected as any),
  wrapAsyncMiddleware(validation.common.uuidParam('id')),
  requireHostOrCoHost() as any,
  wrapAsyncMiddleware(validation.schemas.updateTripSchema()),
  wrapAsync<AuthenticatedRequest>(TripController.updateTrip) as any
);

/**
 * DELETE /trips/:id - Delete trip
 * Authentication: Required
 * Authorization: Must be HOST
 */
router.delete(
  '/:id',
  ...(middlewarePresets.protected as any),
  wrapAsyncMiddleware(validation.common.uuidParam('id')),
  requireHost() as any,
  wrapAsync<AuthenticatedRequest>(TripController.deleteTrip) as any
);

export default router;