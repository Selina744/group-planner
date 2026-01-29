/**
 * Trip controller for Group Planner API
 *
 * This controller provides complete trip management endpoints with proper
 * role-based access control, validation, and error handling.
 */

import type { Response } from 'express';
import { TripService } from '../services/index.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { log } from '../utils/logger.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import type { AuthenticatedRequest } from '../types/middleware.js';
import type {
  CreateTripRequest,
  UpdateTripRequest,
  TripListQuery,
  TripStatus,
  MemberRole,
} from '../types/trip.js';

/**
 * Trip controller class
 */
export class TripController {
  /**
   * POST /trips - Create a new trip
   */
  static async createTrip(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const tripData: CreateTripRequest = req.body;

    // Input validation
    if (!tripData.title || typeof tripData.title !== 'string') {
      throw new BadRequestError('Trip title is required and must be a string');
    }

    try {
      const result = await TripService.createTrip(user, tripData);

      log.info('Trip created via API', {
        tripId: result.trip.id,
        userId: user.id,
        title: result.trip.title,
        requestId: req.requestId,
      });

      ApiResponse.created(res, 'Trip created successfully', result);
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to create trip via API', error, {
        userId: user.id,
        tripData,
        requestId: req.requestId,
      });

      throw new Error('Failed to create trip');
    }
  }

  /**
   * GET /trips - List user's trips with filtering and pagination
   */
  static async listTrips(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    try {
      // Extract query parameters
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        status,
        role,
        startDateAfter,
        startDateBefore,
        search,
      } = req.query;

      // Build query object with proper type casting
      const query: TripListQuery = {};

      if (page && typeof page === 'string') {
        const pageNum = parseInt(page, 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          query.page = pageNum;
        }
      }

      if (limit && typeof limit === 'string') {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          query.limit = limitNum;
        }
      }

      if (sortBy && typeof sortBy === 'string') {
        const validSortFields = ['title', 'startDate', 'createdAt', 'updatedAt'];
        if (validSortFields.includes(sortBy)) {
          query.sortBy = sortBy as any;
        }
      }

      if (sortOrder && typeof sortOrder === 'string') {
        if (sortOrder === 'asc' || sortOrder === 'desc') {
          query.sortOrder = sortOrder;
        }
      }

      // Handle array parameters for status and role
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        const validStatuses = ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
        const filteredStatuses = statusArray
          .map(s => String(s))
          .filter(s => validStatuses.includes(s)) as TripStatus[];

        if (filteredStatuses.length > 0) {
          query.status = filteredStatuses;
        }
      }

      if (role) {
        const roleArray = Array.isArray(role) ? role : [role];
        const validRoles = ['HOST', 'CO_HOST', 'MEMBER'];
        const filteredRoles = roleArray
          .map(r => String(r))
          .filter(r => validRoles.includes(r)) as MemberRole[];

        if (filteredRoles.length > 0) {
          query.role = filteredRoles;
        }
      }

      if (startDateAfter && typeof startDateAfter === 'string') {
        query.startDateAfter = startDateAfter;
      }

      if (startDateBefore && typeof startDateBefore === 'string') {
        query.startDateBefore = startDateBefore;
      }

      if (search && typeof search === 'string') {
        query.search = search;
      }

      const result = await TripService.listUserTrips(user, query);

      log.debug('Trips listed via API', {
        userId: user.id,
        totalTrips: result.pagination.total,
        filters: query,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Trips retrieved successfully', result);
    } catch (error) {
      log.error('Failed to list trips via API', error, {
        userId: user.id,
        query: req.query,
        requestId: req.requestId,
      });

      throw new Error('Failed to retrieve trips');
    }
  }

  /**
   * GET /trips/:id - Get trip by ID
   */
  static async getTripById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: tripId } = req.params;
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    try {
      const trip = await TripService.getTripById(tripId, user);

      log.debug('Trip retrieved via API', {
        tripId,
        userId: user.id,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Trip retrieved successfully', trip);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to get trip via API', error, {
        tripId,
        userId: user.id,
        requestId: req.requestId,
      });

      throw new Error('Failed to retrieve trip');
    }
  }

  /**
   * PUT /trips/:id - Update trip (requires HOST or CO_HOST role)
   */
  static async updateTrip(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: tripId } = req.params;
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    const updateData: UpdateTripRequest = req.body;

    try {
      const updatedTrip = await TripService.updateTrip(tripId, user, updateData);

      log.info('Trip updated via API', {
        tripId,
        userId: user.id,
        updatedFields: Object.keys(updateData),
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Trip updated successfully', updatedTrip);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to update trip via API', error, {
        tripId,
        userId: user.id,
        updateData,
        requestId: req.requestId,
      });

      throw new Error('Failed to update trip');
    }
  }

  /**
   * DELETE /trips/:id - Delete trip (requires HOST role)
   */
  static async deleteTrip(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: tripId } = req.params;
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    try {
      await TripService.deleteTrip(tripId, user);

      log.info('Trip deleted via API', {
        tripId,
        userId: user.id,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Trip deleted successfully');
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to delete trip via API', error, {
        tripId,
        userId: user.id,
        requestId: req.requestId,
      });

      throw new Error('Failed to delete trip');
    }
  }

  /**
   * GET /trips/stats - Get trip statistics for dashboard
   */
  static async getTripStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    try {
      const stats = await TripService.getTripStats(user);

      log.debug('Trip stats retrieved via API', {
        userId: user.id,
        stats,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Trip statistics retrieved successfully', stats);
    } catch (error) {
      log.error('Failed to get trip stats via API', error, {
        userId: user.id,
        requestId: req.requestId,
      });

      throw new Error('Failed to retrieve trip statistics');
    }
  }
}

// Export the controller
export default TripController;