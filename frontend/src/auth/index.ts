/**
 * Authentication module exports
 * Provides a centralized way to import auth-related functionality
 */

// Core API client
export { apiClient } from '../api/client';

// Token management
export { tokenManager } from '../utils/tokenManager';

// Services
export { AuthService } from '../services/authService';

// React context and hooks
export { AuthProvider, useAuth, RequireAuth } from '../contexts/AuthContext';

// API hooks
export { useApi, useGet, usePost, usePut, usePatch, useDelete, usePaginatedApi, useFileUpload } from '../hooks/useApi';

// Components
export { default as LoginForm } from '../components/auth/LoginForm';

// Types
export type {
  User,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  AuthState,
  AuthError,
  ChangePasswordRequest,
  UpdateProfileRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailVerificationRequest,
} from '../types/auth';