/**
 * React Query helper hooks
 * Provides common query patterns and integrations with existing services
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { TripService } from '../services/tripService';
import { AuthService } from '../services/authService';
import type { Trip } from '../types';
import type { TripsFilter } from './queryKeys';

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

// Get trip events (placeholder - getTripEvents method not yet implemented)
export function useTripEventsQuery(tripId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.trips.events(tripId),
    queryFn: () => Promise.resolve([]), // TODO: implement TripService.getTripEvents
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

// Update trip mutation
export function useUpdateTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId, updateData }: { tripId: string; updateData: Partial<Trip> }) =>
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

    // Clear all caches (useful for logout)
    clearAll: () => queryClient.clear(),
  };
}