/**
 * Email service comprehensive tests
 *
 * Tests all email service functionality including template compilation,
 * rate limiting, SMTP configuration, and all email methods.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import nodemailer from 'nodemailer';
import { EmailService } from '../services/email.js';
import { log } from '../utils/logger.js';

// Mock nodemailer
vi.mock('nodemailer');
const mockedNodemailer = nodemailer as any;

// Mock logger
vi.mock('../utils/logger.js', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Create mock transporter
const mockTransporter = {
  sendMail: vi.fn(),
  verify: vi.fn(),
  close: vi.fn(),
};

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup nodemailer mock
    mockedNodemailer.createTransporter = vi.fn().mockReturnValue(mockTransporter);

    // Setup default successful SMTP verification
    mockTransporter.verify.mockResolvedValue(true);
    mockTransporter.sendMail.mockResolvedValue({
      messageId: 'test-message-id',
      response: 'OK',
    });
  });

  afterEach(async () => {
    // Cleanup after each test
    await EmailService.cleanup();
    vi.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', async () => {
      process.env.NODE_ENV = 'test';

      await EmailService.initialize();

      expect(mockedNodemailer.createTransporter).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
        })
      );
    });

    it('should initialize with custom SMTP configuration', async () => {
      process.env.NODE_ENV = 'test';
      process.env.SMTP_HOST = 'custom.smtp.com';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_SECURE = 'true';
      process.env.SMTP_USER = 'test@example.com';
      process.env.SMTP_PASS = 'testpass';

      await EmailService.initialize();

      expect(mockedNodemailer.createTransporter).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'custom.smtp.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'testpass',
          },
        })
      );

      // Cleanup env vars
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_SECURE;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    it('should handle SMTP verification failure', async () => {
      process.env.NODE_ENV = 'development';
      mockTransporter.verify.mockRejectedValue(new Error('SMTP connection failed'));

      await expect(EmailService.initialize()).rejects.toThrow('Email service initialization failed');
      expect(log.error).toHaveBeenCalledWith('Failed to initialize email service', expect.any(Error));
    });

    it('should skip verification in test environment', async () => {
      process.env.NODE_ENV = 'test';

      await EmailService.initialize();

      expect(mockTransporter.verify).not.toHaveBeenCalled();
    });
  });

  describe('Template Compilation', () => {
    beforeEach(() => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn();
    });

    it('should compile templates with all files present', async () => {
      const fs = require('fs/promises');
      fs.readFile
        .mockResolvedValueOnce('<html><body>{{recipientName}}</body></html>') // html.hbs
        .mockResolvedValueOnce('Hello {{recipientName}}') // text.hbs
        .mockResolvedValueOnce('Test Subject - {{appName}}'); // subject.hbs

      const compiled = await (EmailService as any).compileTemplate('test-template');

      expect(compiled).toHaveProperty('html');
      expect(compiled).toHaveProperty('text');
      expect(compiled).toHaveProperty('subject');
      expect(typeof compiled.html).toBe('function');
      expect(typeof compiled.text).toBe('function');
      expect(typeof compiled.subject).toBe('function');
    });

    it('should handle missing template files gracefully', async () => {
      const fs = require('fs/promises');
      fs.readFile
        .mockRejectedValueOnce(new Error('File not found')) // html.hbs missing
        .mockRejectedValueOnce(new Error('File not found')) // text.hbs missing
        .mockRejectedValueOnce(new Error('File not found')); // subject.hbs missing

      const compiled = await (EmailService as any).compileTemplate('missing-template');

      expect(compiled).toHaveProperty('html');
      expect(compiled).toHaveProperty('text');
      expect(compiled).toHaveProperty('subject');

      // Should use fallback templates
      const htmlResult = compiled.html({ body: 'Test content' });
      const textResult = compiled.text({ body: 'Test content' });
      const subjectResult = compiled.subject({});

      expect(htmlResult).toBe('<p>Test content</p>');
      expect(textResult).toBe('Test content');
      expect(subjectResult).toBe('missing-template');
    });

    it('should cache compiled templates', async () => {
      const fs = require('fs/promises');
      fs.readFile
        .mockResolvedValueOnce('<html>{{message}}</html>')
        .mockResolvedValueOnce('{{message}}')
        .mockResolvedValueOnce('{{title}}');

      // First compilation
      await (EmailService as any).compileTemplate('cached-template');

      // Second compilation should use cache
      await (EmailService as any).compileTemplate('cached-template');

      // Should only read files once due to caching
      expect(fs.readFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      process.env.EMAIL_RATE_LIMIT_HOUR = '2';
      process.env.EMAIL_RATE_LIMIT_DAY = '5';
      await EmailService.initialize();
    });

    afterEach(() => {
      delete process.env.EMAIL_RATE_LIMIT_HOUR;
      delete process.env.EMAIL_RATE_LIMIT_DAY;
    });

    it('should allow emails within rate limit', () => {
      const result = (EmailService as any).checkRateLimit('test@example.com');
      expect(result).toBe(true);
    });

    it('should block emails exceeding hourly rate limit', () => {
      const email = 'hourly@example.com';

      // Use up hourly limit
      (EmailService as any).checkRateLimit(email);
      (EmailService as any).checkRateLimit(email);

      // Next should be blocked
      const result = (EmailService as any).checkRateLimit(email);
      expect(result).toBe(false);
    });

    it('should block emails exceeding daily rate limit', () => {
      const email = 'daily@example.com';

      // Mock the daily tracker to exceed limit
      const rateLimitTracker = (EmailService as any).rateLimitTracker;
      const now = Date.now();
      const dayKey = `${email}:${Math.floor(now / (1000 * 60 * 60 * 24))}`;
      rateLimitTracker.set(dayKey, { count: 5, resetTime: now + (1000 * 60 * 60 * 24) });

      const result = (EmailService as any).checkRateLimit(email);
      expect(result).toBe(false);
    });
  });

  describe('Email Validation', () => {
    beforeEach(async () => {
      await EmailService.initialize();
    });

    it('should reject invalid email addresses', async () => {
      const invalidEmails = [
        '',
        'invalid',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@example',
      ];

      for (const email of invalidEmails) {
        await expect(
          (EmailService as any).sendTemplatedEmail('test', email, {})
        ).rejects.toThrow('Invalid email address format');
      }
    });

    it('should accept valid email addresses', async () => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn()
        .mockResolvedValueOnce('<html>{{recipientName}}</html>')
        .mockResolvedValueOnce('{{recipientName}}')
        .mockResolvedValueOnce('Test Subject');

      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@subdomain.example.com',
      ];

      for (const email of validEmails) {
        await expect(
          (EmailService as any).sendTemplatedEmail('test', email, { recipientName: 'Test' })
        ).resolves.not.toThrow();
      }
    });
  });

  describe('Verification Email', () => {
    beforeEach(async () => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn()
        .mockResolvedValueOnce('<html>{{verificationLink}}</html>')
        .mockResolvedValueOnce('{{verificationLink}}')
        .mockResolvedValueOnce('Verify {{appName}}');

      await EmailService.initialize();
    });

    it('should send verification email with correct data', async () => {
      await EmailService.sendVerificationEmail(
        'user@example.com',
        'test-token-123',
        'John Doe'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Verify'),
          html: expect.stringContaining('http://localhost:5173/verify-email?token=test-token-123'),
          text: expect.stringContaining('http://localhost:5173/verify-email?token=test-token-123'),
          priority: 'high',
        })
      );
    });

    it('should use default recipient name when not provided', async () => {
      await EmailService.sendVerificationEmail('user@example.com', 'test-token');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
        })
      );
    });

    it('should use custom frontend URL from environment', async () => {
      process.env.FRONTEND_URL = 'https://app.example.com';

      await EmailService.sendVerificationEmail('user@example.com', 'test-token');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://app.example.com/verify-email?token=test-token'),
        })
      );

      delete process.env.FRONTEND_URL;
    });
  });

  describe('Password Reset Email', () => {
    beforeEach(async () => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn()
        .mockResolvedValueOnce('<html>{{resetLink}} {{ipAddress}}</html>')
        .mockResolvedValueOnce('{{resetLink}} {{ipAddress}}')
        .mockResolvedValueOnce('Reset Password');

      await EmailService.initialize();
    });

    it('should send password reset email with context', async () => {
      await EmailService.sendPasswordResetEmail(
        'user@example.com',
        'reset-token-123',
        'Jane Doe',
        { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          html: expect.stringContaining('192.168.1.1'),
          priority: 'high',
        })
      );
    });

    it('should work without optional context', async () => {
      await EmailService.sendPasswordResetEmail(
        'user@example.com',
        'reset-token-123'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe('Trip Invite Email', () => {
    beforeEach(async () => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn()
        .mockResolvedValueOnce('<html>{{inviterName}} {{tripName}} {{inviteLink}}</html>')
        .mockResolvedValueOnce('{{inviterName}} {{tripName}} {{inviteLink}}')
        .mockResolvedValueOnce('Trip Invite');

      await EmailService.initialize();
    });

    it('should send trip invitation with all data', async () => {
      const inviteData = {
        recipientEmail: 'friend@example.com',
        recipientName: 'Friend User',
        inviterName: 'John Doe',
        tripName: 'Summer Vacation',
        tripDescription: 'Beach trip with friends',
        tripDates: 'July 15-22, 2024',
        tripLocation: 'Hawaii',
        inviteCode: 'ABC123',
      };

      await EmailService.sendTripInviteEmail(inviteData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'friend@example.com',
          html: expect.stringContaining('John Doe'),
          html: expect.stringMatching(/Summer Vacation/),
          html: expect.stringMatching(/trips\/join\/ABC123/),
        })
      );
    });
  });

  describe('Event Update Email', () => {
    beforeEach(async () => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn()
        .mockResolvedValueOnce('<html>{{eventName}} {{updateType}} {{eventLink}}</html>')
        .mockResolvedValueOnce('{{eventName}} {{updateType}} {{eventLink}}')
        .mockResolvedValueOnce('Event {{updateType}}');

      await EmailService.initialize();
    });

    it('should send event update email', async () => {
      const updateData = {
        recipientEmail: 'user@example.com',
        recipientName: 'User Name',
        eventName: 'Beach Day',
        eventDescription: 'Fun in the sun',
        eventDate: '2024-07-15',
        eventTime: '10:00 AM',
        tripName: 'Summer Vacation',
        updateType: 'created' as const,
        updaterName: 'John Doe',
        eventId: 'event-123',
        tripId: 'trip-456',
      };

      await EmailService.sendEventUpdateEmail(updateData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          html: expect.stringContaining('Beach Day'),
          html: expect.stringMatching(/created/),
          html: expect.stringMatching(/trips\/trip-456\/events\/event-123/),
        })
      );
    });
  });

  describe('Item Reminder Email', () => {
    beforeEach(async () => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn()
        .mockResolvedValueOnce('<html>{{itemName}} {{reminderType}} {{itemLink}}</html>')
        .mockResolvedValueOnce('{{itemName}} {{reminderType}} {{itemLink}}')
        .mockResolvedValueOnce('Item {{reminderType}}');

      await EmailService.initialize();
    });

    it('should send item reminder email', async () => {
      const reminderData = {
        recipientEmail: 'user@example.com',
        recipientName: 'User Name',
        itemName: 'Beach Umbrella',
        itemDescription: 'Large beach umbrella for shade',
        quantity: 2,
        tripName: 'Summer Vacation',
        tripDate: '2024-07-15',
        reminderType: 'claimed' as const,
        itemId: 'item-789',
        tripId: 'trip-456',
      };

      await EmailService.sendItemReminderEmail(reminderData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          html: expect.stringContaining('Beach Umbrella'),
          html: expect.stringMatching(/claimed/),
          html: expect.stringMatching(/trips\/trip-456\/items\/item-789/),
        })
      );
    });
  });

  describe('Digest Email', () => {
    beforeEach(async () => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn()
        .mockResolvedValueOnce('<html>{{digestPeriod}} {{totalNotifications}}</html>')
        .mockResolvedValueOnce('{{digestPeriod}} {{totalNotifications}}')
        .mockResolvedValueOnce('{{digestPeriod}} digest');

      await EmailService.initialize();
    });

    it('should send digest email with trip summaries', async () => {
      const digestData = {
        recipientEmail: 'user@example.com',
        recipientName: 'User Name',
        digestPeriod: 'weekly' as const,
        tripSummaries: [
          {
            tripName: 'Summer Trip',
            newEvents: 2,
            newItems: 1,
            newMembers: 0,
            tripId: 'trip-123',
          },
        ],
        notifications: [
          {
            type: 'event_created',
            title: 'New Event Created',
            body: 'Beach day event was created',
            timestamp: '2024-07-01T10:00:00Z',
          },
        ],
      };

      await EmailService.sendDigestEmail(digestData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          html: expect.stringContaining('weekly'),
          html: expect.stringContaining('1'), // totalNotifications
        })
      );
    });
  });

  describe('Service Status and Testing', () => {
    beforeEach(async () => {
      await EmailService.initialize();
    });

    it('should return service status', () => {
      const status = EmailService.getStatus();

      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('templatesCached');
      expect(status).toHaveProperty('rateLimitEntries');
      expect(status).toHaveProperty('config');
      expect(status.config.smtp).toHaveProperty('host');
      expect(status.config.smtp.auth.pass).toBe('[REDACTED]');
    });

    it('should test configuration successfully', async () => {
      const result = await EmailService.testConfiguration();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should handle test configuration failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await EmailService.testConfiguration();

      expect(result).toBe(false);
      expect(log.error).toHaveBeenCalledWith('Email configuration test failed', expect.any(Error));
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await EmailService.initialize();
    });

    it('should handle SMTP send failures gracefully', async () => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn()
        .mockResolvedValueOnce('<html>{{recipientName}}</html>')
        .mockResolvedValueOnce('{{recipientName}}')
        .mockResolvedValueOnce('Test Subject');

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        (EmailService as any).sendTemplatedEmail('test', 'user@example.com', { recipientName: 'Test' })
      ).rejects.toThrow('Failed to send email');

      expect(log.error).toHaveBeenCalledWith(
        'Failed to send email',
        expect.any(Error),
        expect.objectContaining({
          recipient: 'user@example.com',
          template: 'test',
        })
      );
    });

    it('should handle missing template data gracefully', async () => {
      const fs = require('fs/promises');
      fs.readFile = vi.fn()
        .mockRejectedValue(new Error('Template not found'));

      await expect(
        (EmailService as any).compileTemplate('nonexistent')
      ).rejects.toThrow('Email template not found: nonexistent');
    });

    it('should require recipient and template name', async () => {
      await expect(
        (EmailService as any).sendTemplatedEmail('', 'user@example.com', {})
      ).rejects.toThrow('Recipient and template name are required');

      await expect(
        (EmailService as any).sendTemplatedEmail('test', '', {})
      ).rejects.toThrow('Recipient and template name are required');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await EmailService.initialize();
      await EmailService.cleanup();

      expect(mockTransporter.close).toHaveBeenCalled();

      const status = EmailService.getStatus();
      expect(status.configured).toBe(false);
      expect(status.templatesCached).toBe(0);
      expect(status.rateLimitEntries).toBe(0);
    });
  });
});

describe('EmailService Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedNodemailer.createTransporter = vi.fn().mockReturnValue(mockTransporter);
    mockTransporter.verify.mockResolvedValue(true);
    mockTransporter.sendMail.mockResolvedValue({
      messageId: 'integration-test-id',
      response: 'OK',
    });
  });

  afterEach(async () => {
    await EmailService.cleanup();
  });

  it('should handle complete email flow', async () => {
    // Mock template files
    const fs = require('fs/promises');
    fs.readFile = vi.fn()
      .mockResolvedValueOnce('<html>Hello {{recipientName}}, verify: {{verificationLink}}</html>')
      .mockResolvedValueOnce('Hello {{recipientName}}, verify: {{verificationLink}}')
      .mockResolvedValueOnce('Verify your account');

    // Initialize service
    await EmailService.initialize();

    // Send verification email
    await EmailService.sendVerificationEmail(
      'integration@example.com',
      'integration-token-123',
      'Integration User'
    );

    // Verify all components worked together
    expect(mockedNodemailer.createTransporter).toHaveBeenCalled();
    expect(mockTransporter.verify).toHaveBeenCalled();
    expect(fs.readFile).toHaveBeenCalledTimes(3);
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'integration@example.com',
        subject: 'Verify your account',
        html: expect.stringContaining('Hello Integration User'),
        text: expect.stringContaining('Hello Integration User'),
      })
    );
  });
});