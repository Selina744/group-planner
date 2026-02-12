/**
 * AuthService Unit Tests
 *
 * Comprehensive tests for user registration, login, password validation,
 * and authentication-related functionality.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import bcrypt from 'bcrypt';
import {
  AuthService,
  PasswordUtils,
  UserValidation,
  AUTH_CONFIG
} from '../../services/auth.js';
import { JwtService } from '../../services/jwt.js';
import { JwtUtils } from '../../lib/jwt.js';
import { UserFixtures } from '../utils/test-fixtures.js';
import {
  getTestDb,
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase
} from '../utils/test-database.js';
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError
} from '../../utils/errors.js';

describe('AuthService', () => {
  const prisma = getTestDb();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // =========================================================================
  // PASSWORD UTILS TESTS
  // =========================================================================

  describe('PasswordUtils', () => {
    describe('hashPassword', () => {
      it('should hash a password using bcrypt', async () => {
        const password = 'TestPassword123!';
        const hash = await PasswordUtils.hashPassword(password);

        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
        expect(hash).not.toBe(password);
        expect(hash.startsWith('$2b$')).toBe(true); // bcrypt hash format
      });

      it('should generate different hashes for the same password', async () => {
        const password = 'TestPassword123!';
        const hash1 = await PasswordUtils.hashPassword(password);
        const hash2 = await PasswordUtils.hashPassword(password);

        expect(hash1).not.toBe(hash2); // Different salts
      });

      it('should use the configured bcrypt rounds', async () => {
        const password = 'TestPassword123!';
        const hash = await PasswordUtils.hashPassword(password);

        // bcrypt hash format: $2b$<cost>$<salt+hash>
        const costMatch = hash.match(/\$2b\$(\d+)\$/);
        expect(costMatch).not.toBeNull();
        expect(Number(costMatch![1])).toBe(AUTH_CONFIG.bcryptRounds);
      });
    });

    describe('verifyPassword', () => {
      it('should return true for correct password', async () => {
        const password = 'TestPassword123!';
        const hash = await PasswordUtils.hashPassword(password);

        const isValid = await PasswordUtils.verifyPassword(password, hash);
        expect(isValid).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const password = 'TestPassword123!';
        const hash = await PasswordUtils.hashPassword(password);

        const isValid = await PasswordUtils.verifyPassword('WrongPassword123!', hash);
        expect(isValid).toBe(false);
      });

      it('should return false for invalid hash', async () => {
        const isValid = await PasswordUtils.verifyPassword('test', 'invalid-hash');
        expect(isValid).toBe(false);
      });
    });

    describe('validatePassword', () => {
      it('should accept a strong password meeting all requirements', () => {
        const result = PasswordUtils.validatePassword('StrongP@ss123');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(['medium', 'strong']).toContain(result.strength);
      });

      it('should reject password shorter than minimum length', () => {
        const result = PasswordUtils.validatePassword('Short1!');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Password must be at least ${AUTH_CONFIG.passwordRequirements.minLength} characters long`);
      });

      it('should reject password without uppercase letter', () => {
        const result = PasswordUtils.validatePassword('lowercase123!');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });

      it('should reject password without lowercase letter', () => {
        const result = PasswordUtils.validatePassword('UPPERCASE123!');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });

      it('should reject password without numbers', () => {
        const result = PasswordUtils.validatePassword('NoNumbers!!');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should reject password without special characters', () => {
        const result = PasswordUtils.validatePassword('NoSpecial123');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one special character');
      });

      it('should accumulate all validation errors', () => {
        const result = PasswordUtils.validatePassword('abc');

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.strength).toBe('weak');
      });

      it('should classify a strong password correctly', () => {
        // Strong password: 12+ chars with all requirements
        const result = PasswordUtils.validatePassword('VeryStrong@P123');

        expect(result.isValid).toBe(true);
        expect(result.strength).toBe('strong');
      });

      it('should classify a medium password correctly', () => {
        // Medium: meets all requirements but < 12 chars
        const result = PasswordUtils.validatePassword('Medium@1');

        expect(result.isValid).toBe(true);
        expect(result.strength).toBe('medium');
      });
    });

    describe('generateToken', () => {
      it('should generate a token of specified length', () => {
        const token = PasswordUtils.generateToken(32);

        expect(token).toBeDefined();
        expect(token.length).toBe(64); // 32 bytes = 64 hex chars
      });

      it('should generate unique tokens', () => {
        const token1 = PasswordUtils.generateToken();
        const token2 = PasswordUtils.generateToken();

        expect(token1).not.toBe(token2);
      });
    });
  });

  // =========================================================================
  // USER VALIDATION TESTS
  // =========================================================================

  describe('UserValidation', () => {
    describe('isValidEmail', () => {
      it('should accept valid email formats', () => {
        const validEmails = [
          'user@example.com',
          'user.name@example.com',
          'user+tag@example.com',
          'user@subdomain.example.com',
          'user@example.co.uk'
        ];

        for (const email of validEmails) {
          expect(UserValidation.isValidEmail(email)).toBe(true);
        }
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'invalid',
          'invalid@',
          '@example.com',
          'user@.com',
          'user@example',
          'user name@example.com'
        ];

        for (const email of invalidEmails) {
          expect(UserValidation.isValidEmail(email)).toBe(false);
        }
      });
    });

    describe('isValidUsername', () => {
      it('should accept valid usernames', () => {
        const validUsernames = [
          'user',
          'user123',
          'user_name',
          'user-name',
          'User123',
          'abc' // minimum 3 chars
        ];

        for (const username of validUsernames) {
          expect(UserValidation.isValidUsername(username)).toBe(true);
        }
      });

      it('should reject invalid usernames', () => {
        const invalidUsernames = [
          'ab', // too short
          'a'.repeat(21), // too long
          'user name', // spaces
          'user@name', // special chars
          'user.name' // periods not allowed
        ];

        for (const username of invalidUsernames) {
          expect(UserValidation.isValidUsername(username)).toBe(false);
        }
      });
    });

    describe('sanitizeInput', () => {
      it('should trim whitespace', () => {
        expect(UserValidation.sanitizeInput('  test  ')).toBe('test');
        expect(UserValidation.sanitizeInput('\ttest\n')).toBe('test');
      });
    });
  });

  // =========================================================================
  // REGISTRATION TESTS
  // =========================================================================

  describe('register', () => {
    it('should register a new user with valid data', async () => {
      const result = await AuthService.register({
        email: 'newuser@example.com',
        password: 'ValidP@ss123',
        username: 'newuser',
        displayName: 'New User'
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.username).toBe('newuser');
      expect(result.user.displayName).toBe('New User');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should register without optional username', async () => {
      const result = await AuthService.register({
        email: 'nousername@example.com',
        password: 'ValidP@ss123'
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('nousername@example.com');
      // Username is null or undefined when not provided
      expect(result.user.username == null).toBe(true);
    });

    it('should normalize email to lowercase', async () => {
      const result = await AuthService.register({
        email: 'UPPERCASE@EXAMPLE.COM',
        password: 'ValidP@ss123'
      });

      expect(result.user.email).toBe('uppercase@example.com');
    });

    it('should normalize username to lowercase', async () => {
      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'ValidP@ss123',
        username: 'TestUser'
      });

      expect(result.user.username).toBe('testuser');
    });

    it('should set default timezone to UTC', async () => {
      const result = await AuthService.register({
        email: 'timezone@example.com',
        password: 'ValidP@ss123'
      });

      expect(result.user.timezone).toBe('UTC');
    });

    it('should hash the password before storing', async () => {
      await AuthService.register({
        email: 'hashtest@example.com',
        password: 'ValidP@ss123'
      });

      const user = await prisma.user.findUnique({
        where: { email: 'hashtest@example.com' }
      });

      expect(user).not.toBeNull();
      expect(user!.passwordHash).not.toBe('ValidP@ss123');
      expect(user!.passwordHash.startsWith('$2b$')).toBe(true);
    });

    it('should reject duplicate email', async () => {
      // Use unique email prefix to avoid race conditions with parallel tests
      const uniqueEmail = `dup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;

      await AuthService.register({
        email: uniqueEmail,
        password: 'ValidP@ss123'
      });

      await expect(
        AuthService.register({
          email: uniqueEmail,
          password: 'ValidP@ss123'
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should reject duplicate username', async () => {
      await AuthService.register({
        email: 'first@example.com',
        password: 'ValidP@ss123',
        username: 'duplicateuser'
      });

      await expect(
        AuthService.register({
          email: 'second@example.com',
          password: 'ValidP@ss123',
          username: 'duplicateuser'
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should reject invalid email format', async () => {
      await expect(
        AuthService.register({
          email: 'invalid-email',
          password: 'ValidP@ss123'
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject invalid username format', async () => {
      await expect(
        AuthService.register({
          email: 'valid@example.com',
          password: 'ValidP@ss123',
          username: 'ab' // too short
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject weak password', async () => {
      await expect(
        AuthService.register({
          email: 'valid@example.com',
          password: 'weak' // does not meet requirements
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should return token pair on successful registration', async () => {
      const result = await AuthService.register({
        email: 'tokens@example.com',
        password: 'ValidP@ss123'
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verify tokens are valid JWTs
      const accessPayload = JwtUtils.verify(result.accessToken);
      expect(accessPayload.valid).toBe(true);

      const refreshPayload = JwtUtils.verify(result.refreshToken);
      expect(refreshPayload.valid).toBe(true);
    });
  });

  // =========================================================================
  // LOGIN TESTS
  // =========================================================================

  describe('login', () => {
    // Helper function to create test user with known password
    async function createLoginTestUser(email?: string, username?: string) {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const testEmail = email || `login-${uniqueId}@example.com`;
      const testUsername = username || `loginuser${uniqueId}`;
      const password = 'ValidP@ss123';

      const hash = await bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          username: testUsername,
          passwordHash: hash,
          displayName: 'Login Test User',
          emailVerified: true
        }
      });

      return { user, email: testEmail, username: testUsername, password };
    }

    it('should login with correct email and password', async () => {
      const { email, password } = await createLoginTestUser();

      const result = await AuthService.login({
        identifier: email,
        password
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should login with correct username and password', async () => {
      const { username, password } = await createLoginTestUser();

      const result = await AuthService.login({
        identifier: username,
        password
      });

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe(username);
    });

    it('should normalize identifier to lowercase', async () => {
      const { email, password } = await createLoginTestUser();

      const result = await AuthService.login({
        identifier: email.toUpperCase(),
        password
      });

      expect(result.user.email).toBe(email);
    });

    it('should reject incorrect password', async () => {
      const { email } = await createLoginTestUser();

      await expect(
        AuthService.login({
          identifier: email,
          password: 'WrongPassword123!'
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should reject non-existent user', async () => {
      await expect(
        AuthService.login({
          identifier: `nonexistent-${Date.now()}@example.com`,
          password: 'ValidP@ss123'
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should return generic error message regardless of failure reason', async () => {
      const { email } = await createLoginTestUser();
      const nonexistentEmail = `nonexistent-${Date.now()}@example.com`;

      // Test that error message is same for non-existent user
      let error1: Error | null = null;
      try {
        await AuthService.login({
          identifier: nonexistentEmail,
          password: 'ValidP@ss123'
        });
      } catch (e) {
        error1 = e as Error;
      }

      // Test that error message is same for wrong password
      let error2: Error | null = null;
      try {
        await AuthService.login({
          identifier: email,
          password: 'WrongPassword123!'
        });
      } catch (e) {
        error2 = e as Error;
      }

      expect(error1).not.toBeNull();
      expect(error2).not.toBeNull();
      expect(error1!.message).toBe(error2!.message);
      expect(error1!.message).toBe('Invalid credentials');
    });

    it('should reject empty identifier', async () => {
      await expect(
        AuthService.login({
          identifier: '',
          password: 'ValidP@ss123'
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject empty password', async () => {
      await expect(
        AuthService.login({
          identifier: `anyuser-${Date.now()}@example.com`,
          password: ''
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should record successful login attempt', async () => {
      const { email, password } = await createLoginTestUser();

      await AuthService.login(
        {
          identifier: email,
          password
        },
        { ipAddress: '192.168.1.1' }
      );

      const attempts = await prisma.loginAttempt.findMany({
        where: {
          identifier: email,
          success: true
        }
      });

      expect(attempts.length).toBeGreaterThan(0);
      expect(attempts[0].ipAddress).toBe('192.168.1.1');
    });

    it('should record failed login attempt', async () => {
      const { email } = await createLoginTestUser();

      try {
        await AuthService.login(
          {
            identifier: email,
            password: 'WrongPassword!'
          },
          { ipAddress: '192.168.1.1' }
        );
      } catch {
        // Expected to fail
      }

      const attempts = await prisma.loginAttempt.findMany({
        where: {
          identifier: email,
          success: false
        }
      });

      expect(attempts.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // USER RETRIEVAL TESTS
  // =========================================================================

  describe('getUserById', () => {
    it('should return user profile for valid user ID', async () => {
      const createdUser = await UserFixtures.createUser({
        email: 'getuser@example.com',
        displayName: 'Get User Test'
      });

      const profile = await AuthService.getUserById(createdUser.id);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(createdUser.id);
      expect(profile.email).toBe('getuser@example.com');
      expect(profile.displayName).toBe('Get User Test');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        AuthService.getUserById('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should not expose password hash in profile', async () => {
      const createdUser = await UserFixtures.createUser();
      const profile = await AuthService.getUserById(createdUser.id);

      expect((profile as any).passwordHash).toBeUndefined();
    });
  });

  // =========================================================================
  // EMAIL/USERNAME EXISTENCE CHECKS
  // =========================================================================

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      await UserFixtures.createUser({ email: 'exists@example.com' });

      const exists = await AuthService.emailExists('exists@example.com');
      expect(exists).toBe(true);
    });

    it('should return false for non-existing email', async () => {
      const exists = await AuthService.emailExists('notexists@example.com');
      expect(exists).toBe(false);
    });

    it('should be case-insensitive', async () => {
      await UserFixtures.createUser({ email: 'casetest@example.com' });

      const exists = await AuthService.emailExists('CASETEST@EXAMPLE.COM');
      expect(exists).toBe(true);
    });
  });

  describe('usernameExists', () => {
    it('should return true for existing username', async () => {
      await UserFixtures.createUser({ username: 'existinguser' });

      const exists = await AuthService.usernameExists('existinguser');
      expect(exists).toBe(true);
    });

    it('should return false for non-existing username', async () => {
      const exists = await AuthService.usernameExists('notexistinguser');
      expect(exists).toBe(false);
    });

    it('should be case-insensitive', async () => {
      await UserFixtures.createUser({ username: 'caseuser' });

      const exists = await AuthService.usernameExists('CASEUSER');
      expect(exists).toBe(true);
    });
  });

  // =========================================================================
  // PROFILE UPDATE TESTS
  // =========================================================================

  describe('updateProfile', () => {
    it('should update display name', async () => {
      const user = await UserFixtures.createUser();

      const updated = await AuthService.updateProfile(user.id, {
        displayName: 'Updated Name'
      });

      expect(updated.displayName).toBe('Updated Name');
    });

    it('should update timezone', async () => {
      const user = await UserFixtures.createUser();

      const updated = await AuthService.updateProfile(user.id, {
        timezone: 'America/Los_Angeles'
      });

      expect(updated.timezone).toBe('America/Los_Angeles');
    });

    it('should update username', async () => {
      const user = await UserFixtures.createUser({ username: 'oldusername' });

      const updated = await AuthService.updateProfile(user.id, {
        username: 'newusername'
      });

      expect(updated.username).toBe('newusername');
    });

    it('should reject duplicate username on update', async () => {
      const user1 = await UserFixtures.createUser({ username: 'user1' });
      await UserFixtures.createUser({ username: 'user2' });

      await expect(
        AuthService.updateProfile(user1.id, { username: 'user2' })
      ).rejects.toThrow(ConflictError);
    });

    it('should reject invalid username format', async () => {
      const user = await UserFixtures.createUser();

      await expect(
        AuthService.updateProfile(user.id, { username: 'a' }) // too short
      ).rejects.toThrow(ValidationError);
    });
  });

  // =========================================================================
  // PASSWORD CHANGE TESTS
  // =========================================================================

  describe('changePassword', () => {
    let testUser: any;

    beforeEach(async () => {
      const hash = await bcrypt.hash('CurrentP@ss123', AUTH_CONFIG.bcryptRounds);
      testUser = await prisma.user.create({
        data: {
          email: 'changepass@example.com',
          passwordHash: hash,
          emailVerified: true
        }
      });
    });

    it('should change password with correct current password', async () => {
      await AuthService.changePassword(testUser.id, {
        currentPassword: 'CurrentP@ss123',
        newPassword: 'NewP@ssword456'
      });

      // Verify new password works
      const result = await AuthService.login({
        identifier: 'changepass@example.com',
        password: 'NewP@ssword456'
      });

      expect(result.user).toBeDefined();
    });

    it('should reject incorrect current password', async () => {
      await expect(
        AuthService.changePassword(testUser.id, {
          currentPassword: 'WrongP@ss123',
          newPassword: 'NewP@ssword456'
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should reject weak new password', async () => {
      await expect(
        AuthService.changePassword(testUser.id, {
          currentPassword: 'CurrentP@ss123',
          newPassword: 'weak'
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        AuthService.changePassword('non-existent-id', {
          currentPassword: 'CurrentP@ss123',
          newPassword: 'NewP@ssword456'
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =========================================================================
  // LOGOUT TESTS
  // =========================================================================

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      // Register a user to get tokens
      const registration = await AuthService.register({
        email: 'logout@example.com',
        password: 'ValidP@ss123'
      });

      // Logout
      await AuthService.logout(registration.refreshToken);

      // Verify refresh token is revoked
      await expect(
        AuthService.refreshTokens(registration.refreshToken)
      ).rejects.toThrow();
    });

    it('should reject invalid refresh token', async () => {
      await expect(
        AuthService.logout('invalid-token')
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  // =========================================================================
  // TOKEN REFRESH TESTS
  // =========================================================================

  describe('refreshTokens', () => {
    it('should return new token pair with valid refresh token', async () => {
      const registration = await AuthService.register({
        email: 'refresh@example.com',
        password: 'ValidP@ss123'
      });

      const refreshed = await AuthService.refreshTokens(registration.refreshToken);

      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.refreshToken).toBeDefined();
      expect(refreshed.user).toBeDefined();
      expect(refreshed.user.email).toBe('refresh@example.com');
    });

    it('should reject revoked refresh token', async () => {
      const registration = await AuthService.register({
        email: 'revoked@example.com',
        password: 'ValidP@ss123'
      });

      // Logout to revoke the token
      await AuthService.logout(registration.refreshToken);

      // Try to refresh with revoked token
      await expect(
        AuthService.refreshTokens(registration.refreshToken)
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // EMAIL VERIFICATION TESTS
  // =========================================================================

  describe('generateEmailVerificationToken', () => {
    it('should generate a valid JWT token', () => {
      const token = AuthService.generateEmailVerificationToken('user-id', 'test@example.com');

      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3); // JWT format
    });

    it('should include correct payload', () => {
      const token = AuthService.generateEmailVerificationToken('user-id', 'test@example.com');

      const verification = JwtUtils.verify(token);
      expect(verification.valid).toBe(true);
      expect(verification.payload).toBeDefined();
      expect((verification.payload as any).sub).toBe('user-id');
      expect((verification.payload as any).email).toBe('test@example.com');
      expect((verification.payload as any).type).toBe('email_verification');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const user = await UserFixtures.createUser({
        email: 'verify@example.com',
        emailVerified: false
      });

      const token = AuthService.generateEmailVerificationToken(user.id, user.email);

      await AuthService.verifyEmail({ token });

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(updatedUser!.emailVerified).toBe(true);
    });

    it('should reject invalid token', async () => {
      await expect(
        AuthService.verifyEmail({ token: 'invalid-token' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should reject missing token', async () => {
      await expect(
        AuthService.verifyEmail({ token: '' })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
