/**
 * Authentication routes for Group Planner API
 *
 * This module provides complete authentication routes using the
 * auth controller and middleware system.
 */

import express from 'express';
import { AuthController } from '../controllers/auth.js';
import { wrapAsync } from '../utils/wrapAsync.js';
import {
  middlewarePresets,
  withOptionalAuthContext,
  type AuthenticatedRequest,
} from '../middleware/index.js';
import type { Response } from 'express';
import type { UserProfile } from '../types/auth.js';

const router = express.Router();

/**
 * POST /auth/register - User registration
 */
router.post(
  '/register',
  ...middlewarePresets.register,
  wrapAsync(AuthController.register)
);

/**
 * POST /auth/login - User login
 */
router.post(
  '/login',
  ...middlewarePresets.login,
  wrapAsync(AuthController.login)
);

/**
 * POST /auth/refresh - Refresh authentication tokens
 */
router.post(
  '/refresh',
  ...middlewarePresets.tokenRefresh,
  wrapAsync(AuthController.refreshTokens)
);

/**
 * POST /auth/logout - User logout
 */
router.post(
  '/logout',
  ...middlewarePresets.protected,
  wrapAsync(AuthController.logout)
);

/**
 * GET /auth/me - Get current user profile
 */
router.get(
  '/me',
  ...middlewarePresets.protected,
  wrapAsync(AuthController.getCurrentUser)
);

/**
 * PUT /auth/me - Update user profile
 */
router.put(
  '/me',
  ...middlewarePresets.protected,
  wrapAsync(AuthController.updateProfile)
);

/**
 * PUT /auth/password - Change user password
 */
router.put(
  '/password',
  ...middlewarePresets.protected,
  wrapAsync(AuthController.changePassword)
);

/**
 * GET /auth/sessions - Get user's active sessions (refresh tokens)
 */
router.get(
  '/sessions',
  ...middlewarePresets.protected,
  wrapAsync(AuthController.getActiveSessions)
);

/**
 * DELETE /auth/sessions - Revoke all user sessions
 */
router.delete(
  '/sessions',
  ...middlewarePresets.protected,
  wrapAsync(AuthController.revokeAllSessions)
);

/**
 * DELETE /auth/sessions/:tokenId - Revoke specific session
 */
router.delete(
  '/sessions/:tokenId',
  ...middlewarePresets.protected,
  wrapAsync(AuthController.revokeSession)
);

/**
 * GET /auth/check - Check authentication status
 */
router.get(
  '/check',
  ...middlewarePresets.public,
  wrapAsync(AuthController.checkAuth)
);

/**
 * POST /auth/validate-email - Validate email availability
 */
router.post(
  '/validate-email',
  ...middlewarePresets.public,
  wrapAsync(AuthController.validateEmail)
);

/**
 * POST /auth/validate-username - Validate username availability
 */
router.post(
  '/validate-username',
  ...middlewarePresets.public,
  wrapAsync(AuthController.validateUsername)
);

/**
 * Health check endpoint (no authentication required)
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;