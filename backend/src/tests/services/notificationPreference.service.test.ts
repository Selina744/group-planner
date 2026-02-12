/**
 * Notification Preference Service Tests
 *
 * Tests for notification preferences including:
 * - Global preference management
 * - Per-trip preference management
 * - Digest frequency settings
 * - Preference inheritance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { NotificationPreferenceService } from '../../services/notificationPreference.js';
import { UserFixtures, TripFixtures } from '../utils/test-fixtures.js';
import {
  getTestDb,
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
} from '../utils/test-database.js';
import { BadRequestError, ForbiddenError } from '../../utils/errors.js';

describe('NotificationPreferenceService', () => {
  const prisma = getTestDb();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('getGlobalPreferences', () => {
    it('should create default global preferences if not exists', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-1@example.com',
        username: 'preftest1',
      });

      const prefs = await NotificationPreferenceService.getGlobalPreferences(user.id);

      expect(prefs).toBeDefined();
      expect(prefs.userId).toBe(user.id);
      expect(prefs.tripId).toBeUndefined();
      expect(prefs.emailEnabled).toBe(true);
      expect(prefs.pushEnabled).toBe(true);
      expect(prefs.scheduleChanges).toBe(true);
      expect(prefs.itemUpdates).toBe(true);
      expect(prefs.announcements).toBe(true);
      expect(prefs.digestFrequency).toBe('DAILY');
    });

    it('should return existing global preferences', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-2@example.com',
        username: 'preftest2',
      });

      // Create custom preferences
      await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          tripId: null,
          emailEnabled: false,
          pushEnabled: false,
          scheduleChanges: false,
          itemUpdates: true,
          announcements: true,
          digestFrequency: 'WEEKLY',
        },
      });

      const prefs = await NotificationPreferenceService.getGlobalPreferences(user.id);

      expect(prefs.emailEnabled).toBe(false);
      expect(prefs.pushEnabled).toBe(false);
      expect(prefs.scheduleChanges).toBe(false);
      expect(prefs.digestFrequency).toBe('WEEKLY');
    });

    it('should throw BadRequestError for missing userId', async () => {
      await expect(
        NotificationPreferenceService.getGlobalPreferences('')
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getTripPreferences', () => {
    it('should create default trip preferences based on global', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-3@example.com',
        username: 'preftest3',
      });
      const { trip } = await TripFixtures.createTrip(user.id);

      // Set custom global preferences first
      await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          tripId: null,
          emailEnabled: false,
          pushEnabled: true,
          scheduleChanges: true,
          itemUpdates: false,
          announcements: true,
          digestFrequency: 'NONE',
        },
      });

      const tripPrefs = await NotificationPreferenceService.getTripPreferences(
        user.id,
        trip.id
      );

      expect(tripPrefs).toBeDefined();
      expect(tripPrefs.userId).toBe(user.id);
      expect(tripPrefs.tripId).toBe(trip.id);
      // Should inherit global settings
      expect(tripPrefs.emailEnabled).toBe(false);
      expect(tripPrefs.itemUpdates).toBe(false);
      expect(tripPrefs.digestFrequency).toBe('NONE');
    });

    it('should throw ForbiddenError for non-member', async () => {
      const user1 = await UserFixtures.createUser({
        email: 'pref-test-4@example.com',
        username: 'preftest4',
      });
      const user2 = await UserFixtures.createUser({
        email: 'pref-test-5@example.com',
        username: 'preftest5',
      });
      const { trip } = await TripFixtures.createTrip(user1.id);

      await expect(
        NotificationPreferenceService.getTripPreferences(user2.id, trip.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError for missing tripId', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-6@example.com',
        username: 'preftest6',
      });

      await expect(
        NotificationPreferenceService.getTripPreferences(user.id, '')
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getAllPreferences', () => {
    it('should return global and all trip preferences', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-7@example.com',
        username: 'preftest7',
      });
      const { trip: trip1 } = await TripFixtures.createTrip(user.id);
      const { trip: trip2 } = await TripFixtures.createTrip(user.id);

      // Create preferences for both trips
      await NotificationPreferenceService.getTripPreferences(user.id, trip1.id);
      await NotificationPreferenceService.getTripPreferences(user.id, trip2.id);

      const allPrefs = await NotificationPreferenceService.getAllPreferences(user.id);

      expect(allPrefs.global).toBeDefined();
      expect(allPrefs.tripPreferences).toHaveLength(2);
    });
  });

  describe('updateGlobalPreferences', () => {
    it('should update global preferences', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-8@example.com',
        username: 'preftest8',
      });

      // Ensure global preferences exist
      await NotificationPreferenceService.getGlobalPreferences(user.id);

      const result = await NotificationPreferenceService.updateGlobalPreferences(user.id, {
        emailEnabled: false,
        digestFrequency: 'WEEKLY',
      });

      expect(result.success).toBe(true);
      expect(result.preference.emailEnabled).toBe(false);
      expect(result.preference.digestFrequency).toBe('WEEKLY');
      // Other values should remain default
      expect(result.preference.pushEnabled).toBe(true);
    });

    it('should only update provided fields', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-9@example.com',
        username: 'preftest9',
      });

      // Ensure global preferences exist
      await NotificationPreferenceService.getGlobalPreferences(user.id);

      // Update only emailEnabled
      await NotificationPreferenceService.updateGlobalPreferences(user.id, {
        emailEnabled: false,
      });

      const prefs = await NotificationPreferenceService.getGlobalPreferences(user.id);

      expect(prefs.emailEnabled).toBe(false);
      expect(prefs.pushEnabled).toBe(true); // Should be unchanged
      expect(prefs.digestFrequency).toBe('DAILY'); // Should be unchanged
    });
  });

  describe('updateTripPreferences', () => {
    it('should update trip-specific preferences', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-10@example.com',
        username: 'preftest10',
      });
      const { trip } = await TripFixtures.createTrip(user.id);

      // Ensure trip preferences exist
      await NotificationPreferenceService.getTripPreferences(user.id, trip.id);

      const result = await NotificationPreferenceService.updateTripPreferences(
        user.id,
        trip.id,
        {
          scheduleChanges: false,
          itemUpdates: false,
        }
      );

      expect(result.success).toBe(true);
      expect(result.preference.scheduleChanges).toBe(false);
      expect(result.preference.itemUpdates).toBe(false);
    });

    it('should throw ForbiddenError for non-member', async () => {
      const user1 = await UserFixtures.createUser({
        email: 'pref-test-11@example.com',
        username: 'preftest11',
      });
      const user2 = await UserFixtures.createUser({
        email: 'pref-test-12@example.com',
        username: 'preftest12',
      });
      const { trip } = await TripFixtures.createTrip(user1.id);

      await expect(
        NotificationPreferenceService.updateTripPreferences(user2.id, trip.id, {
          emailEnabled: false,
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('resetTripPreferences', () => {
    it('should reset trip preferences to global defaults', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-13@example.com',
        username: 'preftest13',
      });
      const { trip } = await TripFixtures.createTrip(user.id);

      // Set custom global preferences
      await NotificationPreferenceService.updateGlobalPreferences(user.id, {
        emailEnabled: false,
        digestFrequency: 'NONE',
      });

      // Create trip preferences with different values
      await NotificationPreferenceService.getTripPreferences(user.id, trip.id);
      await NotificationPreferenceService.updateTripPreferences(user.id, trip.id, {
        emailEnabled: true, // Different from global
        digestFrequency: 'WEEKLY',
      });

      // Reset to global
      const result = await NotificationPreferenceService.resetTripPreferences(
        user.id,
        trip.id
      );

      expect(result.success).toBe(true);
      expect(result.preference.emailEnabled).toBe(false); // Should match global
      expect(result.preference.digestFrequency).toBe('NONE'); // Should match global
    });
  });

  describe('deleteTripPreferences', () => {
    it('should delete trip-specific preferences', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-14@example.com',
        username: 'preftest14',
      });
      const { trip } = await TripFixtures.createTrip(user.id);

      // Create trip preferences
      await NotificationPreferenceService.getTripPreferences(user.id, trip.id);

      // Delete them
      const result = await NotificationPreferenceService.deleteTripPreferences(
        user.id,
        trip.id
      );

      expect(result.success).toBe(true);

      // Verify they're gone (next call will create new default)
      const prefs = await prisma.notificationPreference.findFirst({
        where: { userId: user.id, tripId: trip.id },
      });

      expect(prefs).toBeNull();
    });
  });

  describe('shouldNotify', () => {
    it('should return trip preference value if exists', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-15@example.com',
        username: 'preftest15',
      });
      const { trip } = await TripFixtures.createTrip(user.id);

      // Set trip preference to disable announcements
      await NotificationPreferenceService.getTripPreferences(user.id, trip.id);
      await NotificationPreferenceService.updateTripPreferences(user.id, trip.id, {
        announcements: false,
      });

      const shouldNotify = await NotificationPreferenceService.shouldNotify(
        user.id,
        trip.id,
        'announcements'
      );

      expect(shouldNotify).toBe(false);
    });

    it('should fall back to global preference if no trip preference', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-16@example.com',
        username: 'preftest16',
      });
      const { trip } = await TripFixtures.createTrip(user.id);

      // Set global preference to disable schedule changes
      await NotificationPreferenceService.updateGlobalPreferences(user.id, {
        scheduleChanges: false,
      });

      // Don't create trip-specific preference
      const shouldNotify = await NotificationPreferenceService.shouldNotify(
        user.id,
        trip.id,
        'scheduleChanges'
      );

      expect(shouldNotify).toBe(false);
    });

    it('should return true by default', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-17@example.com',
        username: 'preftest17',
      });

      // No preferences set at all
      const shouldNotify = await NotificationPreferenceService.shouldNotify(
        user.id,
        null,
        'itemUpdates'
      );

      expect(shouldNotify).toBe(true);
    });
  });

  describe('getEffectivePreferences', () => {
    it('should return trip preference if exists', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-18@example.com',
        username: 'preftest18',
      });
      const { trip } = await TripFixtures.createTrip(user.id);

      // Set custom trip preferences
      await NotificationPreferenceService.getTripPreferences(user.id, trip.id);
      await NotificationPreferenceService.updateTripPreferences(user.id, trip.id, {
        digestFrequency: 'WEEKLY',
      });

      const effective = await NotificationPreferenceService.getEffectivePreferences(
        user.id,
        trip.id
      );

      expect(effective.tripId).toBe(trip.id);
      expect(effective.digestFrequency).toBe('WEEKLY');
    });

    it('should return global preference if no trip preference', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-19@example.com',
        username: 'preftest19',
      });
      const { trip } = await TripFixtures.createTrip(user.id);

      // Only set global preferences
      await NotificationPreferenceService.updateGlobalPreferences(user.id, {
        digestFrequency: 'NONE',
      });

      const effective = await NotificationPreferenceService.getEffectivePreferences(
        user.id,
        trip.id
      );

      // Should fall back to global
      expect(effective.tripId).toBeUndefined();
      expect(effective.digestFrequency).toBe('NONE');
    });
  });

  describe('DigestFrequency values', () => {
    it('should accept NONE digest frequency', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-20@example.com',
        username: 'preftest20',
      });

      const result = await NotificationPreferenceService.updateGlobalPreferences(user.id, {
        digestFrequency: 'NONE',
      });

      expect(result.preference.digestFrequency).toBe('NONE');
    });

    it('should accept DAILY digest frequency', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-21@example.com',
        username: 'preftest21',
      });

      const result = await NotificationPreferenceService.updateGlobalPreferences(user.id, {
        digestFrequency: 'DAILY',
      });

      expect(result.preference.digestFrequency).toBe('DAILY');
    });

    it('should accept WEEKLY digest frequency', async () => {
      const user = await UserFixtures.createUser({
        email: 'pref-test-22@example.com',
        username: 'preftest22',
      });

      const result = await NotificationPreferenceService.updateGlobalPreferences(user.id, {
        digestFrequency: 'WEEKLY',
      });

      expect(result.preference.digestFrequency).toBe('WEEKLY');
    });
  });
});
