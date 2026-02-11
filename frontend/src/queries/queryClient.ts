/**
 * React Query client configuration
 * Configured with staleTime 5min, retry 1 as specified in requirements
 */

import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

// Default query options as specified in requirements
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Data is fresh for 5 minutes before becoming stale
    staleTime: 5 * 60 * 1000, // 5 minutes in milliseconds

    // Only retry failed requests once
    retry: 1,

    // Cache time - how long data stays in cache after becoming unused
    gcTime: 10 * 60 * 1000, // 10 minutes (default, but explicit)

    // Refetch on window focus (good UX for real-time updates)
    refetchOnWindowFocus: true,

    // Don't refetch on reconnect by default (can be overridden per query)
    refetchOnReconnect: false,

    // Background refetch interval (disabled by default)
    refetchInterval: false,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,

    // Don't retry network errors for mutations
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
};

// Create and configure the QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: defaultQueryOptions,
});

// Export query client for use in providers and testing
export default queryClient;

// Query client utils for advanced usage
export const queryClientUtils = {
  /**
   * Clear all queries for a specific entity
   */
  clearEntity: (entity: string) => {
    queryClient.removeQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && queryKey[0] === entity;
      }
    });
  },

  /**
   * Invalidate all queries for a specific entity
   */
  invalidateEntity: (entity: string) => {
    return queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && queryKey[0] === entity;
      }
    });
  },

  /**
   * Reset query client (useful for logout)
   */
  reset: () => {
    queryClient.clear();
  },

  /**
   * Get cache stats for debugging
   */
  getCacheStats: () => {
    const queries = queryClient.getQueryCache().getAll();
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      inactiveQueries: queries.filter(q => q.getObserversCount() === 0).length,
    };
  },
} as const;