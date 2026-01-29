/**
 * Enhanced validation middleware for Group Planner API
 *
 * Provides comprehensive request validation with schema validation,
 * file upload handling, sanitization, and validation metrics.
 */

import type { Request, Response, NextFunction } from 'express';
import { z, type ZodTypeAny, type ZodError } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { log } from '../utils/logger.js';
import type { AuthenticatedRequest } from '../types/middleware.js';
import { ValidationError } from '../utils/errors.js';
import { formatZodErrors, createValidationError } from '../utils/apiResponse.js';
import { MemberRole } from '../generated/prisma/index.js';

/**
 * Validation configuration interface
 */
export interface ValidationConfig {
  enableSanitization: boolean;
  enableMetrics: boolean;
  enableCaching: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  uploadDirectory: string;
  validationTimeout: number;
}

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enableSanitization: true,
  enableMetrics: true,
  enableCaching: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.docx'],
  uploadDirectory: './uploads',
  validationTimeout: 5000, // 5 seconds
};

/**
 * Validation metrics tracking
 */
export class ValidationMetrics {
  private static metrics = {
    validationAttempts: 0,
    validationFailures: 0,
    sanitizationOperations: 0,
    fileUploadAttempts: 0,
    fileUploadFailures: 0,
    schemaValidations: 0,
  };

  static increment(metric: keyof typeof this.metrics): void {
    this.metrics[metric]++;
  }

  static getMetrics() {
    return { ...this.metrics };
  }

  static reset(): void {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key as keyof typeof this.metrics] = 0;
    });
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // User identification
  userId: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  username: z.string().min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),

  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),

  // Date validation
  dateString: z.string().datetime('Invalid date format'),
  timezone: z.string().max(50, 'Timezone identifier too long'),

  // Pagination
  page: z.coerce.number().int().min(1, 'Page must be a positive integer').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be positive').max(100, 'Limit too large').default(20),
  offset: z.coerce.number().int().min(0, 'Offset must be non-negative').default(0),

  // Search and filtering
  searchQuery: z.string().max(255, 'Search query too long').optional(),
  sortBy: z.string().max(50, 'Sort field name too long').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),

  // File metadata
  fileName: z.string().max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'File name contains invalid characters'),
  fileSize: z.number().int().positive('File size must be positive'),
  mimeType: z.string().max(100, 'MIME type too long'),

  // Generic validation
  uuid: z.string().uuid('Invalid UUID format'),
  slug: z.string().max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  url: z.string().url('Invalid URL format').max(2048, 'URL too long'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (expected #RRGGBB)'),

  // Text content
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  content: z.string().max(50000, 'Content too long').optional(),

  // Coordinates
  latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
  longitude: z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
};

const locationSchema = z.object({
  name: z.string().min(3, 'Location name must be at least 3 characters').max(200, 'Location name too long'),
  address: z.string().max(255, 'Address too long').optional(),
  latitude: commonSchemas.latitude,
  longitude: commonSchemas.longitude,
});

const tripDateRangeSchema = z
  .object({
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
  })
  .refine((value) => new Date(value.endDate) > new Date(value.startDate), {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });

/**
 * Enhanced file upload configuration
 */
export function createFileUploadConfig(config: Partial<ValidationConfig> = {}) {
  const finalConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await fs.mkdir(finalConfig.uploadDirectory, { recursive: true });
        cb(null, finalConfig.uploadDirectory);
      } catch (error) {
        cb(error as Error, finalConfig.uploadDirectory);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    },
  });

  const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (finalConfig.allowedFileTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      ValidationMetrics.increment('fileUploadFailures');
      cb(new Error(`File type ${fileExtension} is not allowed`));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: finalConfig.maxFileSize,
      files: 5, // Maximum 5 files per request
      fields: 10, // Maximum 10 form fields
    },
  });
}

/**
 * Enhanced request validation with metrics and sanitization
 */
export function validateRequest(schemas: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
  files?: {
    fieldName: string;
    maxCount: number;
    required?: boolean;
  }[];
  custom?: (req: AuthenticatedRequest) => Promise<string[] | null> | string[] | null;
}, config: Partial<ValidationConfig> = {}) {
  const finalConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    ValidationMetrics.increment('validationAttempts');

    const validationStart = Date.now();
    const errors: Array<ReturnType<typeof createValidationError>> = [];

    try {
      // Timeout for validation
      const validationPromise = Promise.race([
        performValidation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Validation timeout')), finalConfig.validationTimeout)
        ),
      ]);

      await validationPromise;

      async function performValidation() {
        // Validate request body
        if (schemas.body && req.body) {
          ValidationMetrics.increment('schemaValidations');

          if (finalConfig.enableSanitization) {
            req.body = sanitizeObject(req.body);
            ValidationMetrics.increment('sanitizationOperations');
          }

          const bodyResult = schemas.body.safeParse(req.body);
          if (!bodyResult.success) {
            errors.push(...formatZodErrors(bodyResult.error));
          } else {
            req.body = bodyResult.data;
          }
        }

        // Validate query parameters
        if (schemas.query) {
          ValidationMetrics.increment('schemaValidations');

          if (finalConfig.enableSanitization) {
            req.query = sanitizeObject(req.query);
            ValidationMetrics.increment('sanitizationOperations');
          }

          const queryResult = schemas.query.safeParse(req.query);
          if (!queryResult.success) {
            errors.push(...formatZodErrors(queryResult.error));
          } else {
            req.query = queryResult.data;
          }
        }

        // Validate route parameters
        if (schemas.params) {
          ValidationMetrics.increment('schemaValidations');

          const paramsResult = schemas.params.safeParse(req.params);
          if (!paramsResult.success) {
            errors.push(...formatZodErrors(paramsResult.error));
          } else {
            req.params = paramsResult.data;
          }
        }

        // Validate file uploads
        if (schemas.files && req.files) {
          ValidationMetrics.increment('fileUploadAttempts');

          const fileErrors = validateFileUploads(req, schemas.files);
          errors.push(...fileErrors);
        }

        // Custom validation
        if (schemas.custom) {
          const customErrors = await Promise.resolve(schemas.custom(req));
          if (Array.isArray(customErrors)) {
            customErrors.forEach((error, index) => {
              errors.push(createValidationError(`custom.${index}`, error, 'custom_validation', undefined));
            });
          }
        }
      }

      // Handle validation results
      if (errors.length > 0) {
        ValidationMetrics.increment('validationFailures');

        const validationTime = Date.now() - validationStart;

        log.warn('Request validation failed', {
          requestId: req.requestId,
          userId: req.user?.id,
          method: req.method,
          path: req.path,
          errors: errors.length,
          validationTime,
          errorDetails: errors.slice(0, 5), // Limit logged errors
        });

        return next(new ValidationError('Request validation failed', { errors }));
      }

      const validationTime = Date.now() - validationStart;

      if (validationTime > 1000) { // Log slow validations
        log.warn('Slow validation detected', {
          requestId: req.requestId,
          validationTime,
          path: req.path,
        });
      }

      next();
    } catch (error) {
      ValidationMetrics.increment('validationFailures');

      log.error('Validation middleware error', error, {
        requestId: req.requestId,
        path: req.path,
      });

      if (error instanceof z.ZodError) {
        return next(new ValidationError('Request validation failed', {
          errors: formatZodErrors(error),
        }));
      }

      next(error);
    }
  };
}

/**
 * Validate file uploads based on configuration
 */
function validateFileUploads(
  req: Request,
  fileConfigs: Array<{ fieldName: string; maxCount: number; required?: boolean }>
): Array<ReturnType<typeof createValidationError>> {
  const errors: Array<ReturnType<typeof createValidationError>> = [];
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  if (!files) {
    // Check if any files are required
    const requiredFiles = fileConfigs.filter(config => config.required);
    if (requiredFiles.length > 0) {
      requiredFiles.forEach(config => {
        errors.push(createValidationError(
          config.fieldName,
          `File upload is required for field ${config.fieldName}`,
          'required',
          undefined
        ));
      });
    }
    return errors;
  }

  fileConfigs.forEach(config => {
    const uploadedFiles = files[config.fieldName] || [];

    // Check required files
    if (config.required && uploadedFiles.length === 0) {
      errors.push(createValidationError(
        config.fieldName,
        `File upload is required for field ${config.fieldName}`,
        'required',
        undefined
      ));
    }

    // Check max count
    if (uploadedFiles.length > config.maxCount) {
      errors.push(createValidationError(
        config.fieldName,
        `Too many files for field ${config.fieldName}. Maximum ${config.maxCount} allowed.`,
        'max_count_exceeded',
        uploadedFiles.length
      ));
    }

    // Validate individual files
    uploadedFiles.forEach((file, index) => {
      const fileErrors = validateSingleFile(file, `${config.fieldName}[${index}]`);
      errors.push(...fileErrors);
    });
  });

  return errors;
}

/**
 * Validate a single uploaded file
 */
function validateSingleFile(
  file: Express.Multer.File,
  fieldPath: string
): Array<ReturnType<typeof createValidationError>> {
  const errors: Array<ReturnType<typeof createValidationError>> = [];

  // Check file size
  if (file.size === 0) {
    errors.push(createValidationError(
      fieldPath,
      'File is empty',
      'file_empty',
      file.size
    ));
  }

  // Check MIME type matches extension
  const expectedMimeTypes = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.pdf': ['application/pdf'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  };

  const extension = path.extname(file.originalname).toLowerCase();
  const expectedTypes = expectedMimeTypes[extension as keyof typeof expectedMimeTypes];

  if (expectedTypes && !expectedTypes.includes(file.mimetype)) {
    errors.push(createValidationError(
      fieldPath,
      `File MIME type ${file.mimetype} doesn't match extension ${extension}`,
      'mime_type_mismatch',
      file.mimetype
    ));
  }

  return errors;
}

/**
 * Sanitize object to remove potentially harmful content
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize string content
 */
function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .trim();
}

/**
 * Create validation middleware for specific schemas
 */
export const validation: any = {
  // User-related validation
  userRegistration: () => validateRequest({
    body: z.object({
      email: commonSchemas.email,
      username: commonSchemas.username,
      password: commonSchemas.password,
      displayName: z.string().min(1).max(100),
      timezone: commonSchemas.timezone.optional(),
    }),
  }),

  userLogin: () => validateRequest({
    body: z.object({
      email: commonSchemas.email,
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  passwordChange: () => validateRequest({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: commonSchemas.password,
    }),
  }),

  // Generic validation
  uuidParam: (paramName: string = 'id') => validateRequest({
    params: z.object({
      [paramName]: commonSchemas.uuid,
    }),
  }),

  pagination: () => validateRequest({
    query: z.object({
      page: commonSchemas.page,
      limit: commonSchemas.limit,
      search: commonSchemas.searchQuery,
    }),
  }),

  locationPayload: () => validateRequest({
    body: locationSchema,
  }),

  createTripSchema: () => validateRequest({
    body: z
      .object({
        title: commonSchemas.title,
        description: commonSchemas.description.optional(),
        location: locationSchema.optional(),
        isPublic: z.boolean().optional(),
        inviteCode: z.string().max(32, 'Invite code too long').optional(),
      })
      .and(tripDateRangeSchema),
  }),

  updateTripSchema: () => validateRequest({
    body: z
      .object({
        title: commonSchemas.title.optional(),
        description: commonSchemas.description.optional(),
        location: locationSchema.optional(),
        startDate: commonSchemas.dateString.optional(),
        endDate: commonSchemas.dateString.optional(),
        isPublic: z.boolean().optional(),
      })
      .refine(
        (value) => {
          if (value.startDate && value.endDate) {
            return new Date(value.endDate) > new Date(value.startDate);
          }
          return true;
        },
        { message: 'endDate must be after startDate', path: ['endDate'] }
      ),
  }),

  joinTripSchema: () => validateRequest({
    body: z
      .object({
        tripId: commonSchemas.uuid.optional(),
        inviteCode: z.string().min(6, 'Invite code too short').max(64, 'Invite code too long').optional(),
      })
      .refine(
        (value) => Boolean(value.tripId || value.inviteCode),
        { message: 'tripId or inviteCode is required', path: ['tripId', 'inviteCode'] }
      ),
  }),

  updateMemberRoleSchema: () => validateRequest({
    body: z.object({
      role: z.nativeEnum(MemberRole),
    }),
  }),

  // File upload validation
  profilePicture: () => [
    createFileUploadConfig({
      allowedFileTypes: ['.jpg', '.jpeg', '.png'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
    }).single('profilePicture'),
    validateRequest({
      files: [{
        fieldName: 'profilePicture',
        maxCount: 1,
        required: true,
      }],
    }),
  ],

  documentUpload: () => [
    createFileUploadConfig({
      allowedFileTypes: ['.pdf', '.docx', '.jpg', '.jpeg', '.png'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    }).array('documents', 5),
    validateRequest({
      files: [{
        fieldName: 'documents',
        maxCount: 5,
        required: false,
      }],
    }),
  ],
};
