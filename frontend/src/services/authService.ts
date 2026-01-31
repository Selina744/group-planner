/**
 * Authentication service for handling auth operations
 * Uses the configured API client with JWT interceptor
 */

import { apiClient } from '../api/client';
import { tokenManager } from '../utils/tokenManager';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  ChangePasswordRequest,
  UpdateProfileRequest,
  PasswordResetConfirm,
} from '../types/auth';

export class AuthService {
  /**
   * Login user with email/username and password
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.publicRequest<LoginResponse>({
        method: 'POST',
        url: '/auth/login',
        data: credentials,
      });

      // Store tokens
      tokenManager.setTokens(response.accessToken, response.refreshToken);

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await apiClient.publicRequest<RegisterResponse>({
        method: 'POST',
        url: '/auth/register',
        data: userData,
      });

      // Store tokens
      tokenManager.setTokens(response.accessToken, response.refreshToken);

      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      const refreshToken = tokenManager.getRefreshToken();

      if (refreshToken) {
        // Call logout endpoint to revoke tokens server-side
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Continue with local logout even if server call fails
      console.warn('Server logout failed:', error);
    } finally {
      // Always clear local tokens
      tokenManager.clearTokens();

      // Emit logout event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-state-change', {
          detail: {
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          }
        }));
      }
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      return response;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updateData: UpdateProfileRequest): Promise<User> {
    try {
      const response = await apiClient.put<User>('/auth/me', updateData);
      return response;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    try {
      await apiClient.put('/auth/password', passwordData);
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  }

  /**
   * Check authentication status
   */
  static async checkAuth(): Promise<{ authenticated: boolean; user: User | null }> {
    try {
      const response = await apiClient.get<{ authenticated: boolean; user: User | null }>('/auth/check');
      return response;
    } catch (error) {
      // If check fails, user is likely not authenticated
      return { authenticated: false, user: null };
    }
  }

  /**
   * Validate email availability
   */
  static async validateEmail(email: string): Promise<{ available: boolean }> {
    try {
      const response = await apiClient.publicRequest<{ email: string; available: boolean }>({
        method: 'POST',
        url: '/auth/validate-email',
        data: { email },
      });
      return { available: response.available };
    } catch (error) {
      console.error('Email validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate username availability
   */
  static async validateUsername(username: string): Promise<{ available: boolean }> {
    try {
      const response = await apiClient.publicRequest<{ username: string; available: boolean }>({
        method: 'POST',
        url: '/auth/validate-username',
        data: { username },
      });
      return { available: response.available };
    } catch (error) {
      console.error('Username validation failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiClient.publicRequest({
        method: 'POST',
        url: '/auth/request-password-reset',
        data: { email },
      });
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Confirm password reset with token
   */
  static async confirmPasswordReset(resetData: PasswordResetConfirm): Promise<void> {
    try {
      await apiClient.publicRequest({
        method: 'POST',
        url: '/auth/reset-password',
        data: resetData,
      });
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(): Promise<void> {
    try {
      await apiClient.post('/auth/send-verification');
    } catch (error) {
      console.error('Failed to send email verification:', error);
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      await apiClient.publicRequest({
        method: 'POST',
        url: '/auth/verify-email',
        data: { token },
      });
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Get user's active sessions
   */
  static async getActiveSessions(): Promise<Array<{
    id: string;
    tokenId: string;
    createdAt: string;
    expiresAt: string;
    userAgent?: string;
    ipAddress?: string;
    isCurrent: boolean;
  }>> {
    try {
      const response = await apiClient.get<{ sessions: any[] }>('/auth/sessions');
      return response.sessions;
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions
   */
  static async revokeAllSessions(): Promise<void> {
    try {
      await apiClient.delete('/auth/sessions');
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
      throw error;
    }
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(tokenId: string): Promise<void> {
    try {
      await apiClient.delete(`/auth/sessions/${tokenId}`);
    } catch (error) {
      console.error('Failed to revoke session:', error);
      throw error;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  static isAuthenticated(): boolean {
    return tokenManager.isAuthenticated();
  }

  /**
   * Get current access token
   */
  static getAccessToken(): string | null {
    return tokenManager.getAccessToken();
  }

  /**
   * Initialize authentication (call on app startup)
   */
  static async initialize(): Promise<boolean> {
    try {
      return await apiClient.initialize();
    } catch (error) {
      console.error('Auth initialization failed:', error);
      return false;
    }
  }
}