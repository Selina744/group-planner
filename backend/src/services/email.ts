/**
 * Email service for Group Planner API
 *
 * Provides comprehensive email functionality using Nodemailer and Handlebars
 * templates with plain text fallbacks. Includes rate limiting, error handling,
 * and production-ready SMTP configuration.
 */

import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from '../utils/logger.js';
import {
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email configuration interface
 */
interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  defaults: {
    from: string;
    replyTo?: string;
  };
  templatesDir: string;
  rateLimits: {
    perHour: number;
    perDay: number;
  };
  features: {
    enableTracking: boolean;
    enableDeliveryStatus: boolean;
  };
}

/**
 * Email template data interfaces
 */
interface BaseEmailData {
  recipientName: string;
  supportEmail: string;
  appName: string;
  companyName: string;
  year: number;
}

interface VerificationEmailData extends BaseEmailData {
  verificationLink: string;
  verificationToken: string;
  expiryHours: number;
}

interface PasswordResetEmailData extends BaseEmailData {
  resetLink: string;
  resetToken: string;
  expiryHours: number;
  ipAddress?: string;
  userAgent?: string;
}

interface TripInviteEmailData extends BaseEmailData {
  inviterName: string;
  tripName: string;
  tripDescription: string;
  tripDates: string;
  tripLocation: string;
  inviteLink: string;
  inviteCode: string;
}

interface EventUpdateEmailData extends BaseEmailData {
  eventName: string;
  eventDescription: string;
  eventDate: string;
  eventTime: string;
  tripName: string;
  updateType: 'created' | 'updated' | 'cancelled' | 'approved';
  updaterName: string;
  eventLink: string;
}

interface ItemReminderEmailData extends BaseEmailData {
  itemName: string;
  itemDescription: string;
  quantity: number;
  tripName: string;
  tripDate: string;
  reminderType: 'claimed' | 'overdue' | 'reminder';
  itemLink: string;
}

interface DigestEmailData extends BaseEmailData {
  digestPeriod: 'daily' | 'weekly';
  tripSummaries: Array<{
    tripName: string;
    newEvents: number;
    newItems: number;
    newMembers: number;
    tripLink: string;
  }>;
  notifications: Array<{
    type: string;
    title: string;
    body: string;
    timestamp: string;
  }>;
  totalNotifications: number;
}

/**
 * Email service configuration from environment
 */
const EMAIL_CONFIG: EmailConfig = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  defaults: {
    from: process.env.EMAIL_FROM || 'Group Planner <noreply@groupplanner.app>',
    ...(process.env.EMAIL_REPLY_TO ? { replyTo: process.env.EMAIL_REPLY_TO } : {}),
  },
  templatesDir: path.resolve(__dirname, '../templates/emails'),
  rateLimits: {
    perHour: parseInt(process.env.EMAIL_RATE_LIMIT_HOUR || '100', 10),
    perDay: parseInt(process.env.EMAIL_RATE_LIMIT_DAY || '500', 10),
  },
  features: {
    enableTracking: process.env.EMAIL_ENABLE_TRACKING === 'true',
    enableDeliveryStatus: process.env.EMAIL_ENABLE_DELIVERY_STATUS === 'true',
  },
};

/**
 * Compiled template cache
 */
interface CompiledTemplate {
  html: HandlebarsTemplateDelegate<any>;
  text: HandlebarsTemplateDelegate<any>;
  subject: HandlebarsTemplateDelegate<any>;
}

/**
 * Template cache
 */
const templateCache = new Map<string, CompiledTemplate>();

/**
 * Rate limiting tracking (in production, use Redis)
 */
const rateLimitTracker = new Map<string, { count: number; resetTime: number }>();

/**
 * Email service class
 */
export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize the email service
   */
  static async initialize(): Promise<void> {
    try {
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: EMAIL_CONFIG.smtp.host,
        port: EMAIL_CONFIG.smtp.port,
        secure: EMAIL_CONFIG.smtp.secure,
        auth: EMAIL_CONFIG.smtp.auth,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 10,
      });

      // Verify SMTP configuration
      if (process.env.NODE_ENV !== 'test' && this.transporter) {
        await this.transporter.verify();
        log.info('Email service initialized successfully', {
          host: EMAIL_CONFIG.smtp.host,
          port: EMAIL_CONFIG.smtp.port,
          secure: EMAIL_CONFIG.smtp.secure,
        });
      }

      // Pre-compile commonly used templates
      await this.precompileTemplates(['verification', 'password-reset', 'trip-invite']);
    } catch (error) {
      log.error('Failed to initialize email service', error);
      throw new Error('Email service initialization failed');
    }
  }

  /**
   * Get or create transporter
   */
  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (!this.transporter) {
      await this.initialize();
    }
    return this.transporter!;
  }

  /**
   * Precompile email templates for performance
   */
  private static async precompileTemplates(templateNames: string[]): Promise<void> {
    for (const templateName of templateNames) {
      try {
        await this.compileTemplate(templateName);
        log.debug(`Template compiled: ${templateName}`);
      } catch (error) {
        log.warn(`Failed to precompile template: ${templateName}`, { error });
      }
    }
  }

  /**
   * Compile a Handlebars template with fallbacks
   */
  private static async compileTemplate(templateName: string): Promise<CompiledTemplate> {
    // Check cache first
    if (templateCache.has(templateName)) {
      return templateCache.get(templateName)!;
    }

    try {
      const templateDir = path.join(EMAIL_CONFIG.templatesDir, templateName);

      // Load template files
      const [htmlSource, textSource, subjectSource] = await Promise.all([
        fs.readFile(path.join(templateDir, 'html.hbs'), 'utf-8').catch(() => ''),
        fs.readFile(path.join(templateDir, 'text.hbs'), 'utf-8').catch(() => ''),
        fs.readFile(path.join(templateDir, 'subject.hbs'), 'utf-8').catch(() => templateName),
      ]);

      // Compile templates
      const compiled: CompiledTemplate = {
        html: handlebars.compile(htmlSource || '<p>{{body}}</p>'),
        text: handlebars.compile(textSource || '{{body}}'),
        subject: handlebars.compile(subjectSource || templateName),
      };

      // Cache compiled templates
      templateCache.set(templateName, compiled);

      log.debug('Template compiled successfully', { templateName });
      return compiled;
    } catch (error) {
      log.error('Failed to compile template', error, { templateName });
      throw new NotFoundError(`Email template not found: ${templateName}`);
    }
  }

  /**
   * Check rate limits for recipient
   */
  private static checkRateLimit(recipient: string): boolean {
    const now = Date.now();
    const hourKey = `${recipient}:${Math.floor(now / (1000 * 60 * 60))}`;
    const dayKey = `${recipient}:${Math.floor(now / (1000 * 60 * 60 * 24))}`;

    // Check hourly limit
    const hourlyTracker = rateLimitTracker.get(hourKey) || { count: 0, resetTime: now + (1000 * 60 * 60) };
    if (hourlyTracker.count >= EMAIL_CONFIG.rateLimits.perHour) {
      return false;
    }

    // Check daily limit
    const dailyTracker = rateLimitTracker.get(dayKey) || { count: 0, resetTime: now + (1000 * 60 * 60 * 24) };
    if (dailyTracker.count >= EMAIL_CONFIG.rateLimits.perDay) {
      return false;
    }

    // Update trackers
    hourlyTracker.count++;
    dailyTracker.count++;
    rateLimitTracker.set(hourKey, hourlyTracker);
    rateLimitTracker.set(dayKey, dailyTracker);

    // Clean up expired entries
    if (now > hourlyTracker.resetTime) {
      rateLimitTracker.delete(hourKey);
    }
    if (now > dailyTracker.resetTime) {
      rateLimitTracker.delete(dayKey);
    }

    return true;
  }

  /**
   * Send email with template
   */
  private static async sendTemplatedEmail(
    templateName: string,
    recipient: string,
    data: any,
    options: { priority?: 'high' | 'normal' | 'low' } = {}
  ): Promise<void> {
    // Input validation
    if (!recipient || !templateName) {
      throw new BadRequestError('Recipient and template name are required');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      throw new ValidationError('Invalid email address format');
    }

    // Rate limiting check
    if (!this.checkRateLimit(recipient)) {
      throw new BadRequestError('Email rate limit exceeded');
    }

    try {
      // Get compiled template
      const template = await this.compileTemplate(templateName);

      // Prepare template data with defaults
      const templateData = {
        ...data,
        supportEmail: EMAIL_CONFIG.defaults.replyTo || 'support@groupplanner.app',
        appName: 'Group Planner',
        companyName: 'Group Planner Team',
        year: new Date().getFullYear(),
      };

      // Render email content
      const htmlContent = template.html(templateData);
      const textContent = template.text(templateData);
      const subject = template.subject(templateData);

      // Get transporter
      const transporter = await this.getTransporter();

      // Send email
      const result = await transporter.sendMail({
        from: EMAIL_CONFIG.defaults.from,
        to: recipient,
        replyTo: EMAIL_CONFIG.defaults.replyTo,
        subject,
        html: htmlContent,
        text: textContent,
        priority: options.priority || 'normal',
        headers: EMAIL_CONFIG.features.enableTracking ? {
          'X-Email-Type': templateName,
          'X-App-Version': '1.0.0',
        } : undefined,
      });

      log.info('Email sent successfully', {
        messageId: result.messageId,
        recipient,
        template: templateName,
        subject,
        response: result.response,
      });
    } catch (error) {
      log.error('Failed to send email', error, {
        recipient,
        template: templateName,
      });
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send email verification
   */
  static async sendVerificationEmail(
    recipient: string,
    verificationToken: string,
    recipientName?: string
  ): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationLink = `${baseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    const data: VerificationEmailData = {
      recipientName: recipientName || 'User',
      verificationLink,
      verificationToken,
      expiryHours: 24,
      supportEmail: '',
      appName: '',
      companyName: '',
      year: 0,
    };

    await this.sendTemplatedEmail('verification', recipient, data, { priority: 'high' });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    recipient: string,
    resetToken: string,
    recipientName?: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const data: PasswordResetEmailData = {
      recipientName: recipientName || 'User',
      resetLink,
      resetToken,
      expiryHours: 1,
      ...(context?.ipAddress ? { ipAddress: context.ipAddress } : {}),
      ...(context?.userAgent ? { userAgent: context.userAgent } : {}),
      supportEmail: '',
      appName: '',
      companyName: '',
      year: 0,
    };

    await this.sendTemplatedEmail('password-reset', recipient, data, { priority: 'high' });
  }

  /**
   * Send trip invitation email
   */
  static async sendTripInviteEmail(data: {
    recipientEmail: string;
    recipientName: string;
    inviterName: string;
    tripName: string;
    tripDescription: string;
    tripDates: string;
    tripLocation: string;
    inviteCode: string;
  }): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${baseUrl}/trips/join/${encodeURIComponent(data.inviteCode)}`;

    const templateData: TripInviteEmailData = {
      recipientName: data.recipientName,
      inviterName: data.inviterName,
      tripName: data.tripName,
      tripDescription: data.tripDescription,
      tripDates: data.tripDates,
      tripLocation: data.tripLocation,
      inviteLink,
      inviteCode: data.inviteCode,
      supportEmail: '',
      appName: '',
      companyName: '',
      year: 0,
    };

    await this.sendTemplatedEmail('trip-invite', data.recipientEmail, templateData);
  }

  /**
   * Send event update email
   */
  static async sendEventUpdateEmail(data: {
    recipientEmail: string;
    recipientName: string;
    eventName: string;
    eventDescription: string;
    eventDate: string;
    eventTime: string;
    tripName: string;
    updateType: 'created' | 'updated' | 'cancelled' | 'approved';
    updaterName: string;
    eventId: string;
    tripId: string;
  }): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const eventLink = `${baseUrl}/trips/${data.tripId}/events/${data.eventId}`;

    const templateData: EventUpdateEmailData = {
      recipientName: data.recipientName,
      eventName: data.eventName,
      eventDescription: data.eventDescription,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      tripName: data.tripName,
      updateType: data.updateType,
      updaterName: data.updaterName,
      eventLink,
      supportEmail: '',
      appName: '',
      companyName: '',
      year: 0,
    };

    await this.sendTemplatedEmail('event-update', data.recipientEmail, templateData);
  }

  /**
   * Send item reminder email
   */
  static async sendItemReminderEmail(data: {
    recipientEmail: string;
    recipientName: string;
    itemName: string;
    itemDescription: string;
    quantity: number;
    tripName: string;
    tripDate: string;
    reminderType: 'claimed' | 'overdue' | 'reminder';
    itemId: string;
    tripId: string;
  }): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const itemLink = `${baseUrl}/trips/${data.tripId}/items/${data.itemId}`;

    const templateData: ItemReminderEmailData = {
      recipientName: data.recipientName,
      itemName: data.itemName,
      itemDescription: data.itemDescription,
      quantity: data.quantity,
      tripName: data.tripName,
      tripDate: data.tripDate,
      reminderType: data.reminderType,
      itemLink,
      supportEmail: '',
      appName: '',
      companyName: '',
      year: 0,
    };

    await this.sendTemplatedEmail('item-reminder', data.recipientEmail, templateData);
  }

  /**
   * Send digest email
   */
  static async sendDigestEmail(data: {
    recipientEmail: string;
    recipientName: string;
    digestPeriod: 'daily' | 'weekly';
    tripSummaries: Array<{
      tripName: string;
      newEvents: number;
      newItems: number;
      newMembers: number;
      tripId: string;
    }>;
    notifications: Array<{
      type: string;
      title: string;
      body: string;
      timestamp: string;
    }>;
  }): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const templateData: DigestEmailData = {
      recipientName: data.recipientName,
      digestPeriod: data.digestPeriod,
      tripSummaries: data.tripSummaries.map(trip => ({
        ...trip,
        tripLink: `${baseUrl}/trips/${trip.tripId}`,
      })),
      notifications: data.notifications,
      totalNotifications: data.notifications.length,
      supportEmail: '',
      appName: '',
      companyName: '',
      year: 0,
    };

    await this.sendTemplatedEmail('digest', data.recipientEmail, templateData);
  }

  /**
   * Test email configuration
   */
  static async testConfiguration(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
      log.info('Email configuration test passed');
      return true;
    } catch (error) {
      log.error('Email configuration test failed', error);
      return false;
    }
  }

  /**
   * Get email service status
   */
  static getStatus(): {
    configured: boolean;
    templatesCached: number;
    rateLimitEntries: number;
    config: Partial<EmailConfig>;
  } {
    return {
      configured: !!this.transporter,
      templatesCached: templateCache.size,
      rateLimitEntries: rateLimitTracker.size,
      config: {
        smtp: {
          host: EMAIL_CONFIG.smtp.host,
          port: EMAIL_CONFIG.smtp.port,
          secure: EMAIL_CONFIG.smtp.secure,
          auth: { user: EMAIL_CONFIG.smtp.auth.user, pass: '[REDACTED]' },
        },
        defaults: EMAIL_CONFIG.defaults,
        features: EMAIL_CONFIG.features,
      },
    };
  }

  /**
   * Cleanup resources
   */
  static async cleanup(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
    templateCache.clear();
    rateLimitTracker.clear();
  }
}

// Initialize email service on module load
if (process.env.NODE_ENV !== 'test') {
  EmailService.initialize().catch(error => {
    log.error('Failed to initialize email service during module load', error);
  });
}