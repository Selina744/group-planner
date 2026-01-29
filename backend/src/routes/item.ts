/**
 * Item routes for Group Planner API
 *
 * This module provides complete item coordination routes using the
 * item controller and proper middleware for authentication, authorization, and validation.
 */

import express from 'express';
import { ItemController } from '../controllers/item.js';
import { wrapAsync } from '../utils/wrapAsync.js';
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
 * Item validation schemas
 */
const createItemSchema = z.object({
  tripId: z.string().uuid('Trip ID must be a valid UUID'),
  name: z.string()
    .min(1, 'Item name is required')
    .max(200, 'Item name must be less than 200 characters')
    .transform(s => s.trim()),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .transform(s => s.trim())
    .optional(),
  category: z.enum(['FOOD', 'EQUIPMENT', 'SUPPLIES', 'CLOTHING', 'ELECTRONICS', 'TRANSPORTATION', 'ENTERTAINMENT', 'SAFETY', 'OTHER']).optional(),
  type: z.enum(['RECOMMENDED', 'SHARED'], {
    required_error: 'Item type is required',
    invalid_type_error: 'Item type must be RECOMMENDED or SHARED'
  }),
  quantityNeeded: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000')
    .default(1),
  isEssential: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
}).strict();

const updateItemSchema = z.object({
  name: z.string()
    .min(1, 'Item name cannot be empty')
    .max(200, 'Item name must be less than 200 characters')
    .transform(s => s.trim())
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .transform(s => s.trim())
    .optional(),
  category: z.enum(['FOOD', 'EQUIPMENT', 'SUPPLIES', 'CLOTHING', 'ELECTRONICS', 'TRANSPORTATION', 'ENTERTAINMENT', 'SAFETY', 'OTHER']).optional(),
  type: z.enum(['RECOMMENDED', 'SHARED']).optional(),
  quantityNeeded: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000')
    .optional(),
  isEssential: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict();

const claimItemSchema = z.object({
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000')
    .default(1),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .transform(s => s.trim())
    .optional(),
}).strict();

const updateClaimSchema = z.object({
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000')
    .optional(),
  status: z.enum(['CLAIMED', 'BROUGHT', 'CANCELLED'], {
    invalid_type_error: 'Status must be CLAIMED, BROUGHT, or CANCELLED'
  }).optional(),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .transform(s => s.trim())
    .optional(),
}).strict();

const itemListQuerySchema = z.object({
  tripId: z.string().uuid('Trip ID must be a valid UUID'),
  page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional(),
  sortBy: z.enum(['name', 'type', 'quantityNeeded', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  type: z.union([
    z.enum(['RECOMMENDED', 'SHARED']),
    z.array(z.enum(['RECOMMENDED', 'SHARED']))
  ]).optional(),
  category: z.union([
    z.enum(['FOOD', 'EQUIPMENT', 'SUPPLIES', 'CLOTHING', 'ELECTRONICS', 'TRANSPORTATION', 'ENTERTAINMENT', 'SAFETY', 'OTHER']),
    z.array(z.enum(['FOOD', 'EQUIPMENT', 'SUPPLIES', 'CLOTHING', 'ELECTRONICS', 'TRANSPORTATION', 'ENTERTAINMENT', 'SAFETY', 'OTHER']))
  ]).optional(),
  isEssential: z.union([
    z.string().transform(s => s.toLowerCase() === 'true'),
    z.boolean()
  ]).optional(),
  createdBy: z.string().uuid('Created by must be a valid UUID').optional(),
  claimedBy: z.string().uuid('Claimed by must be a valid UUID').optional(),
  unclaimedOnly: z.union([
    z.string().transform(s => s.toLowerCase() === 'true'),
    z.boolean()
  ]).optional(),
  search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
}).strict();

/**
 * POST /items - Create a new item
 * Authentication: Required
 * Authorization: Must be confirmed trip member
 * SHARED items: Only HOST/CO_HOST can create
 */
router.post(
  '/',
  ...(middlewarePresets.protected as any),
  validateRequest({ body: createItemSchema }) as any,
  wrapAsync<AuthenticatedRequest>(ItemController.createItem) as any
);

/**
 * GET /items - List items for a trip
 * Authentication: Required
 * Authorization: Must be confirmed trip member
 * Query: tripId is required
 */
router.get(
  '/',
  ...(middlewarePresets.protected as any),
  validateRequest({ query: itemListQuerySchema }) as any,
  wrapAsync<AuthenticatedRequest>(ItemController.listItems) as any
);

/**
 * GET /items/:id - Get item by ID
 * Authentication: Required
 * Authorization: Must be confirmed trip member
 */
router.get(
  '/:id',
  ...(middlewarePresets.protected as any),
  validation.common.uuidParam('id'),
  wrapAsync<AuthenticatedRequest>(ItemController.getItemById) as any
);

/**
 * PUT /items/:id - Update item
 * Authentication: Required
 * Authorization: Item creator or HOST/CO_HOST can update
 */
router.put(
  '/:id',
  ...(middlewarePresets.protected as any),
  validation.common.uuidParam('id'),
  validateRequest({ body: updateItemSchema }) as any,
  wrapAsync<AuthenticatedRequest>(ItemController.updateItem) as any
);

/**
 * DELETE /items/:id - Delete item
 * Authentication: Required
 * Authorization: Item creator or HOST can delete
 */
router.delete(
  '/:id',
  ...(middlewarePresets.protected as any),
  validation.common.uuidParam('id'),
  wrapAsync<AuthenticatedRequest>(ItemController.deleteItem) as any
);

/**
 * POST /items/:id/claim - Claim an item
 * Authentication: Required
 * Authorization: Must be confirmed trip member
 * Cannot claim own items
 */
router.post(
  '/:id/claim',
  ...(middlewarePresets.protected as any),
  validation.common.uuidParam('id'),
  validateRequest({ body: claimItemSchema }) as any,
  wrapAsync<AuthenticatedRequest>(ItemController.claimItem) as any
);

/**
 * PUT /claims/:id - Update item claim
 * Authentication: Required
 * Authorization: Claim owner or HOST/CO_HOST can update
 */
router.put(
  '/claims/:id',
  ...(middlewarePresets.protected as any),
  validation.common.uuidParam('id'),
  validateRequest({ body: updateClaimSchema }) as any,
  wrapAsync<AuthenticatedRequest>(ItemController.updateClaim) as any
);

/**
 * DELETE /claims/:id - Cancel item claim
 * Authentication: Required
 * Authorization: Claim owner or HOST can cancel
 */
router.delete(
  '/claims/:id',
  ...(middlewarePresets.protected as any),
  validation.common.uuidParam('id'),
  wrapAsync<AuthenticatedRequest>(ItemController.cancelClaim) as any
);

/**
 * GET /trips/:tripId/items/stats - Get trip item statistics
 * Authentication: Required
 * Authorization: Must be confirmed trip member
 */
router.get(
  '/trips/:tripId/items/stats',
  ...(middlewarePresets.protected as any),
  validation.common.uuidParam('tripId'),
  wrapAsync<AuthenticatedRequest>(ItemController.getTripItemStats) as any
);

export default router;