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

const router: express.Router = express.Router();

/**
 * POST /auth/register - User registration
 */
router.post(
  '/register',
  ...(middlewarePresets.register as any),
  wrapAsync<AuthenticatedRequest>(AuthController.register) as any
);

/**
 * POST /auth/login - User login
 */
router.post(
  '/login',
  ...(middlewarePresets.login as any),
  wrapAsync<AuthenticatedRequest>(AuthController.login) as any
);

/**
 * POST /auth/refresh - Refresh authentication tokens
 */
router.post(
  '/refresh',
  ...(middlewarePresets.tokenRefresh as any),
  wrapAsync<AuthenticatedRequest>(AuthController.refreshTokens) as any
);

/**
 * POST /auth/logout - User logout
 */
router.post(
  '/logout',
  ...(middlewarePresets.protected as any),
  wrapAsync<AuthenticatedRequest>(AuthController.logout) as any
);

/**
 * GET /auth/me - Get current user profile
 */
router.get(
  '/me',
  ...(middlewarePresets.protected as any),
  wrapAsync<AuthenticatedRequest>(AuthController.getCurrentUser) as any
);

/**
 * PUT /auth/me - Update user profile
 */
router.put(
  '/me',
  ...(middlewarePresets.protected as any),
  wrapAsync<AuthenticatedRequest>(AuthController.updateProfile) as any
);

/**
 * PUT /auth/password - Change user password
 */
router.put(
  '/password',
  ...(middlewarePresets.protected as any),
  wrapAsync<AuthenticatedRequest>(AuthController.changePassword) as any
);

/**
 * GET /auth/sessions - Get user's active sessions (refresh tokens)
 */
router.get(
  '/sessions',
  ...(middlewarePresets.protected as any),
  wrapAsync<AuthenticatedRequest>(AuthController.getActiveSessions) as any
);

/**
 * DELETE /auth/sessions - Revoke all user sessions
 */
router.delete(
  '/sessions',
  ...(middlewarePresets.protected as any),
  wrapAsync<AuthenticatedRequest>(AuthController.revokeAllSessions) as any
);

/**
 * DELETE /auth/sessions/:tokenId - Revoke specific session
 */
router.delete(
  '/sessions/:tokenId',
  ...(middlewarePresets.protected as any),
  wrapAsync<AuthenticatedRequest>(AuthController.revokeSession) as any
);

/**
 * GET /auth/check - Check authentication status
 */
router.get(
  '/check',
  ...(middlewarePresets.public as any),
  wrapAsync<AuthenticatedRequest>(AuthController.checkAuth) as any
);

/**
 * POST /auth/validate-email - Validate email availability
 */
router.post(
  '/validate-email',
  ...(middlewarePresets.public as any),
  wrapAsync<AuthenticatedRequest>(AuthController.validateEmail) as any
);

/**
 * POST /auth/validate-username - Validate username availability
 */
router.post(
  '/validate-username',
  ...(middlewarePresets.public as any),
  wrapAsync<AuthenticatedRequest>(AuthController.validateUsername) as any
);

/**
 * POST /auth/request-password-reset - Request password reset
 */
router.post(
  '/request-password-reset',
  ...(middlewarePresets.passwordReset as any),
  wrapAsync<AuthenticatedRequest>(AuthController.requestPasswordReset) as any
);

/**
 * POST /auth/reset-password - Confirm password reset with token
 */
router.post(
  '/reset-password',
  ...(middlewarePresets.passwordReset as any),
  wrapAsync<AuthenticatedRequest>(AuthController.confirmPasswordReset) as any
);

/**
 * POST /auth/send-verification - Send email verification (authenticated)
 */
router.post(
  '/send-verification',
  ...(middlewarePresets.protected as any),
  wrapAsync<AuthenticatedRequest>(AuthController.sendEmailVerification) as any
);

/**
 * POST /auth/verify-email - Verify email with token
 */
router.post(
  '/verify-email',
  ...(middlewarePresets.public as any),
  wrapAsync<AuthenticatedRequest>(AuthController.verifyEmail) as any
);

/**
 * Health check endpoint (no authentication required)
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;