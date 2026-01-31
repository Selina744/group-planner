/**
 * Trip Broadcasting Service for Group Planner API
 *
 * This service provides a clean interface for broadcasting trip-related
 * real-time updates to connected clients. It acts as a bridge between
 * business logic services and the Socket.io service.
 */

import { socketService } from './socket.js';
import { log } from '../utils/logger.js';

/**
 * User reference for broadcasting
 */
interface BroadcastUser {
  id: string;
  username?: string;
  email: string;
}

/**
 * Trip broadcasting service class
 */
export class TripBroadcastService {
  /**
   * Broadcast trip details update
   */
  static broadcastTripUpdate(
    tripId: string,
    changes: Record<string, any>,
    updatedBy: BroadcastUser
  ): void {
    try {
      socketService.broadcastTripDetailsUpdate(tripId, changes, updatedBy);

      log.debug('Trip update broadcasted', {
        tripId,
        updatedBy: updatedBy.id,
        changes: Object.keys(changes),
      });
    } catch (error) {
      log.error('Error broadcasting trip update', error, {
        tripId,
        updatedBy: updatedBy.id,
        changes,
      });
    }
  }

  /**
   * Broadcast trip member addition
   */
  static broadcastMemberAdded(
    tripId: string,
    member: {
      id: string;
      username?: string;
      email: string;
      role: string;
    },
    addedBy?: BroadcastUser
  ): void {
    try {
      socketService.broadcastMemberJoin(tripId, member);

      // Send notification to trip members
      socketService.sendNotificationToTripMembers(tripId, {
        type: 'info',
        title: 'New Trip Member',
        message: `${member.username || member.email} joined the trip as ${member.role}`,
        data: { member },
      }, { excludeUserId: member.id });

      log.debug('Member addition broadcasted', {
        tripId,
        newMember: member.id,
        role: member.role,
        addedBy: addedBy?.id,
      });
    } catch (error) {
      log.error('Error broadcasting member addition', error, {
        tripId,
        member,
        addedBy,
      });
    }
  }

  /**
   * Broadcast trip member removal
   */
  static broadcastMemberRemoved(
    tripId: string,
    member: {
      id: string;
      username?: string;
      email: string;
      role: string;
    },
    removedBy?: BroadcastUser
  ): void {
    try {
      socketService.broadcastMemberLeave(tripId, member);

      // Send notification to remaining trip members
      socketService.sendNotificationToTripMembers(tripId, {
        type: 'info',
        title: 'Member Left Trip',
        message: `${member.username || member.email} left the trip`,
        data: { member },
      }, { excludeUserId: member.id });

      log.debug('Member removal broadcasted', {
        tripId,
        removedMember: member.id,
        role: member.role,
        removedBy: removedBy?.id,
      });
    } catch (error) {
      log.error('Error broadcasting member removal', error, {
        tripId,
        member,
        removedBy,
      });
    }
  }

  /**
   * Broadcast member role change
   */
  static broadcastMemberRoleChanged(
    tripId: string,
    member: BroadcastUser,
    oldRole: string,
    newRole: string,
    changedBy: BroadcastUser
  ): void {
    try {
      socketService.broadcastTripUpdate(tripId, 'trip:member_role_changed', {
        member: {
          id: member.id,
          username: member.username,
          email: member.email,
        },
        roleChange: {
          from: oldRole,
          to: newRole,
        },
      }, { updatedBy: changedBy });

      // Send notification to trip members
      socketService.sendNotificationToTripMembers(tripId, {
        type: 'info',
        title: 'Member Role Updated',
        message: `${member.username || member.email} role changed from ${oldRole} to ${newRole}`,
        data: {
          member,
          roleChange: { from: oldRole, to: newRole },
        },
      });

      log.debug('Member role change broadcasted', {
        tripId,
        member: member.id,
        roleChange: `${oldRole} → ${newRole}`,
        changedBy: changedBy.id,
      });
    } catch (error) {
      log.error('Error broadcasting member role change', error, {
        tripId,
        member,
        oldRole,
        newRole,
        changedBy,
      });
    }
  }

  /**
   * Broadcast event creation
   */
  static broadcastEventCreated(
    tripId: string,
    event: {
      id: string;
      title: string;
      [key: string]: any;
    },
    createdBy: BroadcastUser
  ): void {
    try {
      socketService.broadcastEventCreated(tripId, event, createdBy);

      // Send notification to trip members
      socketService.sendNotificationToTripMembers(tripId, {
        type: 'info',
        title: 'New Event Created',
        message: `${createdBy.username || createdBy.email} created "${event.title}"`,
        data: { event },
      }, { excludeUserId: createdBy.id });

      log.debug('Event creation broadcasted', {
        tripId,
        eventId: event.id,
        eventTitle: event.title,
        createdBy: createdBy.id,
      });
    } catch (error) {
      log.error('Error broadcasting event creation', error, {
        tripId,
        event,
        createdBy,
      });
    }
  }

  /**
   * Broadcast event update
   */
  static broadcastEventUpdated(
    tripId: string,
    event: {
      id: string;
      title: string;
      [key: string]: any;
    },
    changes: Record<string, any>,
    updatedBy: BroadcastUser
  ): void {
    try {
      socketService.broadcastEventUpdated(tripId, event, changes, updatedBy);

      // Send notification to trip members
      socketService.sendNotificationToTripMembers(tripId, {
        type: 'info',
        title: 'Event Updated',
        message: `${updatedBy.username || updatedBy.email} updated "${event.title}"`,
        data: { event, changes },
      }, { excludeUserId: updatedBy.id });

      log.debug('Event update broadcasted', {
        tripId,
        eventId: event.id,
        eventTitle: event.title,
        changes: Object.keys(changes),
        updatedBy: updatedBy.id,
      });
    } catch (error) {
      log.error('Error broadcasting event update', error, {
        tripId,
        event,
        changes,
        updatedBy,
      });
    }
  }

  /**
   * Broadcast event deletion
   */
  static broadcastEventDeleted(
    tripId: string,
    event: {
      id: string;
      title: string;
    },
    deletedBy: BroadcastUser
  ): void {
    try {
      socketService.broadcastEventDeleted(tripId, event.id, deletedBy);

      // Send notification to trip members
      socketService.sendNotificationToTripMembers(tripId, {
        type: 'warning',
        title: 'Event Deleted',
        message: `${deletedBy.username || deletedBy.email} deleted "${event.title}"`,
        data: { eventId: event.id, eventTitle: event.title },
      }, { excludeUserId: deletedBy.id });

      log.debug('Event deletion broadcasted', {
        tripId,
        eventId: event.id,
        eventTitle: event.title,
        deletedBy: deletedBy.id,
      });
    } catch (error) {
      log.error('Error broadcasting event deletion', error, {
        tripId,
        event,
        deletedBy,
      });
    }
  }

  /**
   * Broadcast RSVP update
   */
  static broadcastRsvpUpdated(
    tripId: string,
    eventId: string,
    eventTitle: string,
    user: BroadcastUser,
    rsvpStatus: string
  ): void {
    try {
      socketService.broadcastTripUpdate(tripId, 'event:rsvp_updated', {
        eventId,
        eventTitle,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        rsvpStatus,
      });

      // Send notification to trip members
      const statusMessage = rsvpStatus === 'YES' ? 'will attend' :
                          rsvpStatus === 'NO' ? 'cannot attend' : 'might attend';

      socketService.sendNotificationToTripMembers(tripId, {
        type: 'info',
        title: 'RSVP Update',
        message: `${user.username || user.email} ${statusMessage} "${eventTitle}"`,
        data: { eventId, rsvpStatus, user },
      }, { excludeUserId: user.id });

      log.debug('RSVP update broadcasted', {
        tripId,
        eventId,
        user: user.id,
        rsvpStatus,
      });
    } catch (error) {
      log.error('Error broadcasting RSVP update', error, {
        tripId,
        eventId,
        user,
        rsvpStatus,
      });
    }
  }

  /**
   * Broadcast item assignment
   */
  static broadcastItemAssigned(
    tripId: string,
    item: {
      id: string;
      title: string;
      [key: string]: any;
    },
    assignedTo: BroadcastUser,
    assignedBy: BroadcastUser
  ): void {
    try {
      socketService.broadcastItemAssigned(tripId, item, assignedTo, assignedBy);

      // Send notification to assigned user
      socketService.sendNotificationToTripMembers(tripId, {
        type: 'info',
        title: 'Item Assigned',
        message: `You have been assigned "${item.title}"`,
        data: { item, assignedBy },
      }, { targetRoles: [], excludeUserId: assignedBy.id });

      // Send notification to other members
      socketService.sendNotificationToTripMembers(tripId, {
        type: 'info',
        title: 'Item Assigned',
        message: `${assignedBy.username || assignedBy.email} assigned "${item.title}" to ${assignedTo.username || assignedTo.email}`,
        data: { item, assignedTo },
      }, { excludeUserId: assignedBy.id });

      log.debug('Item assignment broadcasted', {
        tripId,
        itemId: item.id,
        itemTitle: item.title,
        assignedTo: assignedTo.id,
        assignedBy: assignedBy.id,
      });
    } catch (error) {
      log.error('Error broadcasting item assignment', error, {
        tripId,
        item,
        assignedTo,
        assignedBy,
      });
    }
  }

  /**
   * Broadcast item status change
   */
  static broadcastItemStatusChanged(
    tripId: string,
    item: {
      id: string;
      title: string;
      [key: string]: any;
    },
    oldStatus: string,
    newStatus: string,
    changedBy: BroadcastUser
  ): void {
    try {
      socketService.broadcastItemStatusChanged(tripId, item, oldStatus, newStatus, changedBy);

      // Send notification for completed items
      if (newStatus === 'COMPLETED') {
        socketService.sendNotificationToTripMembers(tripId, {
          type: 'success',
          title: 'Item Completed',
          message: `${changedBy.username || changedBy.email} completed "${item.title}"`,
          data: { item, statusChange: { from: oldStatus, to: newStatus } },
        }, { excludeUserId: changedBy.id });
      }

      log.debug('Item status change broadcasted', {
        tripId,
        itemId: item.id,
        itemTitle: item.title,
        statusChange: `${oldStatus} → ${newStatus}`,
        changedBy: changedBy.id,
      });
    } catch (error) {
      log.error('Error broadcasting item status change', error, {
        tripId,
        item,
        oldStatus,
        newStatus,
        changedBy,
      });
    }
  }

  /**
   * Broadcast location update
   */
  static broadcastLocationUpdated(
    tripId: string,
    newLocation: any,
    updatedBy: BroadcastUser
  ): void {
    try {
      socketService.broadcastTripUpdate(tripId, 'location:updated', {
        location: newLocation,
      }, { updatedBy });

      // Send notification to trip members
      socketService.sendNotificationToTripMembers(tripId, {
        type: 'info',
        title: 'Location Updated',
        message: `${updatedBy.username || updatedBy.email} updated the trip location`,
        data: { location: newLocation },
      }, { excludeUserId: updatedBy.id });

      log.debug('Location update broadcasted', {
        tripId,
        location: newLocation,
        updatedBy: updatedBy.id,
      });
    } catch (error) {
      log.error('Error broadcasting location update', error, {
        tripId,
        newLocation,
        updatedBy,
      });
    }
  }

  /**
   * Send custom notification to trip members
   */
  static sendCustomNotification(
    tripId: string,
    notification: {
      type: 'info' | 'warning' | 'error' | 'success';
      title: string;
      message: string;
      data?: any;
      persistent?: boolean;
    },
    options: {
      excludeUserId?: string;
      targetRoles?: string[];
    } = {}
  ): void {
    try {
      socketService.sendNotificationToTripMembers(tripId, notification, options);

      log.debug('Custom notification sent', {
        tripId,
        notificationType: notification.type,
        title: notification.title,
        excludeUserId: options.excludeUserId,
        targetRoles: options.targetRoles,
      });
    } catch (error) {
      log.error('Error sending custom notification', error, {
        tripId,
        notification,
        options,
      });
    }
  }

  /**
   * Get trip room statistics
   */
  static getTripRoomStats(tripId: string) {
    try {
      return socketService.getTripRoomStats(tripId);
    } catch (error) {
      log.error('Error getting trip room stats', error, { tripId });
      return {
        tripId,
        roomName: `trip:${tripId}`,
        activeConnections: 0,
        members: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export the service
export default TripBroadcastService;