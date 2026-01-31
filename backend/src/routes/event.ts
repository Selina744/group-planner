/**
 * Event routes for Group Planner API
 *
 * This module provides complete event management routes using the
 * event controller and proper middleware for authentication, authorization, and validation.
 */

import express from 'express';
import { EventController } from '../controllers/event.js';
import { wrapAsync, wrapAsyncMiddleware } from '../utils/wrapAsync.js';
import {
  middlewarePresets,
  requireMember,
  requireHostOrCoHost,
  validation,
  type AuthenticatedRequest,
} from '../middleware/index.js';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate.js';

const router: express.Router = express.Router();

/**
 * Event validation schemas
 */
const eventLocationSchema = z.object({
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  placeId: z.string().max(200).optional(),
  venue: z.string().max(200).optional(),
}).strict().optional();

const createEventSchema = z.object({
  tripId: z.string().uuid('Trip ID must be a valid UUID'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .transform(s => s.trim()),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .transform(s => s.trim())
    .optional(),
  location: eventLocationSchema,
  startTime: z.string()
    .datetime('Start time must be a valid ISO datetime')
    .optional(),
  endTime: z.string()
    .datetime('End time must be a valid ISO datetime')
    .optional(),
  isAllDay: z.boolean().default(false),
  category: z.enum(['ACCOMMODATION', 'TRANSPORTATION', 'ACTIVITY', 'DINING', 'MEETING', 'OTHER']).optional(),
  estimatedCost: z.number()
    .min(0, 'Estimated cost must be positive')
    .max(1000000, 'Estimated cost is too large')
    .optional(),
  currency: z.string()
    .length(3, 'Currency must be a valid 3-letter code')
    .transform(s => s.toUpperCase())
    .default('USD'),
  metadata: z.record(z.unknown()).default({}),
}).strict().refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime']
  }
);

const updateEventSchema = z.object({
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be less than 200 characters')
    .transform(s => s.trim())
    .optional(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .transform(s => s.trim())
    .optional(),
  location: eventLocationSchema,
  startTime: z.string()
    .datetime('Start time must be a valid ISO datetime')
    .optional(),
  endTime: z.string()
    .datetime('End time must be a valid ISO datetime')
    .optional(),
  isAllDay: z.boolean().optional(),
  category: z.enum(['ACCOMMODATION', 'TRANSPORTATION', 'ACTIVITY', 'DINING', 'MEETING', 'OTHER']).optional(),
  estimatedCost: z.number()
    .min(0, 'Estimated cost must be positive')
    .max(1000000, 'Estimated cost is too large')
    .optional(),
  currency: z.string()
    .length(3, 'Currency must be a valid 3-letter code')
    .transform(s => s.toUpperCase())
    .optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict().refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime']
  }
);

const approvalSchema = z.object({
  status: z.enum(['APPROVED', 'CANCELLED'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be APPROVED or CANCELLED'
  }),
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .optional(),
}).strict();

const eventListQuerySchema = z.object({
  tripId: z.string().uuid('Trip ID must be a valid UUID'),
  page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional(),
  sortBy: z.enum(['title', 'startTime', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.union([
    z.enum(['PROPOSED', 'APPROVED', 'CANCELLED']),
    z.array(z.enum(['PROPOSED', 'APPROVED', 'CANCELLED']))
  ]).optional(),
  category: z.union([
    z.enum(['ACCOMMODATION', 'TRANSPORTATION', 'ACTIVITY', 'DINING', 'MEETING', 'OTHER']),
    z.array(z.enum(['ACCOMMODATION', 'TRANSPORTATION', 'ACTIVITY', 'DINING', 'MEETING', 'OTHER']))
  ]).optional(),
  startTimeAfter: z.string().datetime('Start time after must be a valid ISO datetime').optional(),
  startTimeBefore: z.string().datetime('Start time before must be a valid ISO datetime').optional(),
  suggestedBy: z.string().uuid('Suggested by must be a valid UUID').optional(),
  search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
}).strict();

/**
 * POST /events - Create a new event
 * Authentication: Required
 * Authorization: Must be confirmed trip member
 */
router.post(
  '/',
  ...(middlewarePresets.protected as any),
  validateRequest({ body: createEventSchema }) as any,
  wrapAsync<AuthenticatedRequest>(EventController.createEvent) as any
);

/**
 * GET /events - List events for a trip
 * Authentication: Required
 * Authorization: Must be confirmed trip member
 * Query: tripId is required
 */
router.get(
  '/',
  ...(middlewarePresets.protected as any),
  validateRequest({ query: eventListQuerySchema }) as any,
  wrapAsync<AuthenticatedRequest>(EventController.listEvents) as any
);

/**
 * GET /events/:id - Get event by ID
 * Authentication: Required
 * Authorization: Must be confirmed trip member
 */
router.get(
  '/:id',
  ...(middlewarePresets.protected as any),
  wrapAsyncMiddleware(validation.common.uuidParam('id')),
  wrapAsync<AuthenticatedRequest>(EventController.getEventById) as any
);

/**
 * PUT /events/:id - Update event
 * Authentication: Required
 * Authorization: Event creator or HOST/CO_HOST can update
 */
router.put(
  '/:id',
  ...(middlewarePresets.protected as any),
  wrapAsyncMiddleware(validation.common.uuidParam('id')),
  validateRequest({ body: updateEventSchema }) as any,
  wrapAsync<AuthenticatedRequest>(EventController.updateEvent) as any
);

/**
 * PUT /events/:id/approve - Approve or cancel event
 * Authentication: Required
 * Authorization: Must be HOST or CO_HOST
 */
router.put(
  '/:id/approve',
  ...(middlewarePresets.protected as any),
  wrapAsyncMiddleware(validation.common.uuidParam('id')),
  validateRequest({ body: approvalSchema }) as any,
  wrapAsync<AuthenticatedRequest>(EventController.updateEventStatus) as any
);

/**
 * DELETE /events/:id - Delete event
 * Authentication: Required
 * Authorization: Event creator or HOST can delete
 */
router.delete(
  '/:id',
  ...(middlewarePresets.protected as any),
  wrapAsyncMiddleware(validation.common.uuidParam('id')),
  wrapAsync<AuthenticatedRequest>(EventController.deleteEvent) as any
);

export default router;