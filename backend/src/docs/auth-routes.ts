/**
 * OpenAPI documentation for authentication routes
 *
 * This file contains JSDoc comments with OpenAPI annotations
 * for all authentication endpoints.
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account with email, password, and optional profile information
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             basic:
 *               summary: Basic registration
 *               value:
 *                 email: "user@example.com"
 *                 password: "SecurePass123!"
 *             full:
 *               summary: Registration with optional fields
 *               value:
 *                 email: "john@example.com"
 *                 password: "MyPassword123!"
 *                 username: "johndoe"
 *                 displayName: "John Doe"
 *                 timezone: "America/New_York"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: "Registration successful"
 *               data:
 *                 user:
 *                   id: "clh123abc456def789"
 *                   email: "user@example.com"
 *                   username: "johndoe"
 *                   displayName: "John Doe"
 *                   timezone: "UTC"
 *                   emailVerified: false
 *                   preferences: {}
 *                   createdAt: "2024-01-01T12:00:00.000Z"
 *                   updatedAt: "2024-01-01T12:00:00.000Z"
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               requestId: "req_123456"
 *               timestamp: "2024-01-01T12:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticate user with email/username and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             email:
 *               summary: Login with email
 *               value:
 *                 identifier: "user@example.com"
 *                 password: "SecurePass123!"
 *             username:
 *               summary: Login with username
 *               value:
 *                 identifier: "johndoe"
 *                 password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Get a new access token using a valid refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         tokens:
 *                           type: object
 *                           properties:
 *                             accessToken: { type: string }
 *                             refreshToken: { type: string }
 *                             accessTokenExpiresAt: { type: number }
 *                             refreshTokenExpiresAt: { type: number }
 *                         user:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             email: { type: string }
 *                             username: { type: string }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User logout
 *     description: Invalidate refresh token and end user session
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to invalidate
 *               revokeAll:
 *                 type: boolean
 *                 default: false
 *                 description: Revoke all user sessions
 *             required:
 *               - refreshToken
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             revokeAll: false
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Logout successful"
 *               data: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *       - Users
 *     summary: Get current user profile
 *     description: Retrieve the profile of the currently authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   put:
 *     tags:
 *       - Authentication
 *       - Users
 *     summary: Update user profile
 *     description: Update the profile of the currently authenticated user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           example:
 *             displayName: "Jane Smith"
 *             timezone: "Europe/London"
 *             username: "janesmith"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /auth/password:
 *   put:
 *     tags:
 *       - Authentication
 *       - Users
 *     summary: Change user password
 *     description: Change the password for the currently authenticated user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *           example:
 *             currentPassword: "OldPassword123!"
 *             newPassword: "NewPassword456!"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Password changed successfully"
 *               data: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get active sessions
 *     description: Get list of active sessions for the current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         sessions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Session'
 *                         count:
 *                           type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   delete:
 *     tags:
 *       - Authentication
 *     summary: Revoke all sessions
 *     description: Revoke all active sessions for the current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "All sessions revoked successfully"
 *               data: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /auth/sessions/{tokenId}:
 *   delete:
 *     tags:
 *       - Authentication
 *     summary: Revoke specific session
 *     description: Revoke a specific session by token ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *         description: Token ID of the session to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Session revoked successfully"
 *               data: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /auth/check:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Check authentication status
 *     description: Check if the current token is valid and get auth status
 *     responses:
 *       200:
 *         description: Authentication status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         authenticated:
 *                           type: boolean
 *                         user:
 *                           oneOf:
 *                             - $ref: '#/components/schemas/User'
 *                             - type: "null"
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *             examples:
 *               authenticated:
 *                 summary: User is authenticated
 *                 value:
 *                   success: true
 *                   message: "Authentication status retrieved"
 *                   data:
 *                     authenticated: true
 *                     user:
 *                       id: "clh123abc456def789"
 *                       email: "user@example.com"
 *                       username: "johndoe"
 *                     timestamp: "2024-01-01T12:00:00.000Z"
 *               unauthenticated:
 *                 summary: User is not authenticated
 *                 value:
 *                   success: true
 *                   message: "Authentication status retrieved"
 *                   data:
 *                     authenticated: false
 *                     user: null
 *                     timestamp: "2024-01-01T12:00:00.000Z"
 */

/**
 * @swagger
 * /auth/validate-email:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Validate email availability
 *     description: Check if an email address is available for registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *             required:
 *               - email
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Email validation completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         email: { type: string }
 *                         available: { type: boolean }
 *                         exists: { type: boolean }
 *             example:
 *               success: true
 *               message: "Email validation completed"
 *               data:
 *                 email: "user@example.com"
 *                 available: false
 *                 exists: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */

/**
 * @swagger
 * /auth/validate-username:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Validate username availability
 *     description: Check if a username is available for registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *             required:
 *               - username
 *           example:
 *             username: "johndoe"
 *     responses:
 *       200:
 *         description: Username validation completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         username: { type: string }
 *                         available: { type: boolean }
 *                         exists: { type: boolean }
 *             example:
 *               success: true
 *               message: "Username validation completed"
 *               data:
 *                 username: "johndoe"
 *                 available: true
 *                 exists: false
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */

/**
 * @swagger
 * /auth/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Authentication service health check
 *     description: Check if the authentication service is healthy
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 timestamp: { type: string }
 *             example:
 *               status: "ok"
 *               timestamp: "2024-01-01T12:00:00.000Z"
 */