/**
 * Authentication service for Group Planner API
 *
 * Provides user registration, login, password hashing, and user management
 * with proper validation, error handling, and security measures.
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma, safePrismaOperation } from '../lib/prisma.js';
import { JwtService } from './jwt.js';
import { JwtUtils } from '../lib/jwt.js';
import { log } from '../utils/logger.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  BadRequestError
} from '../utils/errors.js';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
  TokenPair,
  PasswordRequirements,
  PasswordValidation,
  DatabaseUser,
  AuthConfig,
  ChangePasswordRequest,
  UpdateProfileRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailVerificationRequest,
} from '../types/auth.js';

/**
 * Authentication service configuration
 */
const AUTH_CONFIG: AuthConfig = {
  bcryptRounds: 12,
  accessTokenExpiryMinutes: 15,
  refreshTokenExpiryDays: 30,
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
};

/**
 * Password utility functions
 */
class PasswordUtils {
  /**
   * Hash password using bcrypt with configured rounds
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);
      log.debug('Password hashed successfully');
      return hash;
    } catch (error) {
      log.error('Password hashing failed', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      log.debug('Password verification completed', { isValid });
      return isValid;
    } catch (error) {
      log.error('Password verification failed', error);
      return false;
    }
  }

  /**
   * Validate password against requirements
   */
  static validatePassword(password: string): PasswordValidation {
    const { passwordRequirements } = AUTH_CONFIG;
    const errors: string[] = [];

    // Check minimum length
    if (password.length < passwordRequirements.minLength) {
      errors.push(`Password must be at least ${passwordRequirements.minLength} characters long`);
    }

    // Check for uppercase letter
    if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letter
    if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for numbers
    if (passwordRequirements.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for special characters
    if (passwordRequirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Determine password strength
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (errors.length === 0) {
      if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) &&
          /\d/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        strength = 'strong';
      } else {
        strength = 'medium';
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * Generate secure random token
   */
  static generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

/**
 * User validation utilities
 */
class UserValidation {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate username format
   */
  static isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username);
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    return input.trim();
  }
}

/**
 * User transformation utilities
 */
class UserTransforms {
  /**
   * Convert database user to public profile
   */
  static toUserProfile(user: DatabaseUser): UserProfile {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      timezone: user.timezone,
      emailVerified: user.emailVerified,
      preferences: user.preferences,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

/**
 * Main authentication service
 */
export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<RegisterResponse> {
    const { email, username, password, displayName, timezone = 'UTC' } = data;

    // Sanitize inputs
    const sanitizedEmail = UserValidation.sanitizeInput(email.toLowerCase());
    const sanitizedUsername = username ? UserValidation.sanitizeInput(username.toLowerCase()) : undefined;

    // Validate email format
    if (!UserValidation.isValidEmail(sanitizedEmail)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate username format if provided
    if (sanitizedUsername && !UserValidation.isValidUsername(sanitizedUsername)) {
      throw new ValidationError('Username must be 3-20 characters and contain only letters, numbers, hyphens, and underscores');
    }

    // Validate password
    const passwordValidation = PasswordUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password validation failed', {
        errors: passwordValidation.errors,
      });
    }

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(password);

    // Create user in database
    try {
      const user = await safePrismaOperation(async () => {
        // Check for existing email
        const existingEmail = await prisma.user.findUnique({
          where: { email: sanitizedEmail },
        });

        if (existingEmail) {
          throw new ConflictError('Email already registered');
        }

        // Check for existing username if provided
        if (sanitizedUsername) {
          const existingUsername = await prisma.user.findUnique({
            where: { username: sanitizedUsername },
          });

          if (existingUsername) {
            throw new ConflictError('Username already taken');
          }
        }

        // Create user
        return await prisma.user.create({
          data: {
            email: sanitizedEmail,
            username: sanitizedUsername || null,
            passwordHash,
            displayName: displayName || null,
            timezone,
            emailVerified: false,
            preferences: {},
          },
        });
      }, 'User registration');

      const userProfile = UserTransforms.toUserProfile(user as DatabaseUser);

      // Generate JWT tokens
      const tokens = await JwtService.generateTokenPair(userProfile);

      log.auth('User registered successfully', {
        userId: user.id,
        email: sanitizedEmail,
        username: sanitizedUsername,
      });

      return {
        user: userProfile,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }

      log.error('User registration failed', error, {
        email: sanitizedEmail,
        username: sanitizedUsername,
      });

      throw new Error('Registration failed');
    }
  }

  /**
   * Login user with email or username
   */
  static async login(data: LoginRequest): Promise<LoginResponse> {
    const { identifier, password } = data;

    // Sanitize identifier
    const sanitizedIdentifier = UserValidation.sanitizeInput(identifier.toLowerCase());

    if (!sanitizedIdentifier || !password) {
      throw new BadRequestError('Email/username and password are required');
    }

    try {
      // Find user by email or username
      const user = await safePrismaOperation(async () => {
        return await prisma.user.findFirst({
          where: {
            OR: [
              { email: sanitizedIdentifier },
              { username: sanitizedIdentifier },
            ],
          },
        });
      }, 'User login lookup');

      // TIMING ATTACK PROTECTION: Always perform password hashing to ensure consistent timing
      // Use a dummy hash if user doesn't exist to prevent timing-based username enumeration
      const hashToVerify = user?.passwordHash || '$2b$10$dummyHashToPreventTimingAttack12345678901234567890123456';
      const isValidPassword = await PasswordUtils.verifyPassword(password, hashToVerify);

      // Check both user existence and password validity
      if (!user || !isValidPassword) {
        // Log the specific failure reason for security monitoring, but return generic message
        if (!user) {
          log.auth('Login attempt failed - user not found', {
            identifier: sanitizedIdentifier,
          });
        } else {
          log.auth('Login attempt failed - invalid password', {
            userId: user.id,
            identifier: sanitizedIdentifier,
          });
        }

        // Always return the same generic error message regardless of failure reason
        throw new UnauthorizedError('Invalid credentials');
      }

      const userProfile = UserTransforms.toUserProfile(user as DatabaseUser);

      // Generate JWT tokens
      const tokens = await JwtService.generateTokenPair(userProfile);

      log.auth('User logged in successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      return {
        user: userProfile,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Login failed', error, {
        identifier: sanitizedIdentifier,
      });

      throw new Error('Login failed');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UserProfile> {
    try {
      const user = await safePrismaOperation(async () => {
        return await prisma.user.findUnique({
          where: { id: userId },
        });
      }, 'Get user by ID');

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return UserTransforms.toUserProfile(user as DatabaseUser);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      log.error('Failed to get user by ID', error, { userId });
      throw new Error('Failed to retrieve user');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    const { displayName, timezone, username } = data;

    try {
      const user = await safePrismaOperation(async () => {
        // If updating username, check for conflicts
        if (username) {
          const sanitizedUsername = UserValidation.sanitizeInput(username.toLowerCase());

          if (!UserValidation.isValidUsername(sanitizedUsername)) {
            throw new ValidationError('Invalid username format');
          }

          const existingUser = await prisma.user.findUnique({
            where: { username: sanitizedUsername },
          });

          if (existingUser && existingUser.id !== userId) {
            throw new ConflictError('Username already taken');
          }
        }

        const updateData: {
          displayName?: string | null;
          timezone?: string;
          username?: string | null;
        } = {};
        if (displayName !== undefined) {
          updateData.displayName = displayName || null;
        }
        if (timezone !== undefined) {
          updateData.timezone = timezone;
        }
        if (username !== undefined) {
          updateData.username = username ? username.toLowerCase() : null;
        }

        return await prisma.user.update({
          where: { id: userId },
          data: updateData,
        });
      }, 'Update user profile');

      const userProfile = UserTransforms.toUserProfile(user as DatabaseUser);

      log.auth('User profile updated', {
        userId,
        updatedFields: Object.keys(data),
      });

      return userProfile;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError) {
        throw error;
      }

      log.error('Failed to update user profile', error, { userId, data });
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, data: ChangePasswordRequest): Promise<void> {
    const { currentPassword, newPassword } = data;

    // Validate new password
    const passwordValidation = PasswordUtils.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError('New password validation failed', {
        errors: passwordValidation.errors,
      });
    }

    try {
      await safePrismaOperation(async () => {
        // Get current user
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new NotFoundError('User not found');
        }

        // Verify current password
        const isValidPassword = await PasswordUtils.verifyPassword(currentPassword, user.passwordHash);
        if (!isValidPassword) {
          throw new UnauthorizedError('Current password is incorrect');
        }

        // Hash new password
        const newPasswordHash = await PasswordUtils.hashPassword(newPassword);

        // Update password
        await prisma.user.update({
          where: { id: userId },
          data: { passwordHash: newPasswordHash },
        });
      }, 'Change password');

      log.auth('User password changed successfully', { userId });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UnauthorizedError || error instanceof NotFoundError) {
        throw error;
      }

      log.error('Failed to change password', error, { userId });
      throw new Error('Failed to change password');
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const sanitizedEmail = UserValidation.sanitizeInput(email.toLowerCase());

    try {
      const user = await safePrismaOperation(async () => {
        return await prisma.user.findUnique({
          where: { email: sanitizedEmail },
          select: { id: true },
        });
      }, 'Check email exists');

      return !!user;
    } catch (error) {
      log.error('Failed to check email existence', error, { email: sanitizedEmail });
      return false;
    }
  }

  /**
   * Check if username exists
   */
  static async usernameExists(username: string): Promise<boolean> {
    const sanitizedUsername = UserValidation.sanitizeInput(username.toLowerCase());

    try {
      const user = await safePrismaOperation(async () => {
        return await prisma.user.findUnique({
          where: { username: sanitizedUsername },
          select: { id: true },
        });
      }, 'Check username exists');

      return !!user;
    } catch (error) {
      log.error('Failed to check username existence', error, { username: sanitizedUsername });
      return false;
    }
  }

  /**
   * Logout user and revoke refresh token
   */
  static async logout(refreshToken: string, revokeAllTokens = false): Promise<void> {
    try {
      // Verify the refresh token to get the token payload
      const verification = await JwtService.verifyRefreshToken(refreshToken, {
        checkRevocation: true,
      });

      if (!verification.valid || !verification.payload) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (revokeAllTokens) {
        // Revoke all user tokens
        await JwtService.revokeUserTokens(verification.payload.sub, {
          reason: 'User logout (all devices)',
        });
      } else {
        // Revoke only this specific token
        await JwtService.revokeRefreshToken(verification.payload.tokenId, {
          reason: 'User logout',
        });
      }

      log.auth('User logged out successfully', {
        userId: verification.payload.sub,
        tokenId: verification.payload.tokenId,
        revokeAllTokens,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      log.error('Logout failed', error);
      throw new Error('Failed to logout');
    }
  }

  /**
   * Refresh authentication tokens
   */
  static async refreshTokens(
    refreshToken: string,
    context?: {
      userAgent?: string | undefined;
      ipAddress?: string | undefined;
    }
  ): Promise<LoginResponse> {
    try {
      const result = await JwtService.refreshTokens({
        refreshToken,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
      });

      // Get full user profile
      const userProfile = await this.getUserById(result.user.id);

      log.auth('Tokens refreshed successfully', {
        userId: result.user.id,
      });

      return {
        user: userProfile,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
        throw error;
      }

      log.error('Token refresh failed', error);
      throw new Error('Failed to refresh tokens');
    }
  }

  /**
   * Request password reset - creates token and sends email
   */
  static async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    const { email } = data;
    const sanitizedEmail = UserValidation.sanitizeInput(email.toLowerCase());

    if (!UserValidation.isValidEmail(sanitizedEmail)) {
      throw new ValidationError('Invalid email format');
    }

    try {
      // Find user by email
      const user = await safePrismaOperation(async () => {
        return await prisma.user.findUnique({
          where: { email: sanitizedEmail },
          select: { id: true, email: true, displayName: true },
        });
      }, 'Find user for password reset');

      // Always return success to prevent email enumeration attacks
      if (!user) {
        log.auth('Password reset requested for non-existent email', {
          email: sanitizedEmail,
        });
        return;
      }

      // Generate secure reset token
      const resetToken = PasswordUtils.generateToken(32);
      const tokenHash = await PasswordUtils.hashPassword(resetToken);

      // Store reset token in database (expires in 1 hour)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await safePrismaOperation(async () => {
        // Delete any existing reset tokens for this user
        await prisma.passwordReset.deleteMany({
          where: { userId: user.id },
        });

        // Create new reset token
        await prisma.passwordReset.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        });
      }, 'Create password reset token');

      // Send password reset email
      const { EmailService } = await import('./email.js');
      await EmailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.displayName || undefined
      );

      log.auth('Password reset token created', {
        userId: user.id,
        email: sanitizedEmail,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      log.error('Password reset request failed', error, {
        email: sanitizedEmail,
      });

      // Don't throw error to prevent information disclosure
      return;
    }
  }

  /**
   * Confirm password reset with token
   */
  static async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
    const { token, newPassword } = data;

    if (!token || !newPassword) {
      throw new BadRequestError('Reset token and new password are required');
    }

    // Validate new password
    const passwordValidation = PasswordUtils.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password validation failed', {
        errors: passwordValidation.errors,
      });
    }

    try {
      await safePrismaOperation(async () => {
        // Find all valid reset tokens (not expired and not used)
        const resetTokens = await prisma.passwordReset.findMany({
          where: {
            expiresAt: { gt: new Date() },
            usedAt: null,
          },
          include: {
            user: { select: { id: true, email: true } },
          },
        });

        // Find the matching token by comparing hashes
        let matchingReset = null;
        for (const reset of resetTokens) {
          const isMatch = await PasswordUtils.verifyPassword(token, reset.tokenHash);
          if (isMatch) {
            matchingReset = reset;
            break;
          }
        }

        if (!matchingReset) {
          throw new UnauthorizedError('Invalid or expired reset token');
        }

        // Hash new password
        const newPasswordHash = await PasswordUtils.hashPassword(newPassword);

        // Update user password
        await prisma.user.update({
          where: { id: matchingReset.userId },
          data: { passwordHash: newPasswordHash },
        });

        // Mark reset token as used
        await prisma.passwordReset.update({
          where: { id: matchingReset.id },
          data: { usedAt: new Date() },
        });

        // Revoke all user sessions for security
        await JwtService.revokeUserTokens(matchingReset.userId, {
          reason: 'Password reset',
        });

        log.auth('Password reset completed', {
          userId: matchingReset.userId,
          email: matchingReset.user.email,
        });
      }, 'Confirm password reset');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }

      log.error('Password reset confirmation failed', error);
      throw new BadRequestError('Failed to reset password');
    }
  }

  /**
   * Generate email verification token (JWT-based)
   */
  static generateEmailVerificationToken(userId: string, email: string): string {
    const payload = {
      sub: userId,
      email,
      type: 'email_verification' as const,
    };

    const result = JwtUtils.sign(payload, { expiresIn: '24h' });
    if (!result.success) {
      throw new Error('Failed to generate email verification token');
    }

    return result.data!;
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(userId: string): Promise<void> {
    try {
      const user = await safePrismaOperation(async () => {
        return await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, displayName: true, emailVerified: true },
        });
      }, 'Get user for email verification');

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (user.emailVerified) {
        throw new BadRequestError('Email is already verified');
      }

      // Generate verification token
      const verificationToken = this.generateEmailVerificationToken(user.id, user.email);

      // Send verification email
      const { EmailService } = await import('./email.js');
      await EmailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.displayName || undefined
      );

      log.auth('Email verification token generated', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Failed to send email verification', error, { userId });
      throw new BadRequestError('Failed to send verification email');
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(data: EmailVerificationRequest): Promise<void> {
    const { token } = data;

    if (!token) {
      throw new BadRequestError('Verification token is required');
    }

    try {
      // Verify JWT token
      const verification = JwtUtils.verify(token);

      if (!verification.valid || !verification.payload) {
        throw new UnauthorizedError('Invalid or expired verification token');
      }

      const payload = verification.payload as any;

      if (payload.type !== 'email_verification') {
        throw new UnauthorizedError('Invalid verification token');
      }

      const { sub: userId, email } = payload;

      await safePrismaOperation(async () => {
        // Get user and verify email matches
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, emailVerified: true },
        });

        if (!user) {
          throw new NotFoundError('User not found');
        }

        if (user.email !== email) {
          throw new UnauthorizedError('Email verification token mismatch');
        }

        if (user.emailVerified) {
          // Already verified, but don't error
          log.auth('Email verification attempted on already verified account', {
            userId: user.id,
            email: user.email,
          });
          return;
        }

        // Mark email as verified
        await prisma.user.update({
          where: { id: userId },
          data: { emailVerified: true },
        });

        log.auth('Email verification completed', {
          userId: user.id,
          email: user.email,
        });
      }, 'Verify email');
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }

      log.error('Email verification failed', error);
      throw new BadRequestError('Failed to verify email');
    }
  }
}

// Export utilities as well
export { PasswordUtils, UserValidation, UserTransforms, AUTH_CONFIG };