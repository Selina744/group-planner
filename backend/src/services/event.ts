/**
 * Event service for Group Planner API
 *
 * This service provides complete event management functionality including
 * CRUD operations, proposal/approval workflow, conflict detection, and role-based access control.
 */

import { prisma, safePrismaOperation } from '../lib/prisma.js';
import { log } from '../utils/logger.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../utils/errors.js';
import type {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  ApprovalRequest,
  EventListQuery,
  EventListResponse,
  CreateEventResponse,
  EventLocation,
  EventStatus,
  EventCategory,
  DatabaseEvent,
  DatabaseEventWithRelations,
  EventConflict,
  EventValidation,
} from '../types/event.js';
import type { UserProfile } from '../types/auth.js';
import type { MemberRole } from '../types/trip.js';

/**
 * Event transforms for converting database objects to API responses
 */
class EventTransforms {
  /**
   * Convert database event to API response
   */
  static toEvent(dbEvent: DatabaseEventWithRelations): Event {
    return {
      id: dbEvent.id,
      tripId: dbEvent.tripId,
      title: dbEvent.title,
      ...(dbEvent.description && { description: dbEvent.description }),
      ...(dbEvent.location && { location: dbEvent.location as EventLocation }),
      ...(dbEvent.startTime && { startTime: dbEvent.startTime.toISOString() }),
      ...(dbEvent.endTime && { endTime: dbEvent.endTime.toISOString() }),
      isAllDay: dbEvent.isAllDay,
      status: dbEvent.status,
      ...(dbEvent.category && { category: dbEvent.category as EventCategory }),
      ...(dbEvent.estimatedCost !== undefined && dbEvent.estimatedCost !== null && {
        estimatedCost: Number(dbEvent.estimatedCost)
      }),
      currency: dbEvent.currency,
      metadata: dbEvent.metadata as Record<string, unknown>,
      createdAt: dbEvent.createdAt.toISOString(),
      updatedAt: dbEvent.updatedAt.toISOString(),
      suggestedBy: {
        id: dbEvent.suggestedBy!.id,
        email: dbEvent.suggestedBy!.email,
        ...(dbEvent.suggestedBy?.username && { username: dbEvent.suggestedBy.username }),
        ...(dbEvent.suggestedBy?.displayName && { displayName: dbEvent.suggestedBy.displayName }),
      },
      ...(dbEvent.approvedBy && {
        approvedBy: {
          id: dbEvent.approvedBy.id,
          email: dbEvent.approvedBy.email,
          ...(dbEvent.approvedBy.username && { username: dbEvent.approvedBy.username }),
          ...(dbEvent.approvedBy.displayName && { displayName: dbEvent.approvedBy.displayName }),
        }
      }),
    };
  }
}

/**
 * Event service class
 */
export class EventService {
  /**
   * Create a new event with proposal/approval workflow
   * Members create PROPOSED events, HOST/CO_HOST create APPROVED events
   */
  static async createEvent(
    user: UserProfile,
    eventData: CreateEventRequest
  ): Promise<CreateEventResponse> {
    const {
      tripId,
      title,
      description,
      location,
      startTime,
      endTime,
      isAllDay = false,
      category,
      estimatedCost,
      currency = 'USD',
      metadata = {}
    } = eventData;

    // Validate required fields
    if (!tripId || !title) {
      throw new BadRequestError('Trip ID and title are required');
    }

    if (title.length > 200) {
      throw new BadRequestError('Event title must be less than 200 characters');
    }

    try {
      // Check trip membership and get user role
      const membership = await this.checkTripMembership(tripId, user.id);
      if (!membership) {
        throw new NotFoundError('Trip not found or access denied');
      }

      // Validate time range
      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (end <= start) {
          throw new BadRequestError('End time must be after start time');
        }
      }

      // Check for conflicts if times are specified
      let conflicts: EventConflict[] = [];
      if (startTime && endTime) {
        conflicts = await this.detectConflicts(tripId, startTime, endTime);
      }

      // Determine event status based on user role
      const status: EventStatus = (membership.role === 'HOST' || membership.role === 'CO_HOST')
        ? 'APPROVED'
        : 'PROPOSED';

      // Create event
      const result = await safePrismaOperation(async () => {
        return await prisma.event.create({
          data: {
            tripId,
            title: title.trim(),
            description: description?.trim() || null,
            location: location as any,
            startTime: startTime ? new Date(startTime) : null,
            endTime: endTime ? new Date(endTime) : null,
            isAllDay,
            status,
            category: category || null,
            estimatedCost: estimatedCost || null,
            currency,
            suggestedById: user.id,
            approvedById: status === 'APPROVED' ? user.id : null,
            metadata: metadata as any,
          },
          include: {
            suggestedBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
            approvedBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Create event');

      log.info('Event created successfully', {
        eventId: result.id,
        tripId,
        userId: user.id,
        status,
        title: result.title,
        conflictsDetected: conflicts.length,
      });

      return {
        event: EventTransforms.toEvent(result as unknown as DatabaseEventWithRelations),
      };
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to create event', error, {
        userId: user.id,
        tripId,
        eventData,
      });

      throw new Error('Failed to create event');
    }
  }

  /**
   * List events for a trip with filtering and pagination
   */
  static async listTripEvents(
    user: UserProfile,
    query: EventListQuery = {}
  ): Promise<EventListResponse> {
    const {
      tripId,
      page = 1,
      limit = 20,
      sortBy = 'startTime',
      sortOrder = 'asc',
      status,
      category,
      startTimeAfter,
      startTimeBefore,
      suggestedBy,
      search,
    } = query;

    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    // Validate pagination
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    try {
      // Check trip membership
      const membership = await this.checkTripMembership(tripId, user.id);
      if (!membership) {
        throw new NotFoundError('Trip not found or access denied');
      }

      // Build where clause
      const where: any = { tripId };

      if (status && status.length > 0) {
        where.status = { in: status };
      }

      if (category && category.length > 0) {
        where.category = { in: category };
      }

      if (startTimeAfter) {
        where.startTime = { gte: new Date(startTimeAfter) };
      }

      if (startTimeBefore) {
        where.startTime = {
          ...(where.startTime || {}),
          lte: new Date(startTimeBefore)
        };
      }

      if (suggestedBy) {
        where.suggestedById = suggestedBy;
      }

      if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        where.OR = [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      // Build order by clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [events, totalCount] = await Promise.all([
        safePrismaOperation(async () => {
          return await prisma.event.findMany({
            where,
            include: {
              suggestedBy: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  displayName: true,
                },
              },
              approvedBy: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  displayName: true,
                },
              },
            },
            orderBy,
            skip: offset,
            take: limitNum,
          });
        }, 'List trip events'),

        safePrismaOperation(async () => {
          return await prisma.event.count({ where });
        }, 'Count trip events'),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      log.debug('Events listed successfully', {
        tripId,
        userId: user.id,
        totalEvents: totalCount,
        page: pageNum,
        filters: { status, category, search },
      });

      return {
        events: events.map(event => EventTransforms.toEvent(event as unknown as DatabaseEventWithRelations)),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to list trip events', error, {
        userId: user.id,
        query,
      });

      throw new Error('Failed to retrieve events');
    }
  }

  /**
   * Get event by ID with access check
   */
  static async getEventById(eventId: string, user: UserProfile): Promise<Event> {
    if (!eventId) {
      throw new BadRequestError('Event ID is required');
    }

    try {
      const event = await safePrismaOperation(async () => {
        return await prisma.event.findUnique({
          where: { id: eventId },
          include: {
            trip: {
              select: {
                id: true,
                title: true,
              },
            },
            suggestedBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
            approvedBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Get event by ID');

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      // Check trip membership
      const membership = await this.checkTripMembership(event.tripId, user.id);
      if (!membership) {
        throw new NotFoundError('Event not found or access denied');
      }

      log.debug('Event retrieved successfully', {
        eventId,
        tripId: event.tripId,
        userId: user.id,
      });

      return EventTransforms.toEvent(event as unknown as DatabaseEventWithRelations);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to get event by ID', error, {
        eventId,
        userId: user.id,
      });

      throw new Error('Failed to retrieve event');
    }
  }

  /**
   * Update event (creator or HOST/CO_HOST can update, only if PROPOSED status)
   */
  static async updateEvent(
    eventId: string,
    user: UserProfile,
    updateData: UpdateEventRequest
  ): Promise<Event> {
    if (!eventId) {
      throw new BadRequestError('Event ID is required');
    }

    // Validate update data
    if (updateData.title !== undefined && (!updateData.title || updateData.title.trim().length === 0)) {
      throw new BadRequestError('Event title cannot be empty');
    }

    if (updateData.title && updateData.title.length > 200) {
      throw new BadRequestError('Event title must be less than 200 characters');
    }

    if (updateData.startTime && updateData.endTime) {
      const start = new Date(updateData.startTime);
      const end = new Date(updateData.endTime);

      if (end <= start) {
        throw new BadRequestError('End time must be after start time');
      }
    }

    try {
      // Get event and check permissions
      const event = await safePrismaOperation(async () => {
        return await prisma.event.findUnique({
          where: { id: eventId },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId: user.id, status: 'CONFIRMED' },
                },
              },
            },
          },
        });
      }, 'Get event for update');

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      const membership = event.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Event not found or access denied');
      }

      // Check update permissions
      const canUpdate =
        event.suggestedById === user.id || // Creator can update
        membership.role === 'HOST' ||      // Host can update
        membership.role === 'CO_HOST';     // Co-host can update

      if (!canUpdate) {
        throw new ForbiddenError('Insufficient permissions to update event');
      }

      // Cannot update approved events unless you're HOST/CO_HOST
      if (event.status === 'APPROVED' &&
          event.suggestedById === user.id &&
          membership.role === 'MEMBER') {
        throw new ForbiddenError('Cannot modify approved events');
      }

      // Check for conflicts if updating times
      if ((updateData.startTime || updateData.endTime) && event.startTime && event.endTime) {
        const newStartTime = updateData.startTime || event.startTime.toISOString();
        const newEndTime = updateData.endTime || event.endTime.toISOString();

        const conflicts = await this.detectConflicts(event.tripId, newStartTime, newEndTime, eventId);
        if (conflicts.length > 0) {
          log.warn('Event time conflicts detected during update', {
            eventId,
            conflicts: conflicts.length,
          });
          // Could throw error or just log warning depending on business rules
        }
      }

      // Build update data
      const dbUpdateData: any = {};

      if (updateData.title !== undefined) {
        dbUpdateData.title = updateData.title.trim();
      }

      if (updateData.description !== undefined) {
        dbUpdateData.description = updateData.description?.trim() || null;
      }

      if (updateData.location !== undefined) {
        dbUpdateData.location = updateData.location;
      }

      if (updateData.startTime !== undefined) {
        dbUpdateData.startTime = updateData.startTime ? new Date(updateData.startTime) : null;
      }

      if (updateData.endTime !== undefined) {
        dbUpdateData.endTime = updateData.endTime ? new Date(updateData.endTime) : null;
      }

      if (updateData.isAllDay !== undefined) {
        dbUpdateData.isAllDay = updateData.isAllDay;
      }

      if (updateData.category !== undefined) {
        dbUpdateData.category = updateData.category;
      }

      if (updateData.estimatedCost !== undefined) {
        dbUpdateData.estimatedCost = updateData.estimatedCost;
      }

      if (updateData.currency !== undefined) {
        dbUpdateData.currency = updateData.currency;
      }

      if (updateData.metadata !== undefined) {
        dbUpdateData.metadata = updateData.metadata;
      }

      // Update event
      const updatedEvent = await safePrismaOperation(async () => {
        return await prisma.event.update({
          where: { id: eventId },
          data: dbUpdateData,
          include: {
            suggestedBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
            approvedBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Update event');

      log.info('Event updated successfully', {
        eventId,
        tripId: event.tripId,
        userId: user.id,
        updatedFields: Object.keys(dbUpdateData),
      });

      return EventTransforms.toEvent(updatedEvent as unknown as DatabaseEventWithRelations);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to update event', error, {
        eventId,
        userId: user.id,
        updateData,
      });

      throw new Error('Failed to update event');
    }
  }

  /**
   * Approve or cancel event (requires HOST or CO_HOST role)
   */
  static async updateEventStatus(
    eventId: string,
    user: UserProfile,
    approvalData: ApprovalRequest
  ): Promise<Event> {
    if (!eventId) {
      throw new BadRequestError('Event ID is required');
    }

    const { status, reason } = approvalData;

    if (status !== 'APPROVED' && status !== 'CANCELLED') {
      throw new BadRequestError('Status must be APPROVED or CANCELLED');
    }

    try {
      // Get event and check permissions
      const event = await safePrismaOperation(async () => {
        return await prisma.event.findUnique({
          where: { id: eventId },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId: user.id, status: 'CONFIRMED' },
                },
              },
            },
          },
        });
      }, 'Get event for status update');

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      const membership = event.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Event not found or access denied');
      }

      // Check approval permissions (only HOST/CO_HOST can approve/cancel)
      if (membership.role !== 'HOST' && membership.role !== 'CO_HOST') {
        throw new ForbiddenError('Only hosts and co-hosts can approve or cancel events');
      }

      // Cannot approve already approved events
      if (event.status === 'APPROVED' && status === 'APPROVED') {
        throw new BadRequestError('Event is already approved');
      }

      // Build update data
      const updateData: any = {
        status,
        approvedById: user.id,
      };

      // Add reason to metadata if provided for cancellation
      if (status === 'CANCELLED' && reason) {
        updateData.metadata = {
          ...(event.metadata as any || {}),
          cancellationReason: reason,
          cancelledAt: new Date().toISOString(),
        };
      }

      // Update event status
      const updatedEvent = await safePrismaOperation(async () => {
        return await prisma.event.update({
          where: { id: eventId },
          data: updateData,
          include: {
            suggestedBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
            approvedBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Update event status');

      log.info('Event status updated successfully', {
        eventId,
        tripId: event.tripId,
        userId: user.id,
        oldStatus: event.status,
        newStatus: status,
      });

      return EventTransforms.toEvent(updatedEvent as unknown as DatabaseEventWithRelations);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to update event status', error, {
        eventId,
        userId: user.id,
        approvalData,
      });

      throw new Error('Failed to update event status');
    }
  }

  /**
   * Delete event (creator or HOST can delete)
   */
  static async deleteEvent(eventId: string, user: UserProfile): Promise<void> {
    if (!eventId) {
      throw new BadRequestError('Event ID is required');
    }

    try {
      // Get event and check permissions
      const event = await safePrismaOperation(async () => {
        return await prisma.event.findUnique({
          where: { id: eventId },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId: user.id, status: 'CONFIRMED' },
                },
              },
            },
          },
        });
      }, 'Get event for deletion');

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      const membership = event.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Event not found or access denied');
      }

      // Check delete permissions
      const canDelete =
        event.suggestedById === user.id || // Creator can delete
        membership.role === 'HOST';        // Host can delete

      if (!canDelete) {
        throw new ForbiddenError('Insufficient permissions to delete event');
      }

      // Delete event
      await safePrismaOperation(async () => {
        await prisma.event.delete({
          where: { id: eventId },
        });
      }, 'Delete event');

      log.info('Event deleted successfully', {
        eventId,
        tripId: event.tripId,
        userId: user.id,
        title: event.title,
      });
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to delete event', error, {
        eventId,
        userId: user.id,
      });

      throw new Error('Failed to delete event');
    }
  }

  /**
   * Detect scheduling conflicts for an event
   */
  private static async detectConflicts(
    tripId: string,
    startTime: string,
    endTime: string,
    excludeEventId?: string
  ): Promise<EventConflict[]> {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);

      const conflictingEvents = await safePrismaOperation(async () => {
        return await prisma.event.findMany({
          where: {
            tripId,
            status: { in: ['PROPOSED', 'APPROVED'] }, // Don't check against cancelled events
            ...(excludeEventId && { id: { not: excludeEventId } }),
            OR: [
              // Event starts during this time range
              {
                startTime: { gte: start, lt: end },
              },
              // Event ends during this time range
              {
                endTime: { gt: start, lte: end },
              },
              // Event completely encompasses this time range
              {
                startTime: { lte: start },
                endTime: { gte: end },
              },
            ],
          },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
          },
        });
      }, 'Detect event conflicts');

      return conflictingEvents.map(conflictEvent => {
        const overlapStart = new Date(Math.max(start.getTime(), conflictEvent.startTime!.getTime()));
        const overlapEnd = new Date(Math.min(end.getTime(), conflictEvent.endTime!.getTime()));

        // Determine conflict severity
        const eventDuration = end.getTime() - start.getTime();
        const overlapDuration = overlapEnd.getTime() - overlapStart.getTime();
        const overlapPercentage = overlapDuration / eventDuration;

        let severity: 'MINOR' | 'MAJOR' | 'COMPLETE';
        if (overlapPercentage >= 0.9) {
          severity = 'COMPLETE';
        } else if (overlapPercentage >= 0.5) {
          severity = 'MAJOR';
        } else {
          severity = 'MINOR';
        }

        return {
          conflictingEventId: conflictEvent.id,
          conflictingEventTitle: conflictEvent.title,
          overlapStart: overlapStart.toISOString(),
          overlapEnd: overlapEnd.toISOString(),
          severity,
        };
      });
    } catch (error) {
      log.error('Failed to detect event conflicts', error, {
        tripId,
        startTime,
        endTime,
        excludeEventId,
      });
      return []; // Return empty array on error to not block event creation
    }
  }

  /**
   * Check if user is a member of the trip and get their role
   */
  private static async checkTripMembership(tripId: string, userId: string): Promise<{
    role: MemberRole;
    status: string;
  } | null> {
    try {
      const membership = await safePrismaOperation(async () => {
        return await prisma.tripMember.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId,
            },
          },
          select: {
            role: true,
            status: true,
          },
        });
      }, 'Check trip membership');

      if (!membership || membership.status !== 'CONFIRMED') {
        return null;
      }

      return {
        role: membership.role as MemberRole,
        status: membership.status,
      };
    } catch (error) {
      log.error('Failed to check trip membership', error, {
        tripId,
        userId,
      });
      return null;
    }
  }
}

// Export the service
export default EventService;