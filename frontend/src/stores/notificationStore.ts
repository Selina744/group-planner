/**
 * Zustand notification store - in-app notification management
 * Handles notifications, read/unread state, and notification actions
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';

// Notification types
export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'trip_invite'
  | 'trip_update'
  | 'member_joined'
  | 'event_added'
  | 'event_updated';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  persistent?: boolean; // If true, won't auto-dismiss
  actionUrl?: string; // Optional URL for notification action
  metadata?: Record<string, any>; // Additional data (trip ID, etc.)
  createdAt: string;
  expiresAt?: string; // When notification should be removed
}

// Toast notification for temporary UI feedback
export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number; // Auto-dismiss after duration (ms), default 5000
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Notification store state
interface NotificationState {
  // Persistent notifications (trip invites, updates, etc.)
  notifications: Notification[];

  // Temporary toast notifications
  toasts: ToastNotification[];

  // UI state
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Settings
  settings: {
    enableToasts: boolean;
    enableSounds: boolean;
    enablePersistent: boolean;
  };
}

// Notification store actions
interface NotificationActions {
  // Notification management
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
  clearReadNotifications: () => void;

  // Toast management
  showToast: (toast: Omit<ToastNotification, 'id'>) => string;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;

  // Convenience methods for common notifications
  showSuccess: (message: string, title?: string, options?: Partial<Omit<ToastNotification, 'id' | 'type' | 'message' | 'title'>>) => string;
  showError: (message: string, title?: string, options?: Partial<Omit<ToastNotification, 'id' | 'type' | 'message' | 'title'>>) => string;
  showWarning: (message: string, title?: string, options?: Partial<Omit<ToastNotification, 'id' | 'type' | 'message' | 'title'>>) => string;
  showInfo: (message: string, title?: string, options?: Partial<Omit<ToastNotification, 'id' | 'type' | 'message' | 'title'>>) => string;

  // Trip-specific notifications
  notifyTripInvite: (tripTitle: string, inviterName: string, tripId: string) => void;
  notifyTripUpdate: (tripTitle: string, updateType: string, tripId: string) => void;
  notifyMemberJoined: (memberName: string, tripTitle: string, tripId: string) => void;
  notifyEventAdded: (eventTitle: string, tripTitle: string, tripId: string) => void;

  // Settings
  updateSettings: (settings: Partial<NotificationState['settings']>) => void;

  // Cleanup
  cleanup: () => void;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

// Initial state
const initialState: NotificationState = {
  notifications: [],
  toasts: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  settings: {
    enableToasts: true,
    enableSounds: true,
    enablePersistent: true,
  },
};

// Helper to generate unique IDs
const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useNotificationStore = create<NotificationStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Add a persistent notification
        addNotification: (notificationData) => {
          const id = generateId();
          const notification: Notification = {
            id,
            ...notificationData,
            createdAt: new Date().toISOString(),
          };

          set(state => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }));

          // Auto-cleanup if expiration is set
          if (notification.expiresAt) {
            const expirationTime = new Date(notification.expiresAt).getTime() - Date.now();
            if (expirationTime > 0) {
              setTimeout(() => {
                get().removeNotification(id);
              }, expirationTime);
            }
          }

          return id;
        },

        // Remove a notification
        removeNotification: (id) => {
          set(state => {
            const notification = state.notifications.find(n => n.id === id);
            const wasUnread = notification && !notification.read;

            return {
              notifications: state.notifications.filter(n => n.id !== id),
              unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
            };
          });
        },

        // Mark notification as read
        markAsRead: (id) => {
          set(state => {
            const notification = state.notifications.find(n => n.id === id);
            if (!notification || notification.read) return state;

            return {
              notifications: state.notifications.map(n =>
                n.id === id ? { ...n, read: true } : n
              ),
              unreadCount: state.unreadCount - 1,
            };
          });
        },

        // Mark notification as unread
        markAsUnread: (id) => {
          set(state => {
            const notification = state.notifications.find(n => n.id === id);
            if (!notification || !notification.read) return state;

            return {
              notifications: state.notifications.map(n =>
                n.id === id ? { ...n, read: false } : n
              ),
              unreadCount: state.unreadCount + 1,
            };
          });
        },

        // Mark all notifications as read
        markAllAsRead: () => {
          set(state => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0,
          }));
        },

        // Clear all notifications
        clearAllNotifications: () => {
          set({
            notifications: [],
            unreadCount: 0,
          });
        },

        // Clear only read notifications
        clearReadNotifications: () => {
          set(state => ({
            notifications: state.notifications.filter(n => !n.read),
          }));
        },

        // Show a toast notification
        showToast: (toastData) => {
          const id = generateId();
          const toast: ToastNotification = {
            id,
            duration: 5000, // Default 5 seconds
            ...toastData,
          };

          set(state => ({
            toasts: [...state.toasts, toast],
          }));

          // Auto-dismiss toast
          if (toast.duration && toast.duration > 0) {
            setTimeout(() => {
              get().hideToast(id);
            }, toast.duration);
          }

          return id;
        },

        // Hide a toast notification
        hideToast: (id) => {
          set(state => ({
            toasts: state.toasts.filter(t => t.id !== id),
          }));
        },

        // Clear all toasts
        clearAllToasts: () => {
          set({ toasts: [] });
        },

        // Convenience methods
        showSuccess: (message, title, options = {}) => {
          return get().showToast({
            type: 'success',
            ...(title && { title }),
            message,
            ...options,
          });
        },

        showError: (message, title, options = {}) => {
          return get().showToast({
            type: 'error',
            ...(title && { title }),
            message,
            duration: 8000, // Errors stay longer by default
            ...options,
          });
        },

        showWarning: (message, title, options = {}) => {
          return get().showToast({
            type: 'warning',
            ...(title && { title }),
            message,
            duration: 6000,
            ...options,
          });
        },

        showInfo: (message, title, options = {}) => {
          return get().showToast({
            type: 'info',
            ...(title && { title }),
            message,
            ...options,
          });
        },

        // Trip-specific notification methods
        notifyTripInvite: (tripTitle, inviterName, tripId) => {
          get().addNotification({
            type: 'trip_invite',
            title: 'Trip Invitation',
            message: `${inviterName} invited you to join "${tripTitle}"`,
            read: false,
            persistent: true,
            actionUrl: `/trips/${tripId}`,
            metadata: { tripId, inviterName },
          });
        },

        notifyTripUpdate: (tripTitle, updateType, tripId) => {
          get().addNotification({
            type: 'trip_update',
            title: 'Trip Updated',
            message: `"${tripTitle}" has been updated: ${updateType}`,
            read: false,
            actionUrl: `/trips/${tripId}`,
            metadata: { tripId, updateType },
          });
        },

        notifyMemberJoined: (memberName, tripTitle, tripId) => {
          get().addNotification({
            type: 'member_joined',
            title: 'New Member Joined',
            message: `${memberName} joined "${tripTitle}"`,
            read: false,
            actionUrl: `/trips/${tripId}`,
            metadata: { tripId, memberName },
          });
        },

        notifyEventAdded: (eventTitle, tripTitle, tripId) => {
          get().addNotification({
            type: 'event_added',
            title: 'Event Added',
            message: `New event "${eventTitle}" added to "${tripTitle}"`,
            read: false,
            actionUrl: `/trips/${tripId}`,
            metadata: { tripId, eventTitle },
          });
        },

        // Update notification settings
        updateSettings: (newSettings) => {
          set(state => ({
            settings: { ...state.settings, ...newSettings },
          }));
        },

        // Cleanup expired notifications
        cleanup: () => {
          const now = new Date().toISOString();
          set(state => {
            const validNotifications = state.notifications.filter(notification =>
              !notification.expiresAt || notification.expiresAt > now
            );

            const unreadRemovedCount = state.notifications
              .filter(n => !validNotifications.includes(n) && !n.read)
              .length;

            return {
              notifications: validNotifications,
              unreadCount: state.unreadCount - unreadRemovedCount,
            };
          });
        },

        // Reset store
        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'notification-store',
        storage: createJSONStorage(() => localStorage),
        // Persist notifications and settings, but not toasts
        partialize: (state) => ({
          notifications: state.notifications,
          unreadCount: state.unreadCount,
          settings: state.settings,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Cleanup expired notifications on rehydration
            setTimeout(() => {
              state.cleanup();
            }, 100);
          }
        },
      }
    )
  )
);

// Selector hooks for optimized re-renders
export const useNotifications = () => useNotificationStore(state => state.notifications);
export const useUnreadNotifications = () => useNotificationStore(state =>
  state.notifications.filter(n => !n.read)
);
export const useUnreadCount = () => useNotificationStore(state => state.unreadCount);
export const useToasts = () => useNotificationStore(state => state.toasts);
export const useNotificationSettings = () => useNotificationStore(state => state.settings);

// Action selectors
export const useNotificationActions = () => useNotificationStore(state => ({
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  markAsRead: state.markAsRead,
  markAsUnread: state.markAsUnread,
  markAllAsRead: state.markAllAsRead,
  clearAllNotifications: state.clearAllNotifications,
  clearReadNotifications: state.clearReadNotifications,
  updateSettings: state.updateSettings,
}));

export const useToastActions = () => useNotificationStore(state => ({
  showToast: state.showToast,
  hideToast: state.hideToast,
  clearAllToasts: state.clearAllToasts,
  showSuccess: state.showSuccess,
  showError: state.showError,
  showWarning: state.showWarning,
  showInfo: state.showInfo,
}));

export const useTripNotificationActions = () => useNotificationStore(state => ({
  notifyTripInvite: state.notifyTripInvite,
  notifyTripUpdate: state.notifyTripUpdate,
  notifyMemberJoined: state.notifyMemberJoined,
  notifyEventAdded: state.notifyEventAdded,
}));