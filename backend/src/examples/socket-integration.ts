/**
 * Socket.io Integration Examples for Group Planner API
 *
 * This module demonstrates how to integrate Socket.io real-time features
 * with various parts of the application such as trip management,
 * event handling, and notifications.
 */

import { socketService } from '../services/socket.js';
import { log } from '../utils/logger.js';
import type { SocketTripUpdateType } from '../types/socket.js';

/**
 * Example integration with trip management
 */
export class TripSocketIntegration {
  /**
   * Broadcast when a new trip is created
   */
  static onTripCreated(tripId: string, tripData: any, creatorId: string): void {
    try {
      // Send notification to the trip creator
      socketService.sendNotificationToUser(creatorId, {
        type: 'success',
        title: 'Trip Created',
        message: `Your trip "${tripData.name}" has been created successfully!`,
        data: {
          tripId,
          tripName: tripData.name,
        },
      });

      // If there are initial members, notify them
      if (tripData.members && Array.isArray(tripData.members)) {
        tripData.members.forEach((memberId: string) => {
          if (memberId !== creatorId) {
            socketService.sendNotificationToUser(memberId, {
              type: 'info',
              title: 'Added to Trip',
              message: `You've been added to the trip "${tripData.name}"`,
              data: {
                tripId,
                tripName: tripData.name,
                invitedBy: creatorId,
              },
            });
          }
        });
      }

      log.info('Trip creation notifications sent', {
        tripId,
        creatorId,
        memberCount: tripData.members?.length || 0,
      });
    } catch (error) {
      log.error('Failed to send trip creation notifications', error, {
        tripId,
        creatorId,
      });
    }
  }

  /**
   * Broadcast when trip details are updated
   */
  static onTripUpdated(
    tripId: string,
    updates: any,
    updatedBy: string,
    excludeUserId?: string
  ): void {
    try {
      // Broadcast to all trip room members
      socketService.sendTripUpdate(
        tripId,
        'trip:updated',
        {
          updates,
          updatedBy,
          timestamp: new Date().toISOString(),
        },
        excludeUserId
      );

      log.info('Trip update broadcasted', {
        tripId,
        updatedBy,
        updateFields: Object.keys(updates),
      });
    } catch (error) {
      log.error('Failed to broadcast trip update', error, {
        tripId,
        updatedBy,
      });
    }
  }

  /**
   * Broadcast when a member is added to the trip
   */
  static onMemberAdded(
    tripId: string,
    tripName: string,
    newMemberId: string,
    addedBy: string
  ): void {
    try {
      // Notify the new member
      socketService.sendNotificationToUser(newMemberId, {
        type: 'info',
        title: 'Added to Trip',
        message: `You've been added to the trip "${tripName}"`,
        data: {
          tripId,
          tripName,
          addedBy,
        },
      });

      // Broadcast to existing trip members
      socketService.sendTripUpdate(tripId, 'trip:member_added', {
        memberId: newMemberId,
        addedBy,
        tripName,
        timestamp: new Date().toISOString(),
      });

      log.info('Member addition notifications sent', {
        tripId,
        newMemberId,
        addedBy,
      });
    } catch (error) {
      log.error('Failed to send member addition notifications', error, {
        tripId,
        newMemberId,
        addedBy,
      });
    }
  }

  /**
   * Broadcast when a member is removed from the trip
   */
  static onMemberRemoved(
    tripId: string,
    tripName: string,
    removedMemberId: string,
    removedBy: string
  ): void {
    try {
      // Notify the removed member
      socketService.sendNotificationToUser(removedMemberId, {
        type: 'warning',
        title: 'Removed from Trip',
        message: `You've been removed from the trip "${tripName}"`,
        data: {
          tripId,
          tripName,
          removedBy,
        },
      });

      // Broadcast to remaining trip members
      socketService.sendTripUpdate(tripId, 'trip:member_removed', {
        memberId: removedMemberId,
        removedBy,
        tripName,
        timestamp: new Date().toISOString(),
      }, removedMemberId); // Exclude the removed member

      log.info('Member removal notifications sent', {
        tripId,
        removedMemberId,
        removedBy,
      });
    } catch (error) {
      log.error('Failed to send member removal notifications', error, {
        tripId,
        removedMemberId,
        removedBy,
      });
    }
  }
}

/**
 * Example integration with event management
 */
export class EventSocketIntegration {
  /**
   * Broadcast when a new event is created
   */
  static onEventCreated(
    tripId: string,
    eventId: string,
    eventData: any,
    createdBy: string
  ): void {
    try {
      socketService.sendTripUpdate(tripId, 'event:created', {
        eventId,
        eventData,
        createdBy,
        timestamp: new Date().toISOString(),
      });

      log.info('Event creation broadcasted', {
        tripId,
        eventId,
        createdBy,
      });
    } catch (error) {
      log.error('Failed to broadcast event creation', error, {
        tripId,
        eventId,
        createdBy,
      });
    }
  }

  /**
   * Broadcast when an event is updated
   */
  static onEventUpdated(
    tripId: string,
    eventId: string,
    updates: any,
    updatedBy: string
  ): void {
    try {
      socketService.sendTripUpdate(tripId, 'event:updated', {
        eventId,
        updates,
        updatedBy,
        timestamp: new Date().toISOString(),
      });

      log.info('Event update broadcasted', {
        tripId,
        eventId,
        updatedBy,
      });
    } catch (error) {
      log.error('Failed to broadcast event update', error, {
        tripId,
        eventId,
        updatedBy,
      });
    }
  }

  /**
   * Broadcast RSVP updates
   */
  static onRSVPUpdated(
    tripId: string,
    eventId: string,
    userId: string,
    rsvpStatus: 'yes' | 'no' | 'maybe'
  ): void {
    try {
      socketService.sendTripUpdate(tripId, 'event:rsvp_updated', {
        eventId,
        userId,
        rsvpStatus,
        timestamp: new Date().toISOString(),
      });

      log.info('RSVP update broadcasted', {
        tripId,
        eventId,
        userId,
        rsvpStatus,
      });
    } catch (error) {
      log.error('Failed to broadcast RSVP update', error, {
        tripId,
        eventId,
        userId,
        rsvpStatus,
      });
    }
  }
}

/**
 * Example integration with item/task management
 */
export class ItemSocketIntegration {
  /**
   * Broadcast when a new item is created
   */
  static onItemCreated(
    tripId: string,
    itemId: string,
    itemData: any,
    createdBy: string
  ): void {
    try {
      socketService.sendTripUpdate(tripId, 'item:created', {
        itemId,
        itemData,
        createdBy,
        timestamp: new Date().toISOString(),
      });

      log.info('Item creation broadcasted', {
        tripId,
        itemId,
        createdBy,
      });
    } catch (error) {
      log.error('Failed to broadcast item creation', error, {
        tripId,
        itemId,
        createdBy,
      });
    }
  }

  /**
   * Broadcast when an item is assigned
   */
  static onItemAssigned(
    tripId: string,
    itemId: string,
    assignedTo: string,
    assignedBy: string
  ): void {
    try {
      // Notify the assigned user
      socketService.sendNotificationToUser(assignedTo, {
        type: 'info',
        title: 'Task Assigned',
        message: 'You have been assigned a new task',
        data: {
          tripId,
          itemId,
          assignedBy,
        },
      });

      // Broadcast to trip members
      socketService.sendTripUpdate(tripId, 'item:assigned', {
        itemId,
        assignedTo,
        assignedBy,
        timestamp: new Date().toISOString(),
      });

      log.info('Item assignment notifications sent', {
        tripId,
        itemId,
        assignedTo,
        assignedBy,
      });
    } catch (error) {
      log.error('Failed to send item assignment notifications', error, {
        tripId,
        itemId,
        assignedTo,
        assignedBy,
      });
    }
  }

  /**
   * Broadcast when an item is completed
   */
  static onItemCompleted(
    tripId: string,
    itemId: string,
    completedBy: string
  ): void {
    try {
      socketService.sendTripUpdate(tripId, 'item:completed', {
        itemId,
        completedBy,
        timestamp: new Date().toISOString(),
      });

      log.info('Item completion broadcasted', {
        tripId,
        itemId,
        completedBy,
      });
    } catch (error) {
      log.error('Failed to broadcast item completion', error, {
        tripId,
        itemId,
        completedBy,
      });
    }
  }
}

/**
 * Example integration with chat/messaging
 */
export class ChatSocketIntegration {
  /**
   * Broadcast chat messages
   */
  static onChatMessage(
    tripId: string,
    messageId: string,
    messageData: any,
    sentBy: string
  ): void {
    try {
      socketService.sendTripUpdate(tripId, 'chat:message', {
        messageId,
        messageData,
        sentBy,
        timestamp: new Date().toISOString(),
      });

      log.info('Chat message broadcasted', {
        tripId,
        messageId,
        sentBy,
      });
    } catch (error) {
      log.error('Failed to broadcast chat message', error, {
        tripId,
        messageId,
        sentBy,
      });
    }
  }
}

/**
 * Example integration with system notifications
 */
export class SystemNotificationIntegration {
  /**
   * Send maintenance notifications
   */
  static sendMaintenanceNotification(message: string, scheduledTime: Date): void {
    try {
      const stats = socketService.getStats();
      const userIds = [...new Set(stats.connections.map(conn => conn.userId))];

      userIds.forEach(userId => {
        socketService.sendNotificationToUser(userId, {
          type: 'warning',
          title: 'Scheduled Maintenance',
          message,
          persistent: true,
          data: {
            scheduledTime: scheduledTime.toISOString(),
            maintenanceType: 'system',
          },
        });
      });

      log.info('Maintenance notifications sent', {
        recipientCount: userIds.length,
        scheduledTime,
      });
    } catch (error) {
      log.error('Failed to send maintenance notifications', error);
    }
  }

  /**
   * Send welcome message to new users
   */
  static sendWelcomeNotification(userId: string, username?: string): void {
    try {
      socketService.sendNotificationToUser(userId, {
        type: 'success',
        title: 'Welcome to Group Planner!',
        message: username
          ? `Welcome ${username}! Start by creating your first trip or joining an existing one.`
          : 'Welcome! Start by creating your first trip or joining an existing one.',
        data: {
          isWelcome: true,
          timestamp: new Date().toISOString(),
        },
      });

      log.info('Welcome notification sent', { userId, username });
    } catch (error) {
      log.error('Failed to send welcome notification', error, { userId });
    }
  }
}

/**
 * Usage examples in route handlers
 */
export class SocketIntegrationExamples {
  /**
   * Example: Trip creation endpoint with Socket.io integration
   */
  static async createTripWithNotifications(tripData: any, userId: string): Promise<any> {
    // 1. Create the trip (database operation)
    // const trip = await TripService.createTrip(tripData, userId);

    // 2. Send real-time notifications
    TripSocketIntegration.onTripCreated(
      'trip-id', // trip.id
      tripData,
      userId
    );

    // 3. Return the trip data
    return { /* trip data */ };
  }

  /**
   * Example: Event creation endpoint with Socket.io integration
   */
  static async createEventWithNotifications(
    tripId: string,
    eventData: any,
    userId: string
  ): Promise<any> {
    // 1. Create the event (database operation)
    // const event = await EventService.createEvent(tripId, eventData, userId);

    // 2. Send real-time notifications
    EventSocketIntegration.onEventCreated(
      tripId,
      'event-id', // event.id
      eventData,
      userId
    );

    // 3. Return the event data
    return { /* event data */ };
  }

  /**
   * Example: Middleware to broadcast user activity
   */
  static trackUserActivity(tripId: string, userId: string, activity: string): void {
    try {
      socketService.sendTripUpdate(tripId, 'trip:updated', {
        activity: {
          type: 'user_activity',
          userId,
          activity,
          timestamp: new Date().toISOString(),
        },
      }, userId); // Exclude the user who performed the activity

      log.debug('User activity tracked', {
        tripId,
        userId,
        activity,
      });
    } catch (error) {
      log.error('Failed to track user activity', error, {
        tripId,
        userId,
        activity,
      });
    }
  }
}