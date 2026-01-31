/**
 * React hooks for API requests with authentication handling
 * Provides convenient methods for making authenticated API calls
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { AuthError } from '../types/auth';

// Hook state interface
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: AuthError | null;
}

// Hook return type
interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: AuthError | null;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

/**
 * Generic hook for API requests
 */
export function useApi<T = any>(
  apiCall: (...args: any[]) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      setState({ data: null, loading: true, error: null });

      try {
        const result = await apiCall(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error: any) {
        const apiError: AuthError = {
          message: error.message || 'An error occurred',
          code: error.code,
          status: error.status,
        };
        setState({ data: null, loading: false, error: apiError });
        throw error;
      }
    },
    [apiCall]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
    reset,
  };
}

/**
 * Hook for making GET requests
 */
export function useGet<T = any>(url?: string): UseApiReturn<T> {
  const apiCall = useCallback(
    (requestUrl?: string) => apiClient.get<T>(requestUrl || url!),
    [url]
  );

  return useApi(apiCall);
}

/**
 * Hook for making POST requests
 */
export function usePost<T = any>(url?: string): UseApiReturn<T> {
  const apiCall = useCallback(
    (data: any, requestUrl?: string) => apiClient.post<T>(requestUrl || url!, data),
    [url]
  );

  return useApi(apiCall);
}

/**
 * Hook for making PUT requests
 */
export function usePut<T = any>(url?: string): UseApiReturn<T> {
  const apiCall = useCallback(
    (data: any, requestUrl?: string) => apiClient.put<T>(requestUrl || url!, data),
    [url]
  );

  return useApi(apiCall);
}

/**
 * Hook for making PATCH requests
 */
export function usePatch<T = any>(url?: string): UseApiReturn<T> {
  const apiCall = useCallback(
    (data: any, requestUrl?: string) => apiClient.patch<T>(requestUrl || url!, data),
    [url]
  );

  return useApi(apiCall);
}

/**
 * Hook for making DELETE requests
 */
export function useDelete<T = any>(url?: string): UseApiReturn<T> {
  const apiCall = useCallback(
    (requestUrl?: string) => apiClient.delete<T>(requestUrl || url!),
    [url]
  );

  return useApi(apiCall);
}

/**
 * Hook for paginated API requests
 */
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UsePaginatedApiReturn<T> extends Omit<UseApiReturn<PaginatedResponse<T>>, 'execute'> {
  items: T[];
  pagination: PaginatedResponse<T>['pagination'] | null;
  loadPage: (page: number, limit?: number) => Promise<PaginatedResponse<T>>;
  loadMore: () => Promise<PaginatedResponse<T>>;
  refresh: () => Promise<PaginatedResponse<T>>;
}

export function usePaginatedApi<T = any>(
  url: string,
  initialPage = 1,
  initialLimit = 20
): UsePaginatedApiReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentLimit, setCurrentLimit] = useState(initialLimit);

  const apiCall = useCallback(
    (page: number, limit: number) =>
      apiClient.get<PaginatedResponse<T>>(url, {
        params: { page, limit },
      }),
    [url]
  );

  const { data, loading, error, execute, reset } = useApi(apiCall);

  const loadPage = useCallback(
    async (page: number, limit = currentLimit): Promise<PaginatedResponse<T>> => {
      setCurrentPage(page);
      setCurrentLimit(limit);
      return execute(page, limit);
    },
    [execute, currentLimit]
  );

  const loadMore = useCallback(async (): Promise<PaginatedResponse<T>> => {
    if (data?.pagination.hasNext) {
      return loadPage(currentPage + 1);
    }
    return data!;
  }, [data, currentPage, loadPage]);

  const refresh = useCallback((): Promise<PaginatedResponse<T>> => {
    return loadPage(currentPage);
  }, [currentPage, loadPage]);

  return {
    data,
    loading,
    error,
    reset,
    items: data?.data || [],
    pagination: data?.pagination || null,
    loadPage,
    loadMore,
    refresh,
  };
}

/**
 * Hook for file upload with progress
 */
interface UseFileUploadReturn {
  upload: (file: File, url: string, fieldName?: string) => Promise<any>;
  progress: number;
  loading: boolean;
  error: AuthError | null;
}

export function useFileUpload(): UseFileUploadReturn {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const upload = useCallback(async (file: File, url: string, fieldName = 'file') => {
    setLoading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const response = await apiClient.request({
        method: 'POST',
        url,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      });

      setLoading(false);
      return response;
    } catch (error: any) {
      const apiError: AuthError = {
        message: error.message || 'Upload failed',
        code: error.code,
        status: error.status,
      };
      setError(apiError);
      setLoading(false);
      throw error;
    }
  }, []);

  return { upload, progress, loading, error };
}