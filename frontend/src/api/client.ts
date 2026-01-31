/**
 * Axios client with JWT token refresh interceptor
 * Handles automatic token attachment and refresh for authenticated requests
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { tokenManager } from '../utils/tokenManager';
import type { TokenRefreshResponse, AuthError } from '../types/auth';

// Types for interceptor handling
interface QueuedRequest {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: QueuedRequest[] = [];

  constructor() {
    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: this.getBaseURL(),
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Get base URL for API calls
   */
  private getBaseURL(): string {
    // Use environment variable or default to local development
    return (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor: Add authorization header
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = tokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor: Handle token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Check if error is 401/403 and we haven't already tried to refresh
        if (
          (error.response?.status === 401 || error.response?.status === 403) &&
          !originalRequest._retry
        ) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            this.processQueue(null, newToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshToken(): Promise<string> {
    const refreshToken = tokenManager.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      // Call the refresh endpoint without interceptors to avoid infinite loop
      const response = await axios.post<TokenRefreshResponse>(
        `${this.getBaseURL()}/auth/refresh`,
        { refreshToken },
        { timeout: 10000 }
      );

      const { accessToken, refreshToken: newRefreshToken, user } = response.data;

      // Update tokens
      tokenManager.setTokens(accessToken, newRefreshToken);

      // Emit auth state change event
      this.emitAuthStateChange({
        user,
        accessToken,
        refreshToken: newRefreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Process queued requests after token refresh
   */
  private processQueue(error: any, token: string | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });

    this.failedQueue = [];
  }

  /**
   * Handle authentication failure (logout user)
   */
  private handleAuthFailure(): void {
    tokenManager.clearTokens();

    // Emit logout event
    this.emitAuthStateChange({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: 'Authentication failed. Please login again.',
    });

    // Redirect to login page
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  /**
   * Emit auth state change event for state management
   */
  private emitAuthStateChange(authState: any): void {
    // Custom event for auth state changes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-state-change', { detail: authState }));
    }
  }

  /**
   * Normalize axios error to consistent format
   */
  private normalizeError(error: AxiosError): AuthError {
    if (error.response?.data) {
      const data = error.response.data as any;
      return {
        message: data.message || data.error || 'Request failed',
        code: data.code,
        status: error.response.status,
      };
    }

    if (error.code === 'ECONNABORTED') {
      return {
        message: 'Request timeout. Please check your connection.',
        code: 'TIMEOUT',
        status: 408,
      };
    }

    if (error.code === 'ERR_NETWORK') {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'UNKNOWN',
      status: error.response?.status || 0,
    };
  }

  /**
   * Make authenticated request
   */
  public async request<T = any>(config: any): Promise<T> {
    try {
      const response = await this.client(config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * GET request
   */
  public async get<T = any>(url: string, config = {}): Promise<T> {
    return this.request<T>({ method: 'GET', url, ...config });
  }

  /**
   * POST request
   */
  public async post<T = any>(url: string, data = {}, config = {}): Promise<T> {
    return this.request<T>({ method: 'POST', url, data, ...config });
  }

  /**
   * PUT request
   */
  public async put<T = any>(url: string, data = {}, config = {}): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data, ...config });
  }

  /**
   * PATCH request
   */
  public async patch<T = any>(url: string, data = {}, config = {}): Promise<T> {
    return this.request<T>({ method: 'PATCH', url, data, ...config });
  }

  /**
   * DELETE request
   */
  public async delete<T = any>(url: string, config = {}): Promise<T> {
    return this.request<T>({ method: 'DELETE', url, ...config });
  }

  /**
   * Make request without authentication (public endpoints)
   */
  public async publicRequest<T = any>(config: any): Promise<T> {
    try {
      // Create temporary instance without interceptors for public requests
      const publicClient = axios.create({
        baseURL: this.getBaseURL(),
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await publicClient(config);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error as AxiosError);
    }
  }

  /**
   * Initialize the client (call on app startup)
   */
  public async initialize(): Promise<boolean> {
    const { hasRefreshToken } = tokenManager.initialize();

    if (hasRefreshToken) {
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        console.warn('Failed to refresh token on initialization:', error);
        tokenManager.clearTokens();
        return false;
      }
    }

    return false;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();