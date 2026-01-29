/**
 * Event controller for Group Planner API
 *
 * This controller provides complete event management endpoints with proper
 * role-based access control, proposal/approval workflow, and conflict detection.
 */

import type { Response } from 'express';
import { EventService } from '../services/event.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { log } from '../utils/logger.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import type { AuthenticatedRequest } from '../types/middleware.js';
import type {
  CreateEventRequest,
  UpdateEventRequest,
  ApprovalRequest,
  EventListQuery,
  EventStatus,
  EventCategory,
} from '../types/event.js';

/**
 * Event controller class
 */
export class EventController {
  /**
   * POST /events - Create a new event
   */
  static async createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const eventData: CreateEventRequest = req.body;

    // Input validation
    if (!eventData.tripId || typeof eventData.tripId !== 'string') {
      throw new BadRequestError('Trip ID is required and must be a string');
    }

    if (!eventData.title || typeof eventData.title !== 'string') {
      throw new BadRequestError('Event title is required and must be a string');
    }

    try {
      const result = await EventService.createEvent(user, eventData);

      log.info('Event created via API', {
        eventId: result.event.id,
        tripId: eventData.tripId,
        userId: user.id,
        status: result.event.status,
        title: result.event.title,
        requestId: req.requestId,
      });

      ApiResponse.created(res, 'Event created successfully', result);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to create event via API', error, {
        userId: user.id,
        eventData,
        requestId: req.requestId,
      });

      throw new Error('Failed to create event');
    }
  }

  /**
   * GET /events - List events with filtering and pagination
   */
  static async listEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    try {
      // Extract query parameters
      const {
        tripId,
        page,
        limit,
        sortBy,
        sortOrder,
        status,
        category,
        startTimeAfter,
        startTimeBefore,
        suggestedBy,
        search,
      } = req.query;

      // Trip ID is required for listing events
      if (!tripId || typeof tripId !== 'string') {
        throw new BadRequestError('Trip ID is required');
      }

      // Build query object with proper type casting
      const query: EventListQuery = { tripId };

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
        const validSortFields = ['title', 'startTime', 'createdAt', 'updatedAt'];
        if (validSortFields.includes(sortBy)) {
          query.sortBy = sortBy as any;
        }
      }

      if (sortOrder && typeof sortOrder === 'string') {
        if (sortOrder === 'asc' || sortOrder === 'desc') {
          query.sortOrder = sortOrder;
        }
      }

      // Handle array parameters for status and category
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        const validStatuses = ['PROPOSED', 'APPROVED', 'CANCELLED'];
        const filteredStatuses = statusArray
          .map(s => String(s))
          .filter(s => validStatuses.includes(s)) as EventStatus[];

        if (filteredStatuses.length > 0) {
          query.status = filteredStatuses;
        }
      }

      if (category) {
        const categoryArray = Array.isArray(category) ? category : [category];
        const validCategories = ['ACCOMMODATION', 'TRANSPORTATION', 'ACTIVITY', 'DINING', 'MEETING', 'OTHER'];
        const filteredCategories = categoryArray
          .map(c => String(c))
          .filter(c => validCategories.includes(c)) as EventCategory[];

        if (filteredCategories.length > 0) {
          query.category = filteredCategories;
        }
      }

      if (startTimeAfter && typeof startTimeAfter === 'string') {
        query.startTimeAfter = startTimeAfter;
      }

      if (startTimeBefore && typeof startTimeBefore === 'string') {
        query.startTimeBefore = startTimeBefore;
      }

      if (suggestedBy && typeof suggestedBy === 'string') {
        query.suggestedBy = suggestedBy;
      }

      if (search && typeof search === 'string') {
        query.search = search;
      }

      const result = await EventService.listTripEvents(user, query);

      log.debug('Events listed via API', {
        tripId,
        userId: user.id,
        totalEvents: result.pagination.total,
        filters: query,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Events retrieved successfully', result);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to list events via API', error, {
        userId: user.id,
        query: req.query,
        requestId: req.requestId,
      });

      throw new Error('Failed to retrieve events');
    }
  }

  /**
   * GET /events/:id - Get event by ID
   */
  static async getEventById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: eventId } = req.params;
    if (!eventId) {
      throw new BadRequestError('Event ID is required');
    }

    try {
      const event = await EventService.getEventById(eventId, user);

      log.debug('Event retrieved via API', {
        eventId,
        tripId: event.tripId,
        userId: user.id,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Event retrieved successfully', event);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to get event via API', error, {
        eventId,
        userId: user.id,
        requestId: req.requestId,
      });

      throw new Error('Failed to retrieve event');
    }
  }

  /**
   * PUT /events/:id - Update event
   */
  static async updateEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: eventId } = req.params;
    if (!eventId) {
      throw new BadRequestError('Event ID is required');
    }

    const updateData: UpdateEventRequest = req.body;

    try {
      const updatedEvent = await EventService.updateEvent(eventId, user, updateData);

      log.info('Event updated via API', {
        eventId,
        tripId: updatedEvent.tripId,
        userId: user.id,
        updatedFields: Object.keys(updateData),
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Event updated successfully', updatedEvent);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to update event via API', error, {
        eventId,
        userId: user.id,
        updateData,
        requestId: req.requestId,
      });

      throw new Error('Failed to update event');
    }
  }

  /**
   * PUT /events/:id/approve - Approve or cancel event (HOST/CO_HOST only)
   */
  static async updateEventStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: eventId } = req.params;
    if (!eventId) {
      throw new BadRequestError('Event ID is required');
    }

    const approvalData: ApprovalRequest = req.body;

    // Input validation
    if (!approvalData.status || (approvalData.status !== 'APPROVED' && approvalData.status !== 'CANCELLED')) {
      throw new BadRequestError('Status must be APPROVED or CANCELLED');
    }

    try {
      const updatedEvent = await EventService.updateEventStatus(eventId, user, approvalData);

      log.info('Event status updated via API', {
        eventId,
        tripId: updatedEvent.tripId,
        userId: user.id,
        newStatus: approvalData.status,
        reason: approvalData.reason,
        requestId: req.requestId,
      });

      const message = approvalData.status === 'APPROVED'
        ? 'Event approved successfully'
        : 'Event cancelled successfully';

      ApiResponse.success(res, message, updatedEvent);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to update event status via API', error, {
        eventId,
        userId: user.id,
        approvalData,
        requestId: req.requestId,
      });

      throw new Error('Failed to update event status');
    }
  }

  /**
   * DELETE /events/:id - Delete event
   */
  static async deleteEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: eventId } = req.params;
    if (!eventId) {
      throw new BadRequestError('Event ID is required');
    }

    try {
      await EventService.deleteEvent(eventId, user);

      log.info('Event deleted via API', {
        eventId,
        userId: user.id,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Event deleted successfully');
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to delete event via API', error, {
        eventId,
        userId: user.id,
        requestId: req.requestId,
      });

      throw new Error('Failed to delete event');
    }
  }
}

// Export the controller
export default EventController;