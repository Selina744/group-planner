/**
 * React Query helper hooks
 * Provides common query patterns and integrations with existing services
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { TripService } from '../services/tripService';
import { AuthService } from '../services/authService';
import { EventService } from '../services/eventService';
import { ItemService } from '../services/itemService';
import { NotificationService, type NotificationFilters } from '../services/notificationService';
import type { CreateTripForm, UpdateEventForm, UpdateItemForm, CreateClaimForm, UpdateClaimForm } from '../types';
import type { TripsFilter, ItemsFilter, NotificationsFilter } from './queryKeys';

/**
 * Trip-related query hooks
 */

// Get user's trips list
export function useTripsQuery(filters?: TripsFilter) {
  return useQuery({
    queryKey: queryKeys.trips.list(filters),
    queryFn: () => TripService.getUserTrips(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes (inherited from global config)
  });
}

// Get specific trip details
export function useTripQuery(tripId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.trips.detail(tripId),
    queryFn: () => TripService.getTripById(tripId),
    enabled: enabled && !!tripId,
  });
}

// Get trip members
export function useTripMembersQuery(tripId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.trips.members(tripId),
    queryFn: () => TripService.getTripMembers(tripId),
    enabled: enabled && !!tripId,
  });
}

// Get trip events
export function useTripEventsQuery(tripId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.trips.events(tripId),
    queryFn: () => EventService.getTripEvents({ tripId }),
    enabled: enabled && !!tripId,
  });
}

/**
 * Authentication-related query hooks
 */

// Get current user data
export function useUserQuery() {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: () => AuthService.getCurrentUser(),
    // Longer stale time for user data since it changes less frequently
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Get user sessions
export function useUserSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.auth.sessions(),
    queryFn: () => AuthService.getActiveSessions(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Search-related query hooks
 */

// Search trips
export function useSearchTripsQuery(query: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.search.trips(query),
    queryFn: () => TripService.searchPublicTrips({ query }),
    enabled: enabled && query.length >= 2, // Only search if query is at least 2 characters
    staleTime: 2 * 60 * 1000, // Shorter stale time for search results
  });
}

/**
 * Item-related query hooks
 */

// Get trip items
export function useTripItemsQuery(tripId: string, filters?: ItemsFilter, enabled = true) {
  return useQuery({
    queryKey: queryKeys.items.list(tripId, filters),
    queryFn: () => ItemService.getTripItems({ tripId, ...filters }),
    enabled: enabled && !!tripId,
  });
}

// Get specific item details
export function useItemQuery(itemId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.items.detail(itemId),
    queryFn: () => ItemService.getItemById(itemId),
    enabled: enabled && !!itemId,
  });
}

// Get trip item statistics
export function useTripItemStatsQuery(tripId: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.trips.items(tripId), 'stats'],
    queryFn: () => ItemService.getTripItemStats(tripId),
    enabled: enabled && !!tripId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Notification-related query hooks
 */

// Get notifications list
export function useNotificationsQuery(filters?: NotificationsFilter, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: () => NotificationService.getNotifications(filters as NotificationFilters),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Get unread notifications count
export function useUnreadNotificationsCountQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => NotificationService.getUnreadCount(),
    enabled,
    staleTime: 30 * 1000, // 30 seconds - refresh more frequently
    refetchInterval: 60 * 1000, // Poll every minute
  });
}

// Mark notification as read mutation
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: NotificationService.markAsRead,
    onSuccess: () => {
      // Invalidate notifications list and unread count
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}

// Mark notification as unread mutation
export function useMarkNotificationUnreadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: NotificationService.markAsUnread,
    onSuccess: () => {
      // Invalidate notifications list and unread count
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}

// Mark all notifications as read mutation
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: NotificationService.markAllAsRead,
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

// Delete notification mutation
export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: NotificationService.deleteNotification,
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

// Delete all read notifications mutation
export function useDeleteReadNotificationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: NotificationService.deleteReadNotifications,
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Mutation hooks for data modification
 */

// Create trip mutation
export function useCreateTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: TripService.createTrip,
    onSuccess: (newTrip) => {
      // Invalidate trips list to refetch with new trip included
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.lists() });

      // Optionally set the query data for the new trip to avoid refetch
      queryClient.setQueryData(queryKeys.trips.detail(newTrip.id), newTrip);
    },
    onError: (error) => {
      console.error('Failed to create trip:', error);
    },
  });
}

// Update trip mutation - uses Partial<CreateTripForm> to match service
export function useUpdateTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId, updateData }: { tripId: string; updateData: Partial<CreateTripForm> }) =>
      TripService.updateTrip(tripId, updateData),
    onSuccess: (updatedTrip) => {
      // Update the specific trip in cache
      queryClient.setQueryData(queryKeys.trips.detail(updatedTrip.id), updatedTrip);

      // Invalidate trips list to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.lists() });
    },
  });
}

// Delete trip mutation
export function useDeleteTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: TripService.deleteTrip,
    onSuccess: (_, tripId) => {
      // Remove the specific trip from cache
      queryClient.removeQueries({ queryKey: queryKeys.trips.detail(tripId) });

      // Invalidate trips list
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.lists() });
    },
  });
}

/**
 * Utility hooks for common patterns
 */

// Prefetch trip details (useful for hover states, etc.)
export function usePrefetchTrip() {
  const queryClient = useQueryClient();

  return (tripId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.trips.detail(tripId),
      queryFn: () => TripService.getTripById(tripId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

// Check if data is loading for multiple queries
export function useQueriesLoading(...queries: UseQueryResult[]) {
  return queries.some((query) => query.isLoading);
}

// Check if any queries have errors
export function useQueriesError(...queries: UseQueryResult[]) {
  const errors = queries.map((query) => query.error).filter(Boolean);
  return errors.length > 0 ? errors : null;
}

/**
 * Integration helpers for existing Zustand stores
 */

// Sync React Query user data with auth store
export function useSyncUserWithStore() {
  const { data: user, error } = useUserQuery();
  // This could update the Zustand auth store when user data changes
  // Implementation would depend on specific requirements

  return { user, error };
}

/**
 * Event-related mutation hooks
 */

// Create event mutation
export function useCreateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: EventService.createEvent,
    onSuccess: (newEvent) => {
      // Invalidate events list for the trip
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.events(newEvent.tripId) });
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
    },
  });
}

// Update event mutation
export function useUpdateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, updateData }: { eventId: string; updateData: UpdateEventForm }) =>
      EventService.updateEvent(eventId, updateData),
    onSuccess: (updatedEvent) => {
      // Invalidate events list for the trip
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.events(updatedEvent.tripId) });
    },
  });
}

// Delete event mutation
export function useDeleteEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: EventService.deleteEvent,
    onSuccess: () => {
      // Invalidate all events queries
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
    },
  });
}

// Update event status mutation (approve/cancel)
export function useUpdateEventStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, status, reason }: { eventId: string; status: 'APPROVED' | 'CANCELLED'; reason?: string }) =>
      EventService.updateEventStatus(eventId, status, reason),
    onSuccess: (updatedEvent) => {
      // Invalidate events list for the trip
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.events(updatedEvent.tripId) });
    },
  });
}

/**
 * Item mutation hooks
 */

// Create item mutation
export function useCreateItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ItemService.createItem,
    onSuccess: (newItem) => {
      // Invalidate items list for the trip
      queryClient.invalidateQueries({ queryKey: queryKeys.items.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.items(newItem.tripId) });

      // Set the query data for the new item
      queryClient.setQueryData(queryKeys.items.detail(newItem.id), newItem);
    },
  });
}

// Update item mutation
export function useUpdateItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, updateData }: { itemId: string; updateData: UpdateItemForm }) =>
      ItemService.updateItem(itemId, updateData),
    onSuccess: (updatedItem) => {
      // Update the specific item in cache
      queryClient.setQueryData(queryKeys.items.detail(updatedItem.id), updatedItem);

      // Invalidate items list
      queryClient.invalidateQueries({ queryKey: queryKeys.items.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.items(updatedItem.tripId) });
    },
  });
}

// Delete item mutation
export function useDeleteItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ItemService.deleteItem,
    onSuccess: (_, itemId) => {
      // Remove the specific item from cache
      queryClient.removeQueries({ queryKey: queryKeys.items.detail(itemId) });

      // Invalidate items list
      queryClient.invalidateQueries({ queryKey: queryKeys.items.lists() });
    },
  });
}

// Claim item mutation
export function useClaimItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, claimData }: { itemId: string; claimData: CreateClaimForm }) =>
      ItemService.claimItem(itemId, claimData),
    onSuccess: (_, { itemId }) => {
      // Invalidate item details to refetch with new claim
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(itemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items.lists() });
    },
  });
}

// Update claim mutation
export function useUpdateClaimMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, updateData }: { claimId: string; updateData: UpdateClaimForm }) =>
      ItemService.updateClaim(claimId, updateData),
    onSuccess: () => {
      // Invalidate all items to refresh claim data
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    },
  });
}

// Cancel claim mutation
export function useCancelClaimMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ItemService.cancelClaim,
    onSuccess: () => {
      // Invalidate all items to refresh claim data
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    },
  });
}

// Cache invalidation helpers
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  return {
    // Invalidate all trip-related queries
    invalidateTrips: () => queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),

    // Invalidate specific trip and related data
    invalidateTrip: (tripId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.detail(tripId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.members(tripId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.events(tripId) });
    },

    // Invalidate all notification queries
    invalidateNotifications: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),

    // Clear all caches (useful for logout)
    clearAll: () => queryClient.clear(),
  };
}
