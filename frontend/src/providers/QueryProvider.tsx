/**
 * React Query Provider - TanStack Query integration
 * Provides React Query context for server state management
 */

import { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient, queryClientUtils } from '../queries/queryClient';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* Development tools - only shows in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  );
}

/**
 * Hook to access query client utilities
 * Provides common query management functions
 */
export function useQueryUtils() {
  return {
    // Clear specific entity queries
    clearEntity: queryClientUtils.clearEntity,

    // Invalidate specific entity queries
    invalidateEntity: queryClientUtils.invalidateEntity,

    // Reset all queries (useful for logout)
    resetQueries: queryClientUtils.reset,

    // Get cache statistics
    getCacheStats: queryClientUtils.getCacheStats,

    // Direct access to query client for advanced usage
    queryClient,
  };
}

export default QueryProvider;