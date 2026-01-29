/**
 * Item controller for Group Planner API
 *
 * This controller provides complete item coordination endpoints with proper
 * role-based access control, claim management, and quantity tracking.
 */

import type { Response } from 'express';
import { ItemService } from '../services/item.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { log } from '../utils/logger.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';
import type { AuthenticatedRequest } from '../types/middleware.js';
import type {
  CreateItemRequest,
  UpdateItemRequest,
  ClaimItemRequest,
  UpdateClaimRequest,
  ItemListQuery,
  ItemType,
  ItemCategory,
  ClaimStatus,
} from '../types/item.js';

/**
 * Item controller class
 */
export class ItemController {
  /**
   * POST /items - Create a new item
   */
  static async createItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const itemData: CreateItemRequest = req.body;

    // Input validation
    if (!itemData.tripId || typeof itemData.tripId !== 'string') {
      throw new BadRequestError('Trip ID is required and must be a string');
    }

    if (!itemData.name || typeof itemData.name !== 'string') {
      throw new BadRequestError('Item name is required and must be a string');
    }

    if (!itemData.type || !['RECOMMENDED', 'SHARED'].includes(itemData.type)) {
      throw new BadRequestError('Item type must be RECOMMENDED or SHARED');
    }

    try {
      const result = await ItemService.createItem(user, itemData);

      log.info('Item created via API', {
        itemId: result.item.id,
        tripId: itemData.tripId,
        userId: user.id,
        type: itemData.type,
        name: result.item.name,
        requestId: req.requestId,
      });

      ApiResponse.created(res, 'Item created successfully', result);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to create item via API', error, {
        userId: user.id,
        itemData,
        requestId: req.requestId,
      });

      throw new Error('Failed to create item');
    }
  }

  /**
   * GET /items - List items with filtering and pagination
   */
  static async listItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    try {
      // Extract query parameters
      const {
        tripId,
        page,
        limit,
        sortBy,
        sortOrder,
        type,
        category,
        isEssential,
        createdBy,
        claimedBy,
        unclaimedOnly,
        search,
      } = req.query;

      // Trip ID is required for listing items
      if (!tripId || typeof tripId !== 'string') {
        throw new BadRequestError('Trip ID is required');
      }

      // Build query object with proper type casting
      const query: ItemListQuery = { tripId };

      if (page && typeof page === 'string') {
        const pageNum = parseInt(page, 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          query.page = pageNum;
        }
      }

      if (limit && typeof limit === 'string') {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          query.limit = limitNum;
        }
      }

      if (sortBy && typeof sortBy === 'string') {
        const validSortFields = ['name', 'type', 'quantityNeeded', 'createdAt', 'updatedAt'];
        if (validSortFields.includes(sortBy)) {
          query.sortBy = sortBy as any;
        }
      }

      if (sortOrder && typeof sortOrder === 'string') {
        if (sortOrder === 'asc' || sortOrder === 'desc') {
          query.sortOrder = sortOrder;
        }
      }

      // Handle array parameters for type and category
      if (type) {
        const typeArray = Array.isArray(type) ? type : [type];
        const validTypes = ['RECOMMENDED', 'SHARED'];
        const filteredTypes = typeArray
          .map(t => String(t))
          .filter(t => validTypes.includes(t)) as ItemType[];

        if (filteredTypes.length > 0) {
          query.type = filteredTypes;
        }
      }

      if (category) {
        const categoryArray = Array.isArray(category) ? category : [category];
        const validCategories = ['FOOD', 'EQUIPMENT', 'SUPPLIES', 'CLOTHING', 'ELECTRONICS', 'TRANSPORTATION', 'ENTERTAINMENT', 'SAFETY', 'OTHER'];
        const filteredCategories = categoryArray
          .map(c => String(c))
          .filter(c => validCategories.includes(c)) as ItemCategory[];

        if (filteredCategories.length > 0) {
          query.category = filteredCategories;
        }
      }

      // Handle boolean parameters
      if (isEssential !== undefined) {
        if (typeof isEssential === 'string') {
          query.isEssential = isEssential.toLowerCase() === 'true';
        } else if (typeof isEssential === 'boolean') {
          query.isEssential = isEssential;
        }
      }

      if (unclaimedOnly !== undefined) {
        if (typeof unclaimedOnly === 'string') {
          query.unclaimedOnly = unclaimedOnly.toLowerCase() === 'true';
        } else if (typeof unclaimedOnly === 'boolean') {
          query.unclaimedOnly = unclaimedOnly;
        }
      }

      // Handle string parameters
      if (createdBy && typeof createdBy === 'string') {
        query.createdBy = createdBy;
      }

      if (claimedBy && typeof claimedBy === 'string') {
        query.claimedBy = claimedBy;
      }

      if (search && typeof search === 'string') {
        query.search = search;
      }

      const result = await ItemService.listTripItems(user, query);

      log.debug('Items listed via API', {
        tripId,
        userId: user.id,
        totalItems: result.pagination.total,
        filters: query,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Items retrieved successfully', result);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to list items via API', error, {
        userId: user.id,
        query: req.query,
        requestId: req.requestId,
      });

      throw new Error('Failed to retrieve items');
    }
  }

  /**
   * GET /items/:id - Get item by ID
   */
  static async getItemById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: itemId } = req.params;
    if (!itemId) {
      throw new BadRequestError('Item ID is required');
    }

    try {
      const item = await ItemService.getItemById(itemId, user);

      log.debug('Item retrieved via API', {
        itemId,
        tripId: item.tripId,
        userId: user.id,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Item retrieved successfully', item);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to get item via API', error, {
        itemId,
        userId: user.id,
        requestId: req.requestId,
      });

      throw new Error('Failed to retrieve item');
    }
  }

  /**
   * PUT /items/:id - Update item
   */
  static async updateItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: itemId } = req.params;
    if (!itemId) {
      throw new BadRequestError('Item ID is required');
    }

    const updateData: UpdateItemRequest = req.body;

    try {
      const updatedItem = await ItemService.updateItem(itemId, user, updateData);

      log.info('Item updated via API', {
        itemId,
        tripId: updatedItem.tripId,
        userId: user.id,
        updatedFields: Object.keys(updateData),
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Item updated successfully', updatedItem);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to update item via API', error, {
        itemId,
        userId: user.id,
        updateData,
        requestId: req.requestId,
      });

      throw new Error('Failed to update item');
    }
  }

  /**
   * DELETE /items/:id - Delete item
   */
  static async deleteItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: itemId } = req.params;
    if (!itemId) {
      throw new BadRequestError('Item ID is required');
    }

    try {
      await ItemService.deleteItem(itemId, user);

      log.info('Item deleted via API', {
        itemId,
        userId: user.id,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Item deleted successfully');
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to delete item via API', error, {
        itemId,
        userId: user.id,
        requestId: req.requestId,
      });

      throw new Error('Failed to delete item');
    }
  }

  /**
   * POST /items/:id/claim - Claim an item
   */
  static async claimItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: itemId } = req.params;
    if (!itemId) {
      throw new BadRequestError('Item ID is required');
    }

    const claimData: ClaimItemRequest = req.body;

    try {
      const result = await ItemService.claimItem(itemId, user, claimData);

      log.info('Item claimed via API', {
        itemId,
        claimId: result.claim.id,
        userId: user.id,
        quantity: result.claim.quantity,
        requestId: req.requestId,
      });

      ApiResponse.created(res, 'Item claimed successfully', result);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError ||
          error instanceof ConflictError) {
        throw error;
      }

      log.error('Failed to claim item via API', error, {
        itemId,
        userId: user.id,
        claimData,
        requestId: req.requestId,
      });

      throw new Error('Failed to claim item');
    }
  }

  /**
   * PUT /claims/:id - Update item claim
   */
  static async updateClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: claimId } = req.params;
    if (!claimId) {
      throw new BadRequestError('Claim ID is required');
    }

    const updateData: UpdateClaimRequest = req.body;

    // Validate status if provided
    if (updateData.status && !['CLAIMED', 'BROUGHT', 'CANCELLED'].includes(updateData.status)) {
      throw new BadRequestError('Invalid claim status');
    }

    try {
      const updatedClaim = await ItemService.updateClaim(claimId, user, updateData);

      log.info('Item claim updated via API', {
        claimId,
        itemId: updatedClaim.itemId,
        userId: user.id,
        updatedFields: Object.keys(updateData),
        newStatus: updateData.status,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Claim updated successfully', updatedClaim);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to update claim via API', error, {
        claimId,
        userId: user.id,
        updateData,
        requestId: req.requestId,
      });

      throw new Error('Failed to update claim');
    }
  }

  /**
   * DELETE /claims/:id - Cancel item claim
   */
  static async cancelClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { id: claimId } = req.params;
    if (!claimId) {
      throw new BadRequestError('Claim ID is required');
    }

    try {
      await ItemService.cancelClaim(claimId, user);

      log.info('Item claim cancelled via API', {
        claimId,
        userId: user.id,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Claim cancelled successfully');
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to cancel claim via API', error, {
        claimId,
        userId: user.id,
        requestId: req.requestId,
      });

      throw new Error('Failed to cancel claim');
    }
  }

  /**
   * GET /trips/:tripId/items/stats - Get trip item statistics
   */
  static async getTripItemStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestError('Authentication required');
    }

    const { tripId } = req.params;
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    try {
      const stats = await ItemService.getTripItemStats(tripId, user);

      log.debug('Trip item stats retrieved via API', {
        tripId,
        userId: user.id,
        stats,
        requestId: req.requestId,
      });

      ApiResponse.success(res, 'Trip item statistics retrieved successfully', stats);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to get trip item stats via API', error, {
        tripId,
        userId: user.id,
        requestId: req.requestId,
      });

      throw new Error('Failed to retrieve item statistics');
    }
  }
}

// Export the controller
export default ItemController;