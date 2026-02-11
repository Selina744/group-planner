/**
 * Query key factory for React Query
 * Provides typed, consistent query keys across the application
 *
 * Pattern: [entity, ...identifiers, filters]
 * Example: ['trips', 'user', userId] or ['trips', 'detail', tripId]
 */

// Core query key factory
export const queryKeys = {
  // Trips
  trips: {
    all: ['trips'] as const,
    lists: () => [...queryKeys.trips.all, 'list'] as const,
    list: (filters?: TripsFilter) => [...queryKeys.trips.lists(), { filters }] as const,
    details: () => [...queryKeys.trips.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.trips.details(), id] as const,
    members: (tripId: string) => [...queryKeys.trips.detail(tripId), 'members'] as const,
    events: (tripId: string) => [...queryKeys.trips.detail(tripId), 'events'] as const,
    items: (tripId: string) => [...queryKeys.trips.detail(tripId), 'items'] as const,
  },

  // Events
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (tripId?: string, filters?: EventsFilter) =>
      [...queryKeys.events.lists(), { tripId, filters }] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
  },

  // Items
  items: {
    all: ['items'] as const,
    lists: () => [...queryKeys.items.all, 'list'] as const,
    list: (tripId?: string, filters?: ItemsFilter) =>
      [...queryKeys.items.lists(), { tripId, filters }] as const,
    details: () => [...queryKeys.items.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.items.details(), id] as const,
    claims: (itemId: string) => [...queryKeys.items.detail(itemId), 'claims'] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters?: NotificationsFilter) =>
      [...queryKeys.notifications.lists(), { filters }] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
    unreadCount: () => [...queryKeys.notifications.unread(), 'count'] as const,
  },

  // Announcements
  announcements: {
    all: ['announcements'] as const,
    lists: () => [...queryKeys.announcements.all, 'list'] as const,
    list: (tripId?: string, filters?: AnnouncementsFilter) =>
      [...queryKeys.announcements.lists(), { tripId, filters }] as const,
    details: () => [...queryKeys.announcements.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.announcements.details(), id] as const,
    pinned: (tripId?: string) => [...queryKeys.announcements.all, 'pinned', { tripId }] as const,
  },

  // User preferences
  preferences: {
    all: ['preferences'] as const,
    user: (userId?: string) => [...queryKeys.preferences.all, 'user', userId] as const,
    settings: (category?: string) =>
      [...queryKeys.preferences.all, 'settings', { category }] as const,
  },

  // Authentication & user data
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    sessions: () => [...queryKeys.auth.all, 'sessions'] as const,
    permissions: () => [...queryKeys.auth.all, 'permissions'] as const,
  },

  // Search
  search: {
    all: ['search'] as const,
    trips: (query: string) => [...queryKeys.search.all, 'trips', query] as const,
    users: (query: string) => [...queryKeys.search.all, 'users', query] as const,
    global: (query: string) => [...queryKeys.search.all, 'global', query] as const,
  },
} as const;

// Filter types for query parameters
export interface TripsFilter {
  search?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
  status?: string;
}

export interface EventsFilter {
  startDate?: string;
  endDate?: string;
  category?: string;
  status?: string;
}

export interface ItemsFilter {
  category?: string;
  status?: string;
  claimedBy?: string;
}

export interface NotificationsFilter {
  unread?: boolean;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface AnnouncementsFilter {
  pinned?: boolean;
  startDate?: string;
  endDate?: string;
  category?: string;
}

// Query key type helpers for better type safety
export type QueryKey = readonly unknown[];

// Utility functions for query key manipulation
export const queryKeyUtils = {
  /**
   * Check if two query keys match at a given depth
   */
  matches: (key1: QueryKey, key2: QueryKey, depth?: number): boolean => {
    const compareDepth = depth ?? Math.min(key1.length, key2.length);
    return key1.slice(0, compareDepth).every((part, index) =>
      part === key2[index]
    );
  },

  /**
   * Get the base entity from a query key
   */
  getEntity: (key: QueryKey): string => {
    return String(key[0]);
  },

  /**
   * Check if key belongs to a specific entity
   */
  isEntity: (key: QueryKey, entity: string): boolean => {
    return queryKeyUtils.getEntity(key) === entity;
  },
} as const;

export default queryKeys;