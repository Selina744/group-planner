/**
 * Announcement service for Group Planner API
 *
 * This service provides announcement management functionality for trips including
 * CRUD operations with role-based access control. Only HOST and CO_HOST members
 * can create, update, pin, and delete announcements.
 */

import { prisma, safePrismaOperation } from '../lib/prisma.js';
import { log } from '../utils/logger.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors.js';
import type {
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  AnnouncementListQuery,
  AnnouncementListResponse,
  CreateAnnouncementResponse,
  PinAnnouncementResponse,
  DatabaseAnnouncementWithRelations,
  AnnouncementCreatedEvent,
} from '../types/announcement.js';
import { MAX_PINNED_ANNOUNCEMENTS } from '../types/announcement.js';
import type { MemberRole } from '../types/trip.js';

/**
 * Announcement transforms for converting database objects to API responses
 */
class AnnouncementTransforms {
  /**
   * Convert database announcement to API response
   */
  static toAnnouncement(dbAnnouncement: DatabaseAnnouncementWithRelations): Announcement {
    return {
      id: dbAnnouncement.id,
      tripId: dbAnnouncement.tripId,
      title: dbAnnouncement.title,
      body: dbAnnouncement.body,
      pinned: dbAnnouncement.pinned,
      createdAt: dbAnnouncement.createdAt.toISOString(),
      updatedAt: dbAnnouncement.updatedAt.toISOString(),
      author: {
        id: dbAnnouncement.author.id,
        email: dbAnnouncement.author.email,
        ...(dbAnnouncement.author.username && { username: dbAnnouncement.author.username }),
        ...(dbAnnouncement.author.displayName && { displayName: dbAnnouncement.author.displayName }),
      },
    };
  }
}

/**
 * Roles that can create/manage announcements
 */
const ANNOUNCEMENT_MANAGEMENT_ROLES: MemberRole[] = ['HOST', 'CO_HOST'];

/**
 * Announcement service class
 */
export class AnnouncementService {
  /**
   * Optional socket service for real-time notifications
   * Can be injected via setSocketService if available
   */
  private static socketService: {
    emitToTrip: (tripId: string, event: AnnouncementCreatedEvent) => void;
  } | null = null;

  /**
   * Set the socket service for real-time notifications
   */
  static setSocketService(service: typeof AnnouncementService.socketService): void {
    AnnouncementService.socketService = service;
  }

  /**
   * Create a new announcement (HOST or CO_HOST only)
   */
  static async create(
    tripId: string,
    userId: string,
    data: Omit<CreateAnnouncementRequest, 'tripId'>
  ): Promise<CreateAnnouncementResponse> {
    const { title, body, pinned = false } = data;

    // Validate required fields
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    if (!title || title.trim().length === 0) {
      throw new BadRequestError('Announcement title is required');
    }

    if (!body || body.trim().length === 0) {
      throw new BadRequestError('Announcement body is required');
    }

    if (title.length > 200) {
      throw new BadRequestError('Announcement title must be less than 200 characters');
    }

    if (body.length > 10000) {
      throw new BadRequestError('Announcement body must be less than 10000 characters');
    }

    try {
      // Check trip membership and get user role
      const membership = await this.checkTripMembership(tripId, userId);
      if (!membership) {
        throw new NotFoundError('Trip not found or access denied');
      }

      // Verify user has permission to create announcements
      if (!ANNOUNCEMENT_MANAGEMENT_ROLES.includes(membership.role)) {
        throw new ForbiddenError('Only hosts and co-hosts can create announcements');
      }

      // If pinned is requested, check the limit
      if (pinned) {
        const pinnedCount = await this.getPinnedCount(tripId);
        if (pinnedCount >= MAX_PINNED_ANNOUNCEMENTS) {
          throw new BadRequestError(
            `Cannot pin announcement. Maximum of ${MAX_PINNED_ANNOUNCEMENTS} pinned announcements allowed per trip`
          );
        }
      }

      // Create announcement
      const result = await safePrismaOperation(async () => {
        return await prisma.announcement.create({
          data: {
            tripId,
            authorId: userId,
            title: title.trim(),
            body: body.trim(),
            pinned,
          },
          include: {
            author: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Create announcement');

      const announcement = AnnouncementTransforms.toAnnouncement(
        result as unknown as DatabaseAnnouncementWithRelations
      );

      log.info('Announcement created successfully', {
        announcementId: result.id,
        tripId,
        userId,
        pinned,
        title: result.title,
      });

      // Emit socket event if socket service is available
      if (AnnouncementService.socketService) {
        try {
          AnnouncementService.socketService.emitToTrip(tripId, {
            type: 'ANNOUNCEMENT_CREATED',
            tripId,
            announcement,
          });
          log.debug('Announcement socket event emitted', {
            announcementId: result.id,
            tripId,
          });
        } catch (socketError) {
          // Log but don't fail the request if socket emission fails
          log.warn('Failed to emit announcement socket event', {
            announcementId: result.id,
            tripId,
            error: socketError,
          });
        }
      }

      return { announcement };
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to create announcement', error, {
        userId,
        tripId,
        data,
      });

      throw new Error('Failed to create announcement');
    }
  }

  /**
   * List announcements for a trip with pagination (pinned first, then by date descending)
   */
  static async list(
    tripId: string,
    userId: string,
    query: Omit<AnnouncementListQuery, 'tripId'> = {}
  ): Promise<AnnouncementListResponse> {
    const { page = 1, limit = 20, pinnedOnly = false } = query;

    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    // Validate pagination
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    try {
      // Check trip membership
      const membership = await this.checkTripMembership(tripId, userId);
      if (!membership) {
        throw new NotFoundError('Trip not found or access denied');
      }

      // Build where clause - exclude soft deleted announcements
      const where: { tripId: string; deletedAt: null; pinned?: boolean } = {
        tripId,
        deletedAt: null,
      };

      if (pinnedOnly) {
        where.pinned = true;
      }

      // Fetch announcements with ordering: pinned first, then by createdAt descending
      const [announcements, totalCount] = await Promise.all([
        safePrismaOperation(async () => {
          return await prisma.announcement.findMany({
            where,
            include: {
              author: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  displayName: true,
                },
              },
            },
            orderBy: [
              { pinned: 'desc' },
              { createdAt: 'desc' },
            ],
            skip: offset,
            take: limitNum,
          });
        }, 'List announcements'),

        safePrismaOperation(async () => {
          return await prisma.announcement.count({ where });
        }, 'Count announcements'),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      log.debug('Announcements listed successfully', {
        tripId,
        userId,
        count: announcements.length,
        total: totalCount,
        page: pageNum,
        pinnedOnly,
      });

      return {
        announcements: announcements.map((a) =>
          AnnouncementTransforms.toAnnouncement(a as unknown as DatabaseAnnouncementWithRelations)
        ),
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
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to list announcements', error, {
        userId,
        tripId,
      });

      throw new Error('Failed to retrieve announcements');
    }
  }

  /**
   * Get a single announcement by ID
   */
  static async getById(id: string, userId: string): Promise<Announcement> {
    if (!id) {
      throw new BadRequestError('Announcement ID is required');
    }

    try {
      const announcement = await safePrismaOperation(async () => {
        return await prisma.announcement.findUnique({
          where: { id },
          include: {
            author: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Get announcement by ID');

      if (!announcement || announcement.deletedAt !== null) {
        throw new NotFoundError('Announcement not found');
      }

      // Check trip membership
      const membership = await this.checkTripMembership(announcement.tripId, userId);
      if (!membership) {
        throw new NotFoundError('Announcement not found or access denied');
      }

      return AnnouncementTransforms.toAnnouncement(
        announcement as unknown as DatabaseAnnouncementWithRelations
      );
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to get announcement by ID', error, {
        announcementId: id,
        userId,
      });

      throw new Error('Failed to retrieve announcement');
    }
  }

  /**
   * Update an announcement (HOST or CO_HOST only)
   */
  static async update(
    id: string,
    userId: string,
    data: UpdateAnnouncementRequest
  ): Promise<Announcement> {
    if (!id) {
      throw new BadRequestError('Announcement ID is required');
    }

    // Validate update data
    if (data.title !== undefined) {
      if (!data.title || data.title.trim().length === 0) {
        throw new BadRequestError('Announcement title cannot be empty');
      }
      if (data.title.length > 200) {
        throw new BadRequestError('Announcement title must be less than 200 characters');
      }
    }

    if (data.body !== undefined) {
      if (!data.body || data.body.trim().length === 0) {
        throw new BadRequestError('Announcement body cannot be empty');
      }
      if (data.body.length > 10000) {
        throw new BadRequestError('Announcement body must be less than 10000 characters');
      }
    }

    try {
      // Get announcement and check permissions
      const announcement = await safePrismaOperation(async () => {
        return await prisma.announcement.findUnique({
          where: { id },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId, status: 'CONFIRMED' },
                },
              },
            },
          },
        });
      }, 'Get announcement for update');

      if (!announcement || announcement.deletedAt !== null) {
        throw new NotFoundError('Announcement not found');
      }

      const membership = announcement.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Announcement not found or access denied');
      }

      // Only HOST or CO_HOST can update announcements
      if (!ANNOUNCEMENT_MANAGEMENT_ROLES.includes(membership.role as MemberRole)) {
        throw new ForbiddenError('Only hosts and co-hosts can update announcements');
      }

      // Build update data
      const updateData: { title?: string; body?: string } = {};

      if (data.title !== undefined) {
        updateData.title = data.title.trim();
      }

      if (data.body !== undefined) {
        updateData.body = data.body.trim();
      }

      // Update announcement
      const updatedAnnouncement = await safePrismaOperation(async () => {
        return await prisma.announcement.update({
          where: { id },
          data: updateData,
          include: {
            author: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Update announcement');

      log.info('Announcement updated successfully', {
        announcementId: id,
        tripId: announcement.tripId,
        userId,
        updatedFields: Object.keys(updateData),
      });

      return AnnouncementTransforms.toAnnouncement(
        updatedAnnouncement as unknown as DatabaseAnnouncementWithRelations
      );
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to update announcement', error, {
        announcementId: id,
        userId,
        data,
      });

      throw new Error('Failed to update announcement');
    }
  }

  /**
   * Pin an announcement (HOST or CO_HOST only, max 3 pinned per trip)
   */
  static async pin(id: string, userId: string): Promise<PinAnnouncementResponse> {
    if (!id) {
      throw new BadRequestError('Announcement ID is required');
    }

    try {
      // Get announcement and check permissions
      const announcement = await safePrismaOperation(async () => {
        return await prisma.announcement.findUnique({
          where: { id },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId, status: 'CONFIRMED' },
                },
              },
            },
          },
        });
      }, 'Get announcement for pin');

      if (!announcement || announcement.deletedAt !== null) {
        throw new NotFoundError('Announcement not found');
      }

      const membership = announcement.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Announcement not found or access denied');
      }

      // Only HOST or CO_HOST can pin announcements
      if (!ANNOUNCEMENT_MANAGEMENT_ROLES.includes(membership.role as MemberRole)) {
        throw new ForbiddenError('Only hosts and co-hosts can pin announcements');
      }

      // Check if already pinned
      if (announcement.pinned) {
        throw new BadRequestError('Announcement is already pinned');
      }

      // Check pinned count limit
      const pinnedCount = await this.getPinnedCount(announcement.tripId);
      if (pinnedCount >= MAX_PINNED_ANNOUNCEMENTS) {
        throw new BadRequestError(
          `Cannot pin announcement. Maximum of ${MAX_PINNED_ANNOUNCEMENTS} pinned announcements allowed per trip`
        );
      }

      // Pin announcement
      const updatedAnnouncement = await safePrismaOperation(async () => {
        return await prisma.announcement.update({
          where: { id },
          data: { pinned: true },
          include: {
            author: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Pin announcement');

      log.info('Announcement pinned successfully', {
        announcementId: id,
        tripId: announcement.tripId,
        userId,
        newPinnedCount: pinnedCount + 1,
      });

      return {
        announcement: AnnouncementTransforms.toAnnouncement(
          updatedAnnouncement as unknown as DatabaseAnnouncementWithRelations
        ),
        pinnedCount: pinnedCount + 1,
      };
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to pin announcement', error, {
        announcementId: id,
        userId,
      });

      throw new Error('Failed to pin announcement');
    }
  }

  /**
   * Unpin an announcement (HOST or CO_HOST only)
   */
  static async unpin(id: string, userId: string): Promise<PinAnnouncementResponse> {
    if (!id) {
      throw new BadRequestError('Announcement ID is required');
    }

    try {
      // Get announcement and check permissions
      const announcement = await safePrismaOperation(async () => {
        return await prisma.announcement.findUnique({
          where: { id },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId, status: 'CONFIRMED' },
                },
              },
            },
          },
        });
      }, 'Get announcement for unpin');

      if (!announcement || announcement.deletedAt !== null) {
        throw new NotFoundError('Announcement not found');
      }

      const membership = announcement.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Announcement not found or access denied');
      }

      // Only HOST or CO_HOST can unpin announcements
      if (!ANNOUNCEMENT_MANAGEMENT_ROLES.includes(membership.role as MemberRole)) {
        throw new ForbiddenError('Only hosts and co-hosts can unpin announcements');
      }

      // Check if already unpinned
      if (!announcement.pinned) {
        throw new BadRequestError('Announcement is not pinned');
      }

      // Get current pinned count before unpinning
      const pinnedCount = await this.getPinnedCount(announcement.tripId);

      // Unpin announcement
      const updatedAnnouncement = await safePrismaOperation(async () => {
        return await prisma.announcement.update({
          where: { id },
          data: { pinned: false },
          include: {
            author: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Unpin announcement');

      log.info('Announcement unpinned successfully', {
        announcementId: id,
        tripId: announcement.tripId,
        userId,
        newPinnedCount: pinnedCount - 1,
      });

      return {
        announcement: AnnouncementTransforms.toAnnouncement(
          updatedAnnouncement as unknown as DatabaseAnnouncementWithRelations
        ),
        pinnedCount: pinnedCount - 1,
      };
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to unpin announcement', error, {
        announcementId: id,
        userId,
      });

      throw new Error('Failed to unpin announcement');
    }
  }

  /**
   * Soft delete an announcement (HOST or CO_HOST only)
   */
  static async delete(id: string, userId: string): Promise<void> {
    if (!id) {
      throw new BadRequestError('Announcement ID is required');
    }

    try {
      // Get announcement and check permissions
      const announcement = await safePrismaOperation(async () => {
        return await prisma.announcement.findUnique({
          where: { id },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId, status: 'CONFIRMED' },
                },
              },
            },
          },
        });
      }, 'Get announcement for deletion');

      if (!announcement || announcement.deletedAt !== null) {
        throw new NotFoundError('Announcement not found');
      }

      const membership = announcement.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Announcement not found or access denied');
      }

      // Only HOST or CO_HOST can delete announcements
      if (!ANNOUNCEMENT_MANAGEMENT_ROLES.includes(membership.role as MemberRole)) {
        throw new ForbiddenError('Only hosts and co-hosts can delete announcements');
      }

      // Soft delete announcement
      await safePrismaOperation(async () => {
        await prisma.announcement.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            pinned: false, // Unpin when deleting
          },
        });
      }, 'Soft delete announcement');

      log.info('Announcement deleted successfully', {
        announcementId: id,
        tripId: announcement.tripId,
        userId,
        deletedBy: announcement.authorId === userId ? 'author' : 'admin',
      });
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to delete announcement', error, {
        announcementId: id,
        userId,
      });

      throw new Error('Failed to delete announcement');
    }
  }

  /**
   * Get the count of pinned announcements for a trip (excluding soft deleted)
   */
  private static async getPinnedCount(tripId: string): Promise<number> {
    return await safePrismaOperation(async () => {
      return await prisma.announcement.count({
        where: {
          tripId,
          pinned: true,
          deletedAt: null,
        },
      });
    }, 'Count pinned announcements');
  }

  /**
   * Check if user is a member of the trip and get their role
   */
  private static async checkTripMembership(
    tripId: string,
    userId: string
  ): Promise<{ role: MemberRole; status: string } | null> {
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
export default AnnouncementService;
