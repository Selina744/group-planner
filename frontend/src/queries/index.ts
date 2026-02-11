/**
 * React Query exports
 * Centralized exports for all query-related functionality
 */

// Core query configuration
export { queryClient, queryClientUtils } from './queryClient';

// Query key factory and types
export { queryKeys, queryKeyUtils } from './queryKeys';
export type {
  QueryKey,
  TripsFilter,
  EventsFilter,
  ItemsFilter,
  NotificationsFilter,
  AnnouncementsFilter,
} from './queryKeys';

// Query hooks
export {
  // Trip hooks
  useTripsQuery,
  useTripQuery,
  useTripMembersQuery,
  useTripEventsQuery,

  // Auth hooks
  useUserQuery,
  useUserSessionsQuery,

  // Search hooks
  useSearchTripsQuery,

  // Mutation hooks
  useCreateTripMutation,
  useUpdateTripMutation,
  useDeleteTripMutation,

  // Utility hooks
  usePrefetchTrip,
  useQueriesLoading,
  useQueriesError,
  useSyncUserWithStore,
  useCacheInvalidation,
} from './hooks';

// Provider and utilities
export { QueryProvider, useQueryUtils } from '../providers/QueryProvider';