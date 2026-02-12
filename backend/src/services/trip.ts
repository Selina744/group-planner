/**
 * Trip service for Group Planner API
 *
 * This service provides complete trip management functionality including
 * CRUD operations, membership management, and role-based access control.
 */

import crypto from 'crypto';
import { prisma, safePrismaOperation } from '../lib/prisma.js';
import { log } from '../utils/logger.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../utils/errors.js';
import type {
  Trip,
  TripMember,
  CreateTripRequest,
  UpdateTripRequest,
  TripListQuery,
  TripListResponse,
  CreateTripResponse,
  TripLocation,
  TripStatus,
  MemberRole,
  MemberStatus,
  DatabaseTrip,
  DatabaseTripMember,
} from '../types/trip.js';
import type { UserProfile } from '../types/auth.js';

/**
 * Trip transforms for converting database objects to API responses
 */
class TripTransforms {
  /**
   * Convert database trip to API response
   */
  static toTrip(dbTrip: DatabaseTrip, memberCount?: number, userMembership?: any): Trip {
    return {
      id: dbTrip.id,
      title: dbTrip.title,
      ...(dbTrip.description && { description: dbTrip.description }),
      status: dbTrip.status,
      ...(dbTrip.location && { location: dbTrip.location as TripLocation }),
      inviteCode: dbTrip.inviteCode,
      metadata: dbTrip.metadata as Record<string, unknown>,
      ...(dbTrip.startDate && { startDate: dbTrip.startDate.toISOString() }),
      ...(dbTrip.endDate && { endDate: dbTrip.endDate.toISOString() }),
      createdAt: dbTrip.createdAt.toISOString(),
      updatedAt: dbTrip.updatedAt.toISOString(),
      memberCount: memberCount || 0,
      ...(userMembership && {
        userMembership: {
          role: userMembership.role,
          status: userMembership.status,
          canInvite: userMembership.canInvite,
        }
      }),
    };
  }

  /**
   * Convert database trip member to API response
   */
  static toTripMember(dbMember: DatabaseTripMember): TripMember {
    return {
      tripId: dbMember.tripId,
      userId: dbMember.userId,
      role: dbMember.role as MemberRole,
      status: dbMember.status as MemberStatus,
      notifications: dbMember.notifications,
      canInvite: dbMember.canInvite,
      createdAt: dbMember.createdAt.toISOString(),
      updatedAt: dbMember.updatedAt.toISOString(),
      user: {
        id: dbMember.user?.id || '',
        email: dbMember.user?.email || '',
        ...(dbMember.user?.username && { username: dbMember.user.username }),
        ...(dbMember.user?.displayName && { displayName: dbMember.user.displayName }),
      },
    };
  }
}

/**
 * Trip service class
 */
export class TripService {
  /**
   * Create a new trip with the creator as HOST
   */
  static async createTrip(
    user: UserProfile,
    tripData: CreateTripRequest
  ): Promise<CreateTripResponse> {
    const { title, description, location, startDate, endDate, metadata } = tripData;

    // Validate required fields
    if (!title || title.trim().length === 0) {
      throw new BadRequestError('Trip title is required');
    }

    if (title.length > 200) {
      throw new BadRequestError('Trip title must be less than 200 characters');
    }

    // Validate date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        throw new BadRequestError('End date must be after start date');
      }
    }

    try {
      // Generate unique invite code
      const inviteCode = this.generateInviteCode();

      // Create trip and membership in transaction
      const result = await safePrismaOperation(async () => {
        // Create the trip
        const trip = await prisma.trip.create({
          data: {
            title: title.trim(),
            description: description?.trim() || null,
            status: 'PLANNING',
            location: location as any,
            inviteCode,
            metadata: metadata as any || {},
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
          },
        });

        // Create HOST membership for creator
        const membership = await prisma.tripMember.create({
          data: {
            tripId: trip.id,
            userId: user.id,
            role: 'HOST',
            status: 'CONFIRMED',
            notifications: true,
            canInvite: true,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });

        return { trip, membership };
      }, 'Create trip with membership');

      log.info('Trip created successfully', {
        tripId: result.trip.id,
        hostUserId: user.id,
        title: result.trip.title,
      });

      // Broadcast trip creation to other services (if needed in future)
      // For now, we don't broadcast trip creation since it's a private action

      return {
        trip: TripTransforms.toTrip(result.trip as DatabaseTrip, 1, result.membership),
        membership: TripTransforms.toTripMember(result.membership as DatabaseTripMember),
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      // Handle unique constraint violation for invite code
      if ((error as any)?.code === 'P2002') {
        // Retry with new invite code
        return this.createTrip(user, tripData);
      }

      log.error('Failed to create trip', error, {
        userId: user.id,
        tripData,
      });

      throw new Error('Failed to create trip');
    }
  }

  /**
   * List trips for a user with filtering and pagination
   */
  static async listUserTrips(
    user: UserProfile,
    query: TripListQuery = {}
  ): Promise<TripListResponse> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      status,
      role,
      startDateAfter,
      startDateBefore,
      search,
    } = query;

    // Validate pagination
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    try {
      // Build where clause for trip member filtering
      const memberWhere: any = {
        userId: user.id,
        status: 'CONFIRMED', // Only show confirmed memberships
      };

      if (role && role.length > 0) {
        memberWhere.role = { in: role };
      }

      // Build where clause for trips
      const tripWhere: any = {};

      if (status && status.length > 0) {
        tripWhere.status = { in: status };
      }

      if (startDateAfter) {
        tripWhere.startDate = { gte: new Date(startDateAfter) };
      }

      if (startDateBefore) {
        tripWhere.startDate = {
          ...(tripWhere.startDate || {}),
          lte: new Date(startDateBefore)
        };
      }

      if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        tripWhere.OR = [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      // Build order by clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [tripMembers, totalCount] = await Promise.all([
        safePrismaOperation(async () => {
          return await prisma.tripMember.findMany({
            where: memberWhere,
            include: {
              trip: {
                include: {
                  _count: {
                    select: {
                      members: {
                        where: { status: 'CONFIRMED' },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              trip: orderBy,
            },
            skip: offset,
            take: limitNum,
          });
        }, 'List user trips'),

        safePrismaOperation(async () => {
          return await prisma.tripMember.count({
            where: {
              ...memberWhere,
              trip: tripWhere,
            },
          });
        }, 'Count user trips'),
      ]);

      // Filter out trip members where trip doesn't match criteria
      const validTripMembers = tripMembers.filter(member => (member as any).trip);

      const trips = validTripMembers.map(member => {
        const trip = TripTransforms.toTrip(
          (member as any).trip as DatabaseTrip,
          (member as any).trip._count.members,
          {
            role: member.role,
            status: member.status,
            canInvite: member.canInvite,
          }
        );
        return trip;
      });

      const totalPages = Math.ceil(totalCount / limitNum);

      log.debug('User trips listed successfully', {
        userId: user.id,
        totalTrips: totalCount,
        page: pageNum,
        filters: { status, role, search },
      });

      return {
        trips,
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
      log.error('Failed to list user trips', error, {
        userId: user.id,
        query,
      });

      throw new Error('Failed to retrieve trips');
    }
  }

  /**
   * Get trip by ID with member access check
   */
  static async getTripById(tripId: string, user: UserProfile): Promise<Trip> {
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    try {
      // Check membership and get trip data
      const membership = await safePrismaOperation(async () => {
        return await prisma.tripMember.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId: user.id,
            },
          },
          include: {
            trip: {
              include: {
                _count: {
                  select: {
                    members: {
                      where: { status: 'CONFIRMED' },
                    },
                  },
                },
                members: {
                  where: { status: 'CONFIRMED' },
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                        username: true,
                        displayName: true,
                      },
                    },
                  },
                  orderBy: [
                    { role: 'asc' }, // HOST first, then CO_HOST, then MEMBER
                    { createdAt: 'asc' },
                  ],
                },
              },
            },
          },
        });
      }, 'Get trip by ID with membership check');

      if (!membership || !membership.trip) {
        throw new NotFoundError('Trip not found or access denied');
      }

      if (membership.status !== 'CONFIRMED') {
        throw new ForbiddenError('Your trip membership is not confirmed');
      }

      const trip = TripTransforms.toTrip(
        membership.trip as DatabaseTrip,
        membership.trip._count.members,
        {
          role: membership.role,
          status: membership.status,
          canInvite: membership.canInvite,
        }
      );

      // Add members list
      trip.members = membership.trip.members.map(member =>
        TripTransforms.toTripMember(member as DatabaseTripMember)
      );

      log.debug('Trip retrieved successfully', {
        tripId,
        userId: user.id,
        userRole: membership.role,
      });

      return trip;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to get trip by ID', error, {
        tripId,
        userId: user.id,
      });

      throw new Error('Failed to retrieve trip');
    }
  }

  /**
   * Update trip (requires HOST or CO_HOST role)
   * Note: This method expects RBAC middleware to handle role checking
   */
  static async updateTrip(
    tripId: string,
    user: UserProfile,
    updateData: UpdateTripRequest
  ): Promise<Trip> {
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    // Validate update data
    if (updateData.title !== undefined && (!updateData.title || updateData.title.trim().length === 0)) {
      throw new BadRequestError('Trip title cannot be empty');
    }

    if (updateData.title && updateData.title.length > 200) {
      throw new BadRequestError('Trip title must be less than 200 characters');
    }

    if (updateData.startDate && updateData.endDate) {
      const start = new Date(updateData.startDate);
      const end = new Date(updateData.endDate);

      if (end <= start) {
        throw new BadRequestError('End date must be after start date');
      }
    }

    try {
      // Build update data
      const dbUpdateData: any = {};

      if (updateData.title !== undefined) {
        dbUpdateData.title = updateData.title.trim();
      }

      if (updateData.description !== undefined) {
        dbUpdateData.description = updateData.description?.trim() || null;
      }

      if (updateData.status !== undefined) {
        dbUpdateData.status = updateData.status;
      }

      if (updateData.location !== undefined) {
        dbUpdateData.location = updateData.location;
      }

      if (updateData.startDate !== undefined) {
        dbUpdateData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
      }

      if (updateData.endDate !== undefined) {
        dbUpdateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
      }

      if (updateData.metadata !== undefined) {
        dbUpdateData.metadata = updateData.metadata;
      }

      // Update trip in database
      const [updatedTrip, membership] = await Promise.all([
        safePrismaOperation(async () => {
          return await prisma.trip.update({
            where: { id: tripId },
            data: dbUpdateData,
          });
        }, 'Update trip'),

        safePrismaOperation(async () => {
          return await prisma.tripMember.findUnique({
            where: {
              tripId_userId: {
                tripId,
                userId: user.id,
              },
            },
          });
        }, 'Get user membership for updated trip'),
      ]);

      // Get member count
      const memberCount = await safePrismaOperation(async () => {
        return await prisma.tripMember.count({
          where: {
            tripId,
            status: 'CONFIRMED',
          },
        });
      }, 'Count trip members');

      log.info('Trip updated successfully', {
        tripId,
        userId: user.id,
        updatedFields: Object.keys(dbUpdateData),
      });

      // Real-time trip updates removed (Socket.io functionality)

      return TripTransforms.toTrip(
        updatedTrip as DatabaseTrip,
        memberCount,
        membership
      );
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to update trip', error, {
        tripId,
        userId: user.id,
        updateData,
      });

      throw new Error('Failed to update trip');
    }
  }

  /**
   * Delete trip (requires HOST role)
   * Note: This method expects RBAC middleware to handle role checking
   */
  static async deleteTrip(tripId: string, user: UserProfile): Promise<void> {
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    try {
      // Verify trip exists and get member count for logging
      const trip = await safePrismaOperation(async () => {
        return await prisma.trip.findUnique({
          where: { id: tripId },
          include: {
            _count: {
              select: { members: true },
            },
          },
        });
      }, 'Verify trip exists');

      if (!trip) {
        throw new NotFoundError('Trip not found');
      }

      // Delete trip (cascade delete will handle members, events, etc.)
      await safePrismaOperation(async () => {
        await prisma.trip.delete({
          where: { id: tripId },
        });
      }, 'Delete trip');

      // Real-time trip deletion broadcast removed (Socket.io functionality)

      log.info('Trip deleted successfully', {
        tripId,
        hostUserId: user.id,
        title: trip.title,
        memberCount: trip._count.members,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to delete trip', error, {
        tripId,
        userId: user.id,
      });

      throw new Error('Failed to delete trip');
    }
  }

  /**
   * Join a trip using an invite code
   */
  static async joinTripByCode(
    user: UserProfile,
    inviteCode: string
  ): Promise<{ trip: Trip; membership: TripMember }> {
    if (!inviteCode || inviteCode.trim().length === 0) {
      throw new BadRequestError('Invite code is required');
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    try {
      // Find trip by invite code
      const trip = await safePrismaOperation(async () => {
        return await prisma.trip.findUnique({
          where: { inviteCode: cleanCode },
          include: {
            _count: {
              select: {
                members: {
                  where: { status: 'CONFIRMED' },
                },
              },
            },
          },
        });
      }, 'Find trip by invite code');

      if (!trip) {
        throw new NotFoundError('Invalid invite code. Please check and try again.');
      }

      // Check if user is already a member
      const existingMembership = await safePrismaOperation(async () => {
        return await prisma.tripMember.findUnique({
          where: {
            tripId_userId: {
              tripId: trip.id,
              userId: user.id,
            },
          },
        });
      }, 'Check existing membership');

      if (existingMembership) {
        if (existingMembership.status === 'CONFIRMED') {
          throw new ConflictError('You are already a member of this trip');
        } else if (existingMembership.status === 'PENDING') {
          throw new ConflictError('You already have a pending invitation to this trip');
        }
        // If declined, allow them to rejoin
      }

      // Create or update membership
      const membership = await safePrismaOperation(async () => {
        if (existingMembership) {
          // Update existing declined membership
          return await prisma.tripMember.update({
            where: {
              tripId_userId: {
                tripId: trip.id,
                userId: user.id,
              },
            },
            data: {
              status: 'CONFIRMED',
              role: 'MEMBER',
              notifications: true,
              canInvite: false,
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          });
        } else {
          // Create new membership
          return await prisma.tripMember.create({
            data: {
              tripId: trip.id,
              userId: user.id,
              role: 'MEMBER',
              status: 'CONFIRMED',
              notifications: true,
              canInvite: false,
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          });
        }
      }, 'Create trip membership');

      log.info('User joined trip via invite code', {
        tripId: trip.id,
        userId: user.id,
        tripTitle: trip.title,
      });

      return {
        trip: TripTransforms.toTrip(trip as DatabaseTrip, trip._count.members + 1, membership),
        membership: TripTransforms.toTripMember(membership as DatabaseTripMember),
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to join trip by invite code', error, {
        userId: user.id,
        inviteCode: cleanCode,
      });

      throw new Error('Failed to join trip');
    }
  }

  /**
   * Get trip members
   */
  static async getTripMembers(
    tripId: string,
    user: UserProfile
  ): Promise<{ members: TripMember[] }> {
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    try {
      // Verify user is a member of the trip
      const userMembership = await safePrismaOperation(async () => {
        return await prisma.tripMember.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId: user.id,
            },
          },
        });
      }, 'Verify user membership');

      if (!userMembership || userMembership.status !== 'CONFIRMED') {
        throw new ForbiddenError('You must be a member of this trip to view members');
      }

      // Get all confirmed members
      const members = await safePrismaOperation(async () => {
        return await prisma.tripMember.findMany({
          where: {
            tripId,
            status: 'CONFIRMED',
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
          orderBy: [
            { role: 'asc' }, // HOST first, then CO_HOST, then MEMBER
            { createdAt: 'asc' },
          ],
        });
      }, 'Get trip members');

      log.debug('Trip members retrieved', {
        tripId,
        userId: user.id,
        memberCount: members.length,
      });

      return {
        members: members.map(member => TripTransforms.toTripMember(member as DatabaseTripMember)),
      };
    } catch (error) {
      if (error instanceof ForbiddenError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to get trip members', error, {
        tripId,
        userId: user.id,
      });

      throw new Error('Failed to retrieve trip members');
    }
  }

  /**
   * Generate a unique invite code for a trip
   */
  private static generateInviteCode(): string {
    // Generate a readable 8-character code (uppercase letters and numbers, no ambiguous chars)
    const chars = 'ABCDEFGHKMNPQRSTUVWXYZ23456789';
    let result = '';

    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Get trip statistics for dashboard
   */
  static async getTripStats(user: UserProfile): Promise<{
    totalTrips: number;
    hostingTrips: number;
    upcomingTrips: number;
    activeTrips: number;
  }> {
    try {
      const now = new Date();

      const [totalTrips, hostingTrips, upcomingTrips, activeTrips] = await Promise.all([
        // Total trips user is member of
        safePrismaOperation(async () => {
          return await prisma.tripMember.count({
            where: {
              userId: user.id,
              status: 'CONFIRMED',
            },
          });
        }, 'Count total trips'),

        // Trips user is hosting
        safePrismaOperation(async () => {
          return await prisma.tripMember.count({
            where: {
              userId: user.id,
              status: 'CONFIRMED',
              role: 'HOST',
            },
          });
        }, 'Count hosting trips'),

        // Upcoming trips (start date in future)
        safePrismaOperation(async () => {
          return await prisma.tripMember.count({
            where: {
              userId: user.id,
              status: 'CONFIRMED',
              trip: {
                startDate: {
                  gt: now,
                },
              },
            },
          });
        }, 'Count upcoming trips'),

        // Active trips
        safePrismaOperation(async () => {
          return await prisma.tripMember.count({
            where: {
              userId: user.id,
              status: 'CONFIRMED',
              trip: {
                status: 'ACTIVE',
              },
            },
          });
        }, 'Count active trips'),
      ]);

      return {
        totalTrips,
        hostingTrips,
        upcomingTrips,
        activeTrips,
      };
    } catch (error) {
      log.error('Failed to get trip statistics', error, {
        userId: user.id,
      });

      throw new Error('Failed to retrieve trip statistics');
    }
  }
}

// Export the service
export default TripService;
