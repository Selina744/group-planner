/**
 * Authentication routes for Group Planner API
 *
 * This module demonstrates how to use the auth middleware system
 * with Express routes for authentication endpoints.
 */

import express from 'express';
import { AuthService, JwtService } from '../services/index.js';
import { wrapAsync } from '../utils/wrapAsync.js';
import { apiResponse } from '../utils/apiResponse.js';
import { log } from '../utils/logger.js';
import {
  middlewarePresets,
  withAuthContext,
  withOptionalAuthContext,
  AuthContext,
  type AuthenticatedRequest,
} from '../middleware/index.js';
import type { Response } from 'express';
import type {
  RegisterRequest,
  LoginRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfile,
} from '../types/auth.js';
import type { TokenRefreshRequest } from '../types/jwt.js';

const router = express.Router();

/**
 * POST /auth/register - User registration
 */
router.post(
  '/register',
  ...middlewarePresets.register,
  wrapAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { email, username, password, displayName, timezone }: RegisterRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      return apiResponse.badRequest(res, 'Email and password are required');
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
      requestId: req.requestId,
    });

    apiResponse.created(res, result, 'User registered successfully');
  })
);

/**
 * POST /auth/login - User login
 */
router.post(
  '/login',
  ...middlewarePresets.login,
  wrapAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { identifier, password }: LoginRequest = req.body;

    // Validate required fields
    if (!identifier || !password) {
      return apiResponse.badRequest(res, 'Email/username and password are required');
    }

    // Login user
    const result = await AuthService.login({ identifier, password });

    log.auth('User login completed', {
      userId: result.user.id,
      email: result.user.email,
      requestId: req.requestId,
    });

    apiResponse.ok(res, result, 'Login successful');
  })
);

/**
 * POST /auth/refresh - Refresh authentication tokens
 */
router.post(
  '/refresh',
  ...middlewarePresets.tokenRefresh,
  wrapAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken }: TokenRefreshRequest = req.body;

    if (!refreshToken) {
      return apiResponse.badRequest(res, 'Refresh token is required');
    }

    // Refresh tokens with context
    const result = await JwtService.refreshTokens({
      refreshToken,
      userAgent: req.get('User-Agent'),
      ipAddress: req.clientIp || req.ip,
    });

    log.auth('Tokens refreshed', {
      userId: result.user.id,
      requestId: req.requestId,
    });

    apiResponse.ok(res, result, 'Tokens refreshed successfully');
  })
);

/**
 * POST /auth/logout - User logout
 */
router.post(
  '/logout',
  ...middlewarePresets.protected,
  wrapAsync(
    withAuthContext(async (req: AuthenticatedRequest, res: Response, user: UserProfile) => {
      const { refreshToken, revokeAll = false } = req.body;

      if (!refreshToken) {
        return apiResponse.badRequest(res, 'Refresh token is required');
      }

      // Logout user
      await AuthService.logout(refreshToken, revokeAll);

      log.auth('User logout completed', {
        userId: user.id,
        revokeAll,
        requestId: req.requestId,
      });

      apiResponse.ok(res, null, 'Logout successful');
    })
  )
);

/**
 * GET /auth/me - Get current user profile
 */
router.get(
  '/me',
  ...middlewarePresets.protected,
  wrapAsync(
    withAuthContext(async (req: AuthenticatedRequest, res: Response, user: UserProfile) => {
      log.debug('User profile accessed', {
        userId: user.id,
        requestId: req.requestId,
      });

      apiResponse.ok(res, user, 'Profile retrieved successfully');
    })
  )
);

/**
 * PUT /auth/me - Update user profile
 */
router.put(
  '/me',
  ...middlewarePresets.protected,
  wrapAsync(
    withAuthContext(async (req: AuthenticatedRequest, res: Response, user: UserProfile) => {
      const updateData: UpdateProfileRequest = req.body;

      // Update profile
      const updatedUser = await AuthService.updateProfile(user.id, updateData);

      log.auth('User profile updated', {
        userId: user.id,
        updatedFields: Object.keys(updateData),
        requestId: req.requestId,
      });

      apiResponse.ok(res, updatedUser, 'Profile updated successfully');
    })
  )
);

/**
 * PUT /auth/password - Change user password
 */
router.put(
  '/password',
  ...middlewarePresets.protected,
  wrapAsync(
    withAuthContext(async (req: AuthenticatedRequest, res: Response, user: UserProfile) => {
      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

      if (!currentPassword || !newPassword) {
        return apiResponse.badRequest(res, 'Current and new passwords are required');
      }

      // Change password
      await AuthService.changePassword(user.id, { currentPassword, newPassword });

      log.auth('User password changed', {
        userId: user.id,
        requestId: req.requestId,
      });

      apiResponse.ok(res, null, 'Password changed successfully');
    })
  )
);

/**
 * GET /auth/sessions - Get user's active sessions (refresh tokens)
 */
router.get(
  '/sessions',
  ...middlewarePresets.protected,
  wrapAsync(
    withAuthContext(async (req: AuthenticatedRequest, res: Response, user: UserProfile) => {
      const activeSessions = await JwtService.getUserActiveTokens(user.id);

      // Remove sensitive information
      const sessions = activeSessions.map(session => ({
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        family: session.family,
      }));

      apiResponse.ok(res, sessions, 'Active sessions retrieved');
    })
  )
);

/**
 * DELETE /auth/sessions - Revoke all user sessions
 */
router.delete(
  '/sessions',
  ...middlewarePresets.protected,
  wrapAsync(
    withAuthContext(async (req: AuthenticatedRequest, res: Response, user: UserProfile) => {
      // Revoke all user tokens
      await JwtService.revokeUserTokens(user.id, {
        reason: 'User requested session termination',
      });

      log.auth('All user sessions revoked', {
        userId: user.id,
        requestId: req.requestId,
      });

      apiResponse.ok(res, null, 'All sessions revoked successfully');
    })
  )
);

/**
 * Example protected route with permission checking
 */
router.get(
  '/admin/users',
  // Custom middleware chain with admin permissions
  ...middlewarePresets.admin,
  wrapAsync(
    withAuthContext(async (req: AuthenticatedRequest, res: Response, user: UserProfile) => {
      // This would implement user listing for admin
      log.admin('Admin user list accessed', {
        adminUserId: user.id,
        requestId: req.requestId,
      });

      apiResponse.ok(res, [], 'User list retrieved (placeholder)');
    })
  )
);

/**
 * Example route with optional authentication
 */
router.get(
  '/public-data',
  ...middlewarePresets.public,
  wrapAsync(
    withOptionalAuthContext(async (req: AuthenticatedRequest, res: Response, user: UserProfile | null) => {
      const isAuthenticated = user !== null;

      // Return different data based on authentication status
      const data = {
        message: 'Public data endpoint',
        authenticated: isAuthenticated,
        userId: user?.id || null,
      };

      log.debug('Public data accessed', {
        authenticated: isAuthenticated,
        userId: user?.id,
        requestId: req.requestId,
      });

      apiResponse.ok(res, data, 'Public data retrieved');
    })
  )
);

/**
 * Health check endpoint (no authentication required)
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;