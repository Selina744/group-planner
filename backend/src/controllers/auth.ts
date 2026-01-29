/**
 * Auth controller for Group Planner API
 *
 * This controller provides comprehensive authentication endpoint handlers
 * with proper separation of concerns, validation, and error handling.
 */

import type { Response } from 'express';
import { AuthService, JwtService } from '../services/index.js';
import { apiResponse } from '../utils/apiResponse.js';
import { log } from '../utils/logger.js';
import { AuthContext } from '../middleware/index.js';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.js';
import type { AuthenticatedRequest } from '../types/middleware.js';
import type {
  RegisterRequest,
  LoginRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfile,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailVerificationRequest,
} from '../types/auth.js';
import type {
  TokenRefreshRequest,
  RefreshTokenRecord,
} from '../types/jwt.js';

/**
 * Auth controller class
 */
export class AuthController {
  /**
   * POST /auth/register - User registration
   */
  static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, username, password, displayName, timezone }: RegisterRequest = req.body;

    // Input validation
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new BadRequestError('Invalid email or password format');
    }

    if (username && typeof username !== 'string') {
      throw new BadRequestError('Invalid username format');
    }

    if (displayName && typeof displayName !== 'string') {
      throw new BadRequestError('Invalid display name format');
    }

    if (timezone && typeof timezone !== 'string') {
      throw new BadRequestError('Invalid timezone format');
    }

    try {
      // Check if email already exists
      const emailExists = await AuthService.emailExists(email);
      if (emailExists) {
        throw new ConflictError('Email is already registered');
      }

      // Check if username already exists (if provided)
      if (username) {
        const usernameExists = await AuthService.usernameExists(username);
        if (usernameExists) {
          throw new ConflictError('Username is already taken');
        }
      }

      // Register user
      const result = await AuthService.register({
        email,
        username,
        password,
        displayName,
        timezone,
      });

      log.auth('User registration completed', {
        userId: result.user.id,
        email: result.user.email,
        username: result.user.username,
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
      });

      apiResponse.created(res, result, 'Registration successful');
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }

      log.error('Registration failed', error, {
        email,
        username,
        requestId: req.requestId,
      });

      throw new BadRequestError('Registration failed');
    }
  }

  /**
   * POST /auth/login - User login
   */
  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { identifier, password }: LoginRequest = req.body;

    // Input validation
    if (!identifier || !password) {
      throw new BadRequestError('Email/username and password are required');
    }

    if (typeof identifier !== 'string' || typeof password !== 'string') {
      throw new BadRequestError('Invalid credentials format');
    }

    try {
      // Login user with context
      const result = await AuthService.login({ identifier, password });

      log.auth('User login completed', {
        userId: result.user.id,
        email: result.user.email,
        username: result.user.username,
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
        userAgent: req.get('User-Agent'),
      });

      apiResponse.ok(res, result, 'Login successful');
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        // Don't log sensitive information for security
        log.auth('Login attempt failed', {
          identifier,
          requestId: req.requestId,
          ip: req.clientIp || req.ip,
        });
        throw error;
      }

      log.error('Login failed', error, {
        identifier,
        requestId: req.requestId,
      });

      throw new UnauthorizedError('Login failed');
    }
  }

  /**
   * POST /auth/refresh - Refresh authentication tokens
   */
  static async refreshTokens(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { refreshToken }: TokenRefreshRequest = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    if (typeof refreshToken !== 'string') {
      throw new BadRequestError('Invalid refresh token format');
    }

    try {
      // Refresh tokens with context
      const result = await JwtService.refreshTokens({
        refreshToken,
        userAgent: req.get('User-Agent'),
        ipAddress: req.clientIp || req.ip,
      });

      log.auth('Tokens refreshed successfully', {
        userId: result.user.id,
        email: result.user.email,
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
      });

      apiResponse.ok(res, result, 'Tokens refreshed successfully');
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        log.auth('Token refresh failed - unauthorized', {
          requestId: req.requestId,
          ip: req.clientIp || req.ip,
        });
        throw error;
      }

      log.error('Token refresh failed', error, {
        requestId: req.requestId,
      });

      throw new UnauthorizedError('Token refresh failed');
    }
  }

  /**
   * POST /auth/logout - User logout
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = AuthContext.requireUser(req);
    const { refreshToken, revokeAll = false } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    if (typeof refreshToken !== 'string') {
      throw new BadRequestError('Invalid refresh token format');
    }

    try {
      // Logout user
      await AuthService.logout(refreshToken, revokeAll);

      log.auth('User logout completed', {
        userId: user.id,
        revokeAll,
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
      });

      apiResponse.ok(res, null, 'Logout successful');
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      log.error('Logout failed', error, {
        userId: user.id,
        requestId: req.requestId,
      });

      throw new BadRequestError('Logout failed');
    }
  }

  /**
   * GET /auth/me - Get current user profile
   */
  static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = AuthContext.requireUser(req);

    try {
      // Fetch fresh user data from database
      const currentUser = await AuthService.getUserById(user.id);

      log.debug('User profile accessed', {
        userId: user.id,
        requestId: req.requestId,
      });

      apiResponse.ok(res, currentUser, 'Profile retrieved successfully');
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new UnauthorizedError('User not found');
      }

      log.error('Failed to get user profile', error, {
        userId: user.id,
        requestId: req.requestId,
      });

      throw new BadRequestError('Failed to retrieve profile');
    }
  }

  /**
   * PUT /auth/me - Update user profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = AuthContext.requireUser(req);
    const updateData: UpdateProfileRequest = req.body;

    // Validate update data
    if (!updateData || typeof updateData !== 'object') {
      throw new BadRequestError('Invalid update data');
    }

    // Validate individual fields if provided
    if (updateData.displayName !== undefined && typeof updateData.displayName !== 'string') {
      throw new BadRequestError('Invalid display name format');
    }

    if (updateData.timezone !== undefined && typeof updateData.timezone !== 'string') {
      throw new BadRequestError('Invalid timezone format');
    }

    if (updateData.username !== undefined && typeof updateData.username !== 'string') {
      throw new BadRequestError('Invalid username format');
    }

    try {
      // Update profile
      const updatedUser = await AuthService.updateProfile(user.id, updateData);

      log.auth('User profile updated', {
        userId: user.id,
        updatedFields: Object.keys(updateData),
        requestId: req.requestId,
      });

      apiResponse.ok(res, updatedUser, 'Profile updated successfully');
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }

      if (error instanceof NotFoundError) {
        throw new UnauthorizedError('User not found');
      }

      log.error('Failed to update profile', error, {
        userId: user.id,
        updateData,
        requestId: req.requestId,
      });

      throw new BadRequestError('Failed to update profile');
    }
  }

  /**
   * PUT /auth/password - Change user password
   */
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = AuthContext.requireUser(req);
    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

    // Input validation
    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current and new passwords are required');
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      throw new BadRequestError('Invalid password format');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestError('New password must be different from current password');
    }

    try {
      // Change password
      await AuthService.changePassword(user.id, { currentPassword, newPassword });

      log.auth('User password changed', {
        userId: user.id,
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
      });

      apiResponse.ok(res, null, 'Password changed successfully');
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      if (error instanceof NotFoundError) {
        throw new UnauthorizedError('User not found');
      }

      log.error('Password change failed', error, {
        userId: user.id,
        requestId: req.requestId,
      });

      throw new BadRequestError('Failed to change password');
    }
  }

  /**
   * GET /auth/sessions - Get user's active sessions
   */
  static async getActiveSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = AuthContext.requireUser(req);

    try {
      const activeSessions = await JwtService.getUserActiveTokens(user.id);

      // Remove sensitive information and format for client
      const sessions = activeSessions.map((session: RefreshTokenRecord) => ({
        id: session.id,
        tokenId: session.tokenId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        family: session.family,
        isCurrent: false, // TODO: Implement current session detection
      }));

      log.debug('Active sessions retrieved', {
        userId: user.id,
        sessionCount: sessions.length,
        requestId: req.requestId,
      });

      apiResponse.ok(res, { sessions, count: sessions.length }, 'Active sessions retrieved');
    } catch (error) {
      log.error('Failed to get active sessions', error, {
        userId: user.id,
        requestId: req.requestId,
      });

      throw new BadRequestError('Failed to retrieve active sessions');
    }
  }

  /**
   * DELETE /auth/sessions - Revoke all user sessions
   */
  static async revokeAllSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = AuthContext.requireUser(req);

    try {
      // Revoke all user tokens
      await JwtService.revokeUserTokens(user.id, {
        reason: 'User requested session termination',
      });

      log.auth('All user sessions revoked', {
        userId: user.id,
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
      });

      apiResponse.ok(res, null, 'All sessions revoked successfully');
    } catch (error) {
      log.error('Failed to revoke all sessions', error, {
        userId: user.id,
        requestId: req.requestId,
      });

      throw new BadRequestError('Failed to revoke sessions');
    }
  }

  /**
   * DELETE /auth/sessions/:tokenId - Revoke specific session
   */
  static async revokeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = AuthContext.requireUser(req);
    const { tokenId } = req.params;

    if (!tokenId) {
      throw new BadRequestError('Token ID is required');
    }

    try {
      // Verify token belongs to user before revoking
      const userTokens = await JwtService.getUserActiveTokens(user.id);
      const tokenExists = userTokens.some(token => token.tokenId === tokenId);

      if (!tokenExists) {
        throw new NotFoundError('Session not found or already revoked');
      }

      // Revoke specific token
      await JwtService.revokeRefreshToken(tokenId, {
        reason: 'User requested specific session termination',
      });

      log.auth('User session revoked', {
        userId: user.id,
        tokenId,
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
      });

      apiResponse.ok(res, null, 'Session revoked successfully');
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      log.error('Failed to revoke session', error, {
        userId: user.id,
        tokenId,
        requestId: req.requestId,
      });

      throw new BadRequestError('Failed to revoke session');
    }
  }

  /**
   * GET /auth/check - Check authentication status
   */
  static async checkAuth(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = AuthContext.getUser(req);

    const authStatus = {
      authenticated: !!user,
      user: user || null,
      timestamp: new Date().toISOString(),
    };

    apiResponse.ok(res, authStatus, 'Authentication status retrieved');
  }

  /**
   * POST /auth/validate-email - Validate email availability
   */
  static async validateEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError('Email is required');
    }

    if (typeof email !== 'string') {
      throw new BadRequestError('Invalid email format');
    }

    try {
      const exists = await AuthService.emailExists(email);

      apiResponse.ok(res, {
        email,
        available: !exists
      }, 'Email validation completed');
    } catch (error) {
      log.error('Email validation failed', error, {
        email,
        requestId: req.requestId,
      });

      throw new BadRequestError('Email validation failed');
    }
  }

  /**
   * POST /auth/validate-username - Validate username availability
   */
  static async validateUsername(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { username } = req.body;

    if (!username) {
      throw new BadRequestError('Username is required');
    }

    if (typeof username !== 'string') {
      throw new BadRequestError('Invalid username format');
    }

    try {
      const exists = await AuthService.usernameExists(username);

      apiResponse.ok(res, {
        username,
        available: !exists
      }, 'Username validation completed');
    } catch (error) {
      log.error('Username validation failed', error, {
        username,
        requestId: req.requestId,
      });

      throw new BadRequestError('Username validation failed');
    }
  }

  /**
   * POST /auth/request-password-reset - Request password reset
   */
  static async requestPasswordReset(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email }: PasswordResetRequest = req.body;

    if (!email) {
      throw new BadRequestError('Email is required');
    }

    if (typeof email !== 'string') {
      throw new BadRequestError('Invalid email format');
    }

    try {
      await AuthService.requestPasswordReset({ email });

      log.auth('Password reset requested', {
        email,
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
      });

      // Always return success to prevent email enumeration
      apiResponse.ok(res, null, 'If this email is registered, a reset link has been sent');
    } catch (error) {
      log.error('Password reset request failed', error, {
        email,
        requestId: req.requestId,
      });

      // Still return success to prevent enumeration
      apiResponse.ok(res, null, 'If this email is registered, a reset link has been sent');
    }
  }

  /**
   * POST /auth/reset-password - Confirm password reset with token
   */
  static async confirmPasswordReset(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { token, newPassword }: PasswordResetConfirm = req.body;

    if (!token || !newPassword) {
      throw new BadRequestError('Reset token and new password are required');
    }

    if (typeof token !== 'string' || typeof newPassword !== 'string') {
      throw new BadRequestError('Invalid token or password format');
    }

    try {
      await AuthService.confirmPasswordReset({ token, newPassword });

      log.auth('Password reset completed', {
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
      });

      apiResponse.ok(res, null, 'Password has been reset successfully');
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Password reset confirmation failed', error, {
        requestId: req.requestId,
      });

      throw new BadRequestError('Failed to reset password');
    }
  }

  /**
   * POST /auth/send-verification - Send email verification
   */
  static async sendEmailVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = AuthContext.requireUser(req);

    try {
      await AuthService.sendEmailVerification(user.id);

      log.auth('Email verification sent', {
        userId: user.id,
        requestId: req.requestId,
      });

      apiResponse.ok(res, null, 'Verification email has been sent');
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      log.error('Failed to send email verification', error, {
        userId: user.id,
        requestId: req.requestId,
      });

      throw new BadRequestError('Failed to send verification email');
    }
  }

  /**
   * POST /auth/verify-email - Verify email with token
   */
  static async verifyEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { token }: EmailVerificationRequest = req.body;

    if (!token) {
      throw new BadRequestError('Verification token is required');
    }

    if (typeof token !== 'string') {
      throw new BadRequestError('Invalid token format');
    }

    try {
      await AuthService.verifyEmail({ token });

      log.auth('Email verification completed', {
        requestId: req.requestId,
        ip: req.clientIp || req.ip,
      });

      apiResponse.ok(res, null, 'Email has been verified successfully');
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      log.error('Email verification failed', error, {
        requestId: req.requestId,
      });

      throw new BadRequestError('Failed to verify email');
    }
  }
}