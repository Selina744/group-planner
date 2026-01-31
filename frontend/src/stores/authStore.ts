/**
 * Zustand auth store - centralized authentication state management
 * Integrates with existing JWT system and API client
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthService } from '../services/authService';
import { tokenManager } from '../utils/tokenManager';
import type {
  AuthState,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest
} from '../types/auth';

// Enhanced auth state for Zustand
interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updateData: UpdateProfileRequest) => Promise<void>;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  initialize: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;

  // State management helpers
  reset: () => void;
  setError: (error: string | null) => void;
}

// Initial state
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Initialize auth store on app startup
      initialize: async () => {
        set({ isLoading: true, error: null });

        try {
          // Try to restore session using existing auth system
          const restored = await AuthService.initialize();

          if (restored) {
            const user = await AuthService.getCurrentUser();
            const accessToken = AuthService.getAccessToken();

            set({
              user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          } else {
            set({
              ...initialState,
              isLoading: false
            });
            return false;
          }
        } catch (error: any) {
          console.error('Auth initialization failed:', error);
          set({
            ...initialState,
            isLoading: false,
            error: error.message || 'Authentication initialization failed'
          });
          return false;
        }
      },

      // Login with credentials
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await AuthService.login(credentials);

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Login failed. Please try again.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Register new user
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await AuthService.register(userData);

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Registration failed. Please try again.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Logout user
      logout: async () => {
        set({ isLoading: true });

        try {
          await AuthService.logout();
        } catch (error: any) {
          console.error('Logout error:', error);
          // Continue with local logout even if server call fails
        } finally {
          set({
            ...initialState,
            isLoading: false,
          });
        }
      },

      // Update user profile
      updateProfile: async (updateData: UpdateProfileRequest) => {
        const { user } = get();
        if (!user) {
          throw new Error('No user to update');
        }

        set({ isLoading: true, error: null });

        try {
          const updatedUser = await AuthService.updateProfile(updateData);
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to update profile.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Change password
      changePassword: async (passwordData: ChangePasswordRequest) => {
        set({ isLoading: true, error: null });

        try {
          await AuthService.changePassword(passwordData);
          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to change password.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Refresh current user data
      refreshUser: async () => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;

        try {
          const user = await AuthService.getCurrentUser();
          set({ user });
        } catch (error: any) {
          console.error('Failed to refresh user:', error);
          // Don't set error state for refresh failures
        }
      },

      // Clear error state
      clearError: () => {
        set({ error: null });
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Set error state
      setError: (error: string | null) => {
        set({ error });
      },

      // Reset store to initial state
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist user and auth status, not tokens (handled by tokenManager)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Rehydrate and sync with tokenManager
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Sync with tokenManager on rehydration
          const hasTokens = tokenManager.getAccessToken() && tokenManager.getRefreshToken();
          if (!hasTokens && state.isAuthenticated) {
            // Tokens missing but store says authenticated - reset auth state
            state.isAuthenticated = false;
            state.user = null;
          }
        }
      },
    }
  )
);

// Selector hooks for optimized component re-renders
export const useAuthUser = () => useAuthStore(state => state.user);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore(state => state.isLoading);
export const useAuthError = () => useAuthStore(state => state.error);

// Auth actions selector
export const useAuthActions = () => useAuthStore(state => ({
  login: state.login,
  register: state.register,
  logout: state.logout,
  updateProfile: state.updateProfile,
  changePassword: state.changePassword,
  clearError: state.clearError,
  refreshUser: state.refreshUser,
  initialize: state.initialize,
}));