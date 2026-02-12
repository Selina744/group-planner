/**
 * Notification Preference Service for Group Planner API
 *
 * This service provides notification preference management including:
 * - Global user preferences
 * - Per-trip notification toggles
 * - Digest frequency settings
 * - CRUD operations for preferences
 */

import { prisma, safePrismaOperation } from '../lib/prisma.js';
import { log } from '../utils/logger.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import type {
  NotificationPreference,
  DatabaseNotificationPreference,
  UpdatePreferencesRequest,
  PreferenceResponse,
  UserPreferencesResponse,
} from '../types/notificationPreference.js';
import type { DigestFrequency } from '../generated/prisma/index.js';

/**
 * Default preference values
 */
const DEFAULT_PREFERENCES: Omit<UpdatePreferencesRequest, 'digestFrequency'> & {
  digestFrequency: DigestFrequency;
} = {
  emailEnabled: true,
  pushEnabled: true,
  scheduleChanges: true,
  itemUpdates: true,
  announcements: true,
  digestFrequency: 'DAILY',
};

/**
 * Transform database preference to API response
 */
function toNotificationPreference(db: DatabaseNotificationPreference): NotificationPreference {
  return {
    id: db.id,
    userId: db.userId,
    ...(db.tripId && { tripId: db.tripId }),
    emailEnabled: db.emailEnabled,
    pushEnabled: db.pushEnabled,
    scheduleChanges: db.scheduleChanges,
    itemUpdates: db.itemUpdates,
    announcements: db.announcements,
    digestFrequency: db.digestFrequency,
    createdAt: db.createdAt.toISOString(),
    updatedAt: db.updatedAt.toISOString(),
  };
}

/**
 * Notification Preference Service
 */
export class NotificationPreferenceService {
  /**
   * Get global preferences for a user (creates default if not exists)
   */
  static async getGlobalPreferences(userId: string): Promise<NotificationPreference> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    log.debug('Fetching global preferences', { userId });

    try {
      // Try to find existing global preference (tripId is null)
      let preference = await safePrismaOperation(async () => {
        return prisma.notificationPreference.findFirst({
          where: { userId, tripId: null },
        });
      }, 'Find global preference');

      // If not found, create default
      if (!preference) {
        log.info('Creating default global preferences', { userId });
        preference = await safePrismaOperation(async () => {
          return prisma.notificationPreference.create({
            data: {
              userId,
              tripId: null,
              ...DEFAULT_PREFERENCES,
            },
          });
        }, 'Create global preference');
      }

      return toNotificationPreference(preference as DatabaseNotificationPreference);
    } catch (error) {
      log.error('Failed to get global preferences', error, { userId });
      throw new Error('Failed to retrieve notification preferences');
    }
  }

  /**
   * Get preferences for a specific trip (creates default if not exists)
   */
  static async getTripPreferences(userId: string, tripId: string): Promise<NotificationPreference> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    log.debug('Fetching trip preferences', { userId, tripId });

    try {
      // Verify user is a member of the trip
      const membership = await safePrismaOperation(async () => {
        return prisma.tripMember.findUnique({
          where: { tripId_userId: { tripId, userId } },
        });
      }, 'Check trip membership');

      if (!membership) {
        throw new ForbiddenError('User is not a member of this trip');
      }

      // Try to find existing trip preference
      let preference = await safePrismaOperation(async () => {
        return prisma.notificationPreference.findFirst({
          where: { userId, tripId },
        });
      }, 'Find trip preference');

      // If not found, create default (inheriting from global)
      if (!preference) {
        log.info('Creating default trip preferences', { userId, tripId });

        // Get global preferences to use as defaults
        const globalPref = await this.getGlobalPreferences(userId);

        preference = await safePrismaOperation(async () => {
          return prisma.notificationPreference.create({
            data: {
              userId,
              tripId,
              emailEnabled: globalPref.emailEnabled,
              pushEnabled: globalPref.pushEnabled,
              scheduleChanges: globalPref.scheduleChanges,
              itemUpdates: globalPref.itemUpdates,
              announcements: globalPref.announcements,
              digestFrequency: globalPref.digestFrequency,
            },
          });
        }, 'Create trip preference');
      }

      return toNotificationPreference(preference as DatabaseNotificationPreference);
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to get trip preferences', error, { userId, tripId });
      throw new Error('Failed to retrieve trip notification preferences');
    }
  }

  /**
   * Get all preferences for a user (global + all trip-specific)
   */
  static async getAllPreferences(userId: string): Promise<UserPreferencesResponse> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    log.debug('Fetching all user preferences', { userId });

    try {
      // Get global preferences
      const global = await this.getGlobalPreferences(userId);

      // Get all trip preferences
      const tripPrefs = await safePrismaOperation(async () => {
        return prisma.notificationPreference.findMany({
          where: { userId, tripId: { not: null } },
          orderBy: { updatedAt: 'desc' },
        });
      }, 'Find all trip preferences');

      return {
        global,
        tripPreferences: tripPrefs.map((p) =>
          toNotificationPreference(p as DatabaseNotificationPreference)
        ),
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to get all preferences', error, { userId });
      throw new Error('Failed to retrieve notification preferences');
    }
  }

  /**
   * Update global preferences for a user
   */
  static async updateGlobalPreferences(
    userId: string,
    updates: UpdatePreferencesRequest
  ): Promise<PreferenceResponse> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    log.debug('Updating global preferences', { userId, updates });

    try {
      // Ensure global preference exists and get its id
      const existingPref = await safePrismaOperation(async () => {
        return prisma.notificationPreference.findFirst({
          where: { userId, tripId: null },
        });
      }, 'Find global preference for update');

      if (!existingPref) {
        // Create default first
        await this.getGlobalPreferences(userId);
        return this.updateGlobalPreferences(userId, updates);
      }

      // Update with provided values using the record id
      const preference = await safePrismaOperation(async () => {
        return prisma.notificationPreference.update({
          where: { id: existingPref.id },
          data: {
            ...(updates.emailEnabled !== undefined && { emailEnabled: updates.emailEnabled }),
            ...(updates.pushEnabled !== undefined && { pushEnabled: updates.pushEnabled }),
            ...(updates.scheduleChanges !== undefined && {
              scheduleChanges: updates.scheduleChanges,
            }),
            ...(updates.itemUpdates !== undefined && { itemUpdates: updates.itemUpdates }),
            ...(updates.announcements !== undefined && { announcements: updates.announcements }),
            ...(updates.digestFrequency !== undefined && {
              digestFrequency: updates.digestFrequency,
            }),
          },
        });
      }, 'Update global preference');

      log.info('Global preferences updated', { userId });

      return {
        success: true,
        preference: toNotificationPreference(preference as DatabaseNotificationPreference),
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to update global preferences', error, { userId, updates });
      throw new Error('Failed to update notification preferences');
    }
  }

  /**
   * Update preferences for a specific trip
   */
  static async updateTripPreferences(
    userId: string,
    tripId: string,
    updates: UpdatePreferencesRequest
  ): Promise<PreferenceResponse> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    log.debug('Updating trip preferences', { userId, tripId, updates });

    try {
      // Ensure trip preference exists (also verifies membership)
      await this.getTripPreferences(userId, tripId);

      // Update with provided values
      const preference = await safePrismaOperation(async () => {
        return prisma.notificationPreference.update({
          where: {
            userId_tripId: { userId, tripId },
          },
          data: {
            ...(updates.emailEnabled !== undefined && { emailEnabled: updates.emailEnabled }),
            ...(updates.pushEnabled !== undefined && { pushEnabled: updates.pushEnabled }),
            ...(updates.scheduleChanges !== undefined && {
              scheduleChanges: updates.scheduleChanges,
            }),
            ...(updates.itemUpdates !== undefined && { itemUpdates: updates.itemUpdates }),
            ...(updates.announcements !== undefined && { announcements: updates.announcements }),
            ...(updates.digestFrequency !== undefined && {
              digestFrequency: updates.digestFrequency,
            }),
          },
        });
      }, 'Update trip preference');

      log.info('Trip preferences updated', { userId, tripId });

      return {
        success: true,
        preference: toNotificationPreference(preference as DatabaseNotificationPreference),
      };
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to update trip preferences', error, { userId, tripId, updates });
      throw new Error('Failed to update trip notification preferences');
    }
  }

  /**
   * Reset trip preferences to global defaults
   */
  static async resetTripPreferences(userId: string, tripId: string): Promise<PreferenceResponse> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    log.debug('Resetting trip preferences to global defaults', { userId, tripId });

    try {
      // Verify user is a member of the trip
      const membership = await safePrismaOperation(async () => {
        return prisma.tripMember.findUnique({
          where: { tripId_userId: { tripId, userId } },
        });
      }, 'Check trip membership');

      if (!membership) {
        throw new ForbiddenError('User is not a member of this trip');
      }

      // Get global preferences
      const globalPref = await this.getGlobalPreferences(userId);

      // Upsert trip preferences with global values
      const preference = await safePrismaOperation(async () => {
        return prisma.notificationPreference.upsert({
          where: {
            userId_tripId: { userId, tripId },
          },
          update: {
            emailEnabled: globalPref.emailEnabled,
            pushEnabled: globalPref.pushEnabled,
            scheduleChanges: globalPref.scheduleChanges,
            itemUpdates: globalPref.itemUpdates,
            announcements: globalPref.announcements,
            digestFrequency: globalPref.digestFrequency,
          },
          create: {
            userId,
            tripId,
            emailEnabled: globalPref.emailEnabled,
            pushEnabled: globalPref.pushEnabled,
            scheduleChanges: globalPref.scheduleChanges,
            itemUpdates: globalPref.itemUpdates,
            announcements: globalPref.announcements,
            digestFrequency: globalPref.digestFrequency,
          },
        });
      }, 'Reset trip preference');

      log.info('Trip preferences reset to global defaults', { userId, tripId });

      return {
        success: true,
        preference: toNotificationPreference(preference as DatabaseNotificationPreference),
      };
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      log.error('Failed to reset trip preferences', error, { userId, tripId });
      throw new Error('Failed to reset trip notification preferences');
    }
  }

  /**
   * Delete trip-specific preferences (revert to using global)
   */
  static async deleteTripPreferences(userId: string, tripId: string): Promise<{ success: boolean }> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    log.debug('Deleting trip preferences', { userId, tripId });

    try {
      const result = await safePrismaOperation(async () => {
        return prisma.notificationPreference.deleteMany({
          where: { userId, tripId },
        });
      }, 'Delete trip preference');

      log.info('Trip preferences deleted', { userId, tripId, deleted: result.count });

      return { success: true };
    } catch (error) {
      log.error('Failed to delete trip preferences', error, { userId, tripId });
      throw new Error('Failed to delete trip notification preferences');
    }
  }

  /**
   * Check if user should receive a specific type of notification
   */
  static async shouldNotify(
    userId: string,
    tripId: string | null,
    notificationType: 'scheduleChanges' | 'itemUpdates' | 'announcements'
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }

    try {
      // Try trip-specific preference first if tripId provided
      if (tripId) {
        const tripPref = await safePrismaOperation(async () => {
          return prisma.notificationPreference.findFirst({
            where: { userId, tripId },
          });
        }, 'Find trip preference for notification check');

        if (tripPref) {
          return tripPref[notificationType];
        }
      }

      // Fall back to global preference
      const globalPref = await safePrismaOperation(async () => {
        return prisma.notificationPreference.findFirst({
          where: { userId, tripId: null },
        });
      }, 'Find global preference for notification check');

      if (globalPref) {
        return globalPref[notificationType];
      }

      // Default to true if no preference found
      return true;
    } catch (error) {
      log.error('Error checking notification preference', error, {
        userId,
        tripId,
        notificationType,
      });
      // Default to true on error to avoid missing notifications
      return true;
    }
  }

  /**
   * Get effective preference for a user/trip combination
   * Returns trip-specific if exists, otherwise global
   */
  static async getEffectivePreferences(
    userId: string,
    tripId?: string
  ): Promise<NotificationPreference> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    // If tripId provided, check for trip-specific preference first
    if (tripId) {
      try {
        const tripPref = await safePrismaOperation(async () => {
          return prisma.notificationPreference.findFirst({
            where: { userId, tripId },
          });
        }, 'Find effective trip preference');

        if (tripPref) {
          return toNotificationPreference(tripPref as DatabaseNotificationPreference);
        }
      } catch (error) {
        log.debug('No trip-specific preference found, falling back to global', {
          userId,
          tripId,
        });
      }
    }

    // Return global preferences
    return this.getGlobalPreferences(userId);
  }
}
