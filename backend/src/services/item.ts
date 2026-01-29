/**
 * Item service for Group Planner API
 *
 * This service provides complete item coordination functionality including
 * CRUD operations for items and claims, quantity tracking, and role-based access control.
 */

import { prisma, safePrismaOperation } from '../lib/prisma.js';
import { log } from '../utils/logger.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../utils/errors.js';
import type {
  Item,
  ItemSummary,
  ItemClaim,
  CreateItemRequest,
  UpdateItemRequest,
  ClaimItemRequest,
  UpdateClaimRequest,
  ItemListQuery,
  ItemListResponse,
  CreateItemResponse,
  CreateClaimResponse,
  ItemType,
  ClaimStatus,
  ItemCategory,
  DatabaseItem,
  DatabaseItemWithRelations,
  DatabaseItemClaim,
  DatabaseItemClaimWithRelations,
  TripItemStats,
  UserClaimStats,
} from '../types/item.js';
import type { UserProfile } from '../types/auth.js';
import type { MemberRole } from '../types/trip.js';

/**
 * Item transforms for converting database objects to API responses
 */
class ItemTransforms {
  /**
   * Convert database item to API response
   */
  static toItem(dbItem: DatabaseItemWithRelations): Item {
    const claims = dbItem.claims?.map(claim => this.toItemClaim(claim as DatabaseItemClaimWithRelations)) || [];
    const quantityClaimed = claims
      .filter(claim => claim.status !== 'CANCELLED')
      .reduce((sum, claim) => sum + claim.quantity, 0);
    const quantityRemaining = Math.max(0, dbItem.quantityNeeded - quantityClaimed);
    const fullyFulfilled = quantityRemaining === 0;

    return {
      id: dbItem.id,
      tripId: dbItem.tripId,
      name: dbItem.name,
      ...(dbItem.description && { description: dbItem.description }),
      ...(dbItem.category && { category: dbItem.category as ItemCategory }),
      type: dbItem.type,
      quantityNeeded: dbItem.quantityNeeded,
      isEssential: dbItem.isEssential,
      metadata: dbItem.metadata as Record<string, unknown>,
      createdAt: dbItem.createdAt.toISOString(),
      updatedAt: dbItem.updatedAt.toISOString(),
      createdBy: {
        id: dbItem.createdBy!.id,
        email: dbItem.createdBy!.email,
        ...(dbItem.createdBy?.username && { username: dbItem.createdBy.username }),
        ...(dbItem.createdBy?.displayName && { displayName: dbItem.createdBy.displayName }),
      },
      claims,
      quantityClaimed,
      quantityRemaining,
      fullyFulfilled,
    };
  }

  /**
   * Convert database item to summary response (for lists)
   */
  static toItemSummary(dbItem: DatabaseItemWithRelations): ItemSummary {
    const claims = dbItem.claims || [];
    const quantityClaimed = claims
      .filter(claim => claim.status !== 'CANCELLED')
      .reduce((sum, claim) => sum + claim.quantity, 0);
    const quantityRemaining = Math.max(0, dbItem.quantityNeeded - quantityClaimed);
    const fullyFulfilled = quantityRemaining === 0;

    return {
      id: dbItem.id,
      tripId: dbItem.tripId,
      name: dbItem.name,
      ...(dbItem.description && { description: dbItem.description }),
      ...(dbItem.category && { category: dbItem.category as ItemCategory }),
      type: dbItem.type,
      quantityNeeded: dbItem.quantityNeeded,
      isEssential: dbItem.isEssential,
      createdAt: dbItem.createdAt.toISOString(),
      updatedAt: dbItem.updatedAt.toISOString(),
      createdBy: {
        id: dbItem.createdBy!.id,
        email: dbItem.createdBy!.email,
        ...(dbItem.createdBy?.username && { username: dbItem.createdBy.username }),
        ...(dbItem.createdBy?.displayName && { displayName: dbItem.createdBy.displayName }),
      },
      quantityClaimed,
      quantityRemaining,
      fullyFulfilled,
      claimCount: claims.length,
    };
  }

  /**
   * Convert database item claim to API response
   */
  static toItemClaim(dbClaim: DatabaseItemClaimWithRelations): ItemClaim {
    return {
      id: dbClaim.id,
      itemId: dbClaim.itemId,
      userId: dbClaim.userId,
      quantity: dbClaim.quantity,
      status: dbClaim.status,
      ...(dbClaim.notes && { notes: dbClaim.notes }),
      createdAt: dbClaim.createdAt.toISOString(),
      updatedAt: dbClaim.updatedAt.toISOString(),
      user: {
        id: dbClaim.user!.id,
        email: dbClaim.user!.email,
        ...(dbClaim.user?.username && { username: dbClaim.user.username }),
        ...(dbClaim.user?.displayName && { displayName: dbClaim.user.displayName }),
      },
    };
  }
}

/**
 * Item service class
 */
export class ItemService {
  /**
   * Create a new item
   * Only HOST/CO_HOST can create SHARED items, any member can create RECOMMENDED
   */
  static async createItem(
    user: UserProfile,
    itemData: CreateItemRequest
  ): Promise<CreateItemResponse> {
    const {
      tripId,
      name,
      description,
      category,
      type,
      quantityNeeded = 1,
      isEssential = false,
      metadata = {}
    } = itemData;

    // Validate required fields
    if (!tripId || !name || !type) {
      throw new BadRequestError('Trip ID, name, and type are required');
    }

    if (name.length > 200) {
      throw new BadRequestError('Item name must be less than 200 characters');
    }

    if (quantityNeeded < 1 || quantityNeeded > 1000) {
      throw new BadRequestError('Quantity needed must be between 1 and 1000');
    }

    try {
      // Check trip membership and get user role
      const membership = await this.checkTripMembership(tripId, user.id);
      if (!membership) {
        throw new NotFoundError('Trip not found or access denied');
      }

      // Check permissions for SHARED items
      if (type === 'SHARED' && membership.role === 'MEMBER') {
        throw new ForbiddenError('Only hosts and co-hosts can create shared items');
      }

      // Create item
      const result = await safePrismaOperation(async () => {
        return await prisma.item.create({
          data: {
            tripId,
            name: name.trim(),
            description: description?.trim() || null,
            category: category || null,
            type,
            quantityNeeded,
            isEssential,
            createdById: user.id,
            metadata: metadata as any,
          },
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
            claims: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        });
      }, 'Create item');

      log.info('Item created successfully', {
        itemId: result.id,
        tripId,
        userId: user.id,
        type,
        name: result.name,
        isEssential,
      });

      return {
        item: ItemTransforms.toItem(result as unknown as DatabaseItemWithRelations),
      };
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to create item', error, {
        userId: user.id,
        tripId,
        itemData,
      });

      throw new Error('Failed to create item');
    }
  }

  /**
   * List items for a trip with filtering and pagination
   */
  static async listTripItems(
    user: UserProfile,
    query: ItemListQuery = {}
  ): Promise<ItemListResponse> {
    const {
      tripId,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
      type,
      category,
      isEssential,
      createdBy,
      claimedBy,
      unclaimedOnly,
      search,
    } = query;

    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    // Validate pagination
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    try {
      // Check trip membership
      const membership = await this.checkTripMembership(tripId, user.id);
      if (!membership) {
        throw new NotFoundError('Trip not found or access denied');
      }

      // Build where clause
      const where: any = { tripId };

      if (type && type.length > 0) {
        where.type = { in: type };
      }

      if (category && category.length > 0) {
        where.category = { in: category };
      }

      if (isEssential !== undefined) {
        where.isEssential = isEssential;
      }

      if (createdBy) {
        where.createdById = createdBy;
      }

      if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        where.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      // Handle claimedBy filter
      if (claimedBy) {
        where.claims = {
          some: {
            userId: claimedBy,
            status: { not: 'CANCELLED' },
          },
        };
      }

      // Handle unclaimedOnly filter - this is complex so we'll filter after query
      const shouldFilterUnclaimed = unclaimedOnly === true;

      // Build order by clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [items, totalCount] = await Promise.all([
        safePrismaOperation(async () => {
          return await prisma.item.findMany({
            where,
            include: {
              createdBy: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  displayName: true,
                },
              },
              claims: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      username: true,
                      displayName: true,
                    },
                  },
                },
              },
            },
            orderBy,
            skip: offset,
            take: limitNum,
          });
        }, 'List trip items'),

        safePrismaOperation(async () => {
          return await prisma.item.count({ where });
        }, 'Count trip items'),
      ]);

      // Filter unclaimed items if requested
      let filteredItems = items;
      if (shouldFilterUnclaimed) {
        filteredItems = items.filter(item => {
          const quantityClaimed = item.claims
            .filter(claim => claim.status !== 'CANCELLED')
            .reduce((sum, claim) => sum + claim.quantity, 0);
          return quantityClaimed < item.quantityNeeded;
        });
      }

      const totalPages = Math.ceil(totalCount / limitNum);

      log.debug('Items listed successfully', {
        tripId,
        userId: user.id,
        totalItems: totalCount,
        page: pageNum,
        filters: { type, category, isEssential, search, unclaimedOnly },
      });

      return {
        items: filteredItems.map(item => ItemTransforms.toItemSummary(item as unknown as DatabaseItemWithRelations)),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: shouldFilterUnclaimed ? filteredItems.length : totalCount,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to list trip items', error, {
        userId: user.id,
        query,
      });

      throw new Error('Failed to retrieve items');
    }
  }

  /**
   * Get item by ID with access check
   */
  static async getItemById(itemId: string, user: UserProfile): Promise<Item> {
    if (!itemId) {
      throw new BadRequestError('Item ID is required');
    }

    try {
      const item = await safePrismaOperation(async () => {
        return await prisma.item.findUnique({
          where: { id: itemId },
          include: {
            trip: {
              select: {
                id: true,
                title: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
            claims: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    displayName: true,
                  },
                },
              },
              orderBy: [
                { status: 'asc' }, // Show active claims first
                { createdAt: 'asc' },
              ],
            },
          },
        });
      }, 'Get item by ID');

      if (!item) {
        throw new NotFoundError('Item not found');
      }

      // Check trip membership
      const membership = await this.checkTripMembership(item.tripId, user.id);
      if (!membership) {
        throw new NotFoundError('Item not found or access denied');
      }

      log.debug('Item retrieved successfully', {
        itemId,
        tripId: item.tripId,
        userId: user.id,
      });

      return ItemTransforms.toItem(item as unknown as DatabaseItemWithRelations);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to get item by ID', error, {
        itemId,
        userId: user.id,
      });

      throw new Error('Failed to retrieve item');
    }
  }

  /**
   * Update item (creator or HOST/CO_HOST can update)
   */
  static async updateItem(
    itemId: string,
    user: UserProfile,
    updateData: UpdateItemRequest
  ): Promise<Item> {
    if (!itemId) {
      throw new BadRequestError('Item ID is required');
    }

    // Validate update data
    if (updateData.name !== undefined && (!updateData.name || updateData.name.trim().length === 0)) {
      throw new BadRequestError('Item name cannot be empty');
    }

    if (updateData.name && updateData.name.length > 200) {
      throw new BadRequestError('Item name must be less than 200 characters');
    }

    if (updateData.quantityNeeded !== undefined && (updateData.quantityNeeded < 1 || updateData.quantityNeeded > 1000)) {
      throw new BadRequestError('Quantity needed must be between 1 and 1000');
    }

    try {
      // Get item and check permissions
      const item = await safePrismaOperation(async () => {
        return await prisma.item.findUnique({
          where: { id: itemId },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId: user.id, status: 'CONFIRMED' },
                },
              },
            },
            claims: true, // To validate quantity changes
          },
        });
      }, 'Get item for update');

      if (!item) {
        throw new NotFoundError('Item not found');
      }

      const membership = item.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Item not found or access denied');
      }

      // Check update permissions
      const canUpdate =
        item.createdById === user.id ||     // Creator can update
        membership.role === 'HOST' ||       // Host can update
        membership.role === 'CO_HOST';      // Co-host can update

      if (!canUpdate) {
        throw new ForbiddenError('Insufficient permissions to update item');
      }

      // Check for SHARED item type change permissions
      if (updateData.type === 'SHARED' && item.type !== 'SHARED' && membership.role === 'MEMBER') {
        throw new ForbiddenError('Only hosts and co-hosts can change items to SHARED type');
      }

      // Validate quantity reduction against existing claims
      if (updateData.quantityNeeded !== undefined) {
        const activeClaims = item.claims.filter(claim => claim.status !== 'CANCELLED');
        const totalClaimed = activeClaims.reduce((sum, claim) => sum + claim.quantity, 0);

        if (updateData.quantityNeeded < totalClaimed) {
          throw new BadRequestError(`Cannot reduce quantity below ${totalClaimed} (already claimed amount)`);
        }
      }

      // Build update data
      const dbUpdateData: any = {};

      if (updateData.name !== undefined) {
        dbUpdateData.name = updateData.name.trim();
      }

      if (updateData.description !== undefined) {
        dbUpdateData.description = updateData.description?.trim() || null;
      }

      if (updateData.category !== undefined) {
        dbUpdateData.category = updateData.category;
      }

      if (updateData.type !== undefined) {
        dbUpdateData.type = updateData.type;
      }

      if (updateData.quantityNeeded !== undefined) {
        dbUpdateData.quantityNeeded = updateData.quantityNeeded;
      }

      if (updateData.isEssential !== undefined) {
        dbUpdateData.isEssential = updateData.isEssential;
      }

      if (updateData.metadata !== undefined) {
        dbUpdateData.metadata = updateData.metadata;
      }

      // Update item
      const updatedItem = await safePrismaOperation(async () => {
        return await prisma.item.update({
          where: { id: itemId },
          data: dbUpdateData,
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
            claims: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        });
      }, 'Update item');

      log.info('Item updated successfully', {
        itemId,
        tripId: item.tripId,
        userId: user.id,
        updatedFields: Object.keys(dbUpdateData),
      });

      return ItemTransforms.toItem(updatedItem as unknown as DatabaseItemWithRelations);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to update item', error, {
        itemId,
        userId: user.id,
        updateData,
      });

      throw new Error('Failed to update item');
    }
  }

  /**
   * Delete item (creator or HOST can delete)
   */
  static async deleteItem(itemId: string, user: UserProfile): Promise<void> {
    if (!itemId) {
      throw new BadRequestError('Item ID is required');
    }

    try {
      // Get item and check permissions
      const item = await safePrismaOperation(async () => {
        return await prisma.item.findUnique({
          where: { id: itemId },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId: user.id, status: 'CONFIRMED' },
                },
              },
            },
            claims: true,
          },
        });
      }, 'Get item for deletion');

      if (!item) {
        throw new NotFoundError('Item not found');
      }

      const membership = item.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Item not found or access denied');
      }

      // Check delete permissions
      const canDelete =
        item.createdById === user.id ||   // Creator can delete
        membership.role === 'HOST';       // Host can delete

      if (!canDelete) {
        throw new ForbiddenError('Insufficient permissions to delete item');
      }

      // Warn if there are active claims
      const activeClaims = item.claims.filter(claim => claim.status !== 'CANCELLED');
      if (activeClaims.length > 0) {
        log.warn('Deleting item with active claims', {
          itemId,
          activeClaimsCount: activeClaims.length,
          userId: user.id,
        });
      }

      // Delete item (cascade delete will handle claims)
      await safePrismaOperation(async () => {
        await prisma.item.delete({
          where: { id: itemId },
        });
      }, 'Delete item');

      log.info('Item deleted successfully', {
        itemId,
        tripId: item.tripId,
        userId: user.id,
        name: item.name,
        claimsDeleted: item.claims.length,
      });
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to delete item', error, {
        itemId,
        userId: user.id,
      });

      throw new Error('Failed to delete item');
    }
  }

  /**
   * Claim an item or update existing claim
   */
  static async claimItem(
    itemId: string,
    user: UserProfile,
    claimData: ClaimItemRequest
  ): Promise<CreateClaimResponse> {
    if (!itemId) {
      throw new BadRequestError('Item ID is required');
    }

    const { quantity = 1, notes } = claimData;

    if (quantity < 1 || quantity > 100) {
      throw new BadRequestError('Claim quantity must be between 1 and 100');
    }

    try {
      // Get item and check availability
      const item = await safePrismaOperation(async () => {
        return await prisma.item.findUnique({
          where: { id: itemId },
          include: {
            trip: {
              include: {
                members: {
                  where: { userId: user.id, status: 'CONFIRMED' },
                },
              },
            },
            claims: true,
          },
        });
      }, 'Get item for claim');

      if (!item) {
        throw new NotFoundError('Item not found');
      }

      const membership = item.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Item not found or access denied');
      }

      // Cannot claim own items
      if (item.createdById === user.id) {
        throw new BadRequestError('Cannot claim your own item');
      }

      // Check if user already has a claim
      const existingClaim = item.claims.find(claim => claim.userId === user.id);
      if (existingClaim) {
        throw new ConflictError('You already have a claim on this item. Use update claim instead.');
      }

      // Check quantity availability
      const activeClaims = item.claims.filter(claim => claim.status !== 'CANCELLED');
      const totalClaimed = activeClaims.reduce((sum, claim) => sum + claim.quantity, 0);
      const availableQuantity = item.quantityNeeded - totalClaimed;

      if (quantity > availableQuantity) {
        throw new BadRequestError(`Only ${availableQuantity} quantity available for claiming`);
      }

      // Create claim
      const newClaim = await safePrismaOperation(async () => {
        return await prisma.itemClaim.create({
          data: {
            itemId,
            userId: user.id,
            quantity,
            status: 'CLAIMED',
            notes: notes?.trim() || null,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Create item claim');

      // Get updated item
      const updatedItem = await this.getItemById(itemId, user);

      log.info('Item claimed successfully', {
        itemId,
        claimId: newClaim.id,
        userId: user.id,
        quantity,
        tripId: item.tripId,
      });

      return {
        claim: ItemTransforms.toItemClaim(newClaim as unknown as DatabaseItemClaimWithRelations),
        item: updatedItem,
      };
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError ||
          error instanceof ConflictError) {
        throw error;
      }

      log.error('Failed to claim item', error, {
        itemId,
        userId: user.id,
        claimData,
      });

      throw new Error('Failed to claim item');
    }
  }

  /**
   * Update an existing item claim
   */
  static async updateClaim(
    claimId: string,
    user: UserProfile,
    updateData: UpdateClaimRequest
  ): Promise<ItemClaim> {
    if (!claimId) {
      throw new BadRequestError('Claim ID is required');
    }

    const { quantity, status, notes } = updateData;

    if (quantity !== undefined && (quantity < 1 || quantity > 100)) {
      throw new BadRequestError('Claim quantity must be between 1 and 100');
    }

    if (status && !['CLAIMED', 'BROUGHT', 'CANCELLED'].includes(status)) {
      throw new BadRequestError('Invalid claim status');
    }

    try {
      // Get claim and check permissions
      const claim = await safePrismaOperation(async () => {
        return await prisma.itemClaim.findUnique({
          where: { id: claimId },
          include: {
            item: {
              include: {
                trip: {
                  include: {
                    members: {
                      where: { userId: user.id, status: 'CONFIRMED' },
                    },
                  },
                },
                claims: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Get claim for update');

      if (!claim) {
        throw new NotFoundError('Claim not found');
      }

      const membership = claim.item.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Claim not found or access denied');
      }

      // Check permissions
      const canUpdate =
        claim.userId === user.id ||         // Claim owner can update
        membership.role === 'HOST' ||       // Host can update
        membership.role === 'CO_HOST';      // Co-host can update

      if (!canUpdate) {
        throw new ForbiddenError('Insufficient permissions to update claim');
      }

      // Cannot modify BROUGHT claims
      if (claim.status === 'BROUGHT' && status && status !== 'BROUGHT') {
        throw new BadRequestError('Cannot modify claims that are already marked as brought');
      }

      // Validate quantity change against other claims
      if (quantity !== undefined && quantity !== claim.quantity) {
        const otherActiveClaims = claim.item.claims.filter(
          c => c.id !== claimId && c.status !== 'CANCELLED'
        );
        const totalOtherClaimed = otherActiveClaims.reduce((sum, c) => sum + c.quantity, 0);
        const availableQuantity = claim.item.quantityNeeded - totalOtherClaimed;

        if (quantity > availableQuantity) {
          throw new BadRequestError(`Only ${availableQuantity} quantity available`);
        }
      }

      // Build update data
      const dbUpdateData: any = {};

      if (quantity !== undefined) {
        dbUpdateData.quantity = quantity;
      }

      if (status !== undefined) {
        dbUpdateData.status = status;
      }

      if (notes !== undefined) {
        dbUpdateData.notes = notes?.trim() || null;
      }

      // Update claim
      const updatedClaim = await safePrismaOperation(async () => {
        return await prisma.itemClaim.update({
          where: { id: claimId },
          data: dbUpdateData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
      }, 'Update item claim');

      log.info('Item claim updated successfully', {
        claimId,
        itemId: claim.itemId,
        userId: user.id,
        updatedFields: Object.keys(dbUpdateData),
        newStatus: status,
      });

      return ItemTransforms.toItemClaim(updatedClaim as unknown as DatabaseItemClaimWithRelations);
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to update item claim', error, {
        claimId,
        userId: user.id,
        updateData,
      });

      throw new Error('Failed to update claim');
    }
  }

  /**
   * Cancel a claim (delete it)
   */
  static async cancelClaim(claimId: string, user: UserProfile): Promise<void> {
    if (!claimId) {
      throw new BadRequestError('Claim ID is required');
    }

    try {
      // Get claim and check permissions
      const claim = await safePrismaOperation(async () => {
        return await prisma.itemClaim.findUnique({
          where: { id: claimId },
          include: {
            item: {
              include: {
                trip: {
                  include: {
                    members: {
                      where: { userId: user.id, status: 'CONFIRMED' },
                    },
                  },
                },
              },
            },
          },
        });
      }, 'Get claim for cancellation');

      if (!claim) {
        throw new NotFoundError('Claim not found');
      }

      const membership = claim.item.trip.members[0];
      if (!membership) {
        throw new NotFoundError('Claim not found or access denied');
      }

      // Check permissions
      const canCancel =
        claim.userId === user.id ||       // Claim owner can cancel
        membership.role === 'HOST';       // Host can cancel

      if (!canCancel) {
        throw new ForbiddenError('Insufficient permissions to cancel claim');
      }

      // Cannot cancel BROUGHT claims
      if (claim.status === 'BROUGHT') {
        throw new BadRequestError('Cannot cancel claims that are already marked as brought');
      }

      // Delete claim
      await safePrismaOperation(async () => {
        await prisma.itemClaim.delete({
          where: { id: claimId },
        });
      }, 'Delete item claim');

      log.info('Item claim cancelled successfully', {
        claimId,
        itemId: claim.itemId,
        userId: user.id,
        tripId: claim.item.tripId,
      });
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to cancel item claim', error, {
        claimId,
        userId: user.id,
      });

      throw new Error('Failed to cancel claim');
    }
  }

  /**
   * Get trip item statistics
   */
  static async getTripItemStats(tripId: string, user: UserProfile): Promise<TripItemStats> {
    if (!tripId) {
      throw new BadRequestError('Trip ID is required');
    }

    try {
      // Check trip membership
      const membership = await this.checkTripMembership(tripId, user.id);
      if (!membership) {
        throw new NotFoundError('Trip not found or access denied');
      }

      const [items, claims] = await Promise.all([
        safePrismaOperation(async () => {
          return await prisma.item.findMany({
            where: { tripId },
            include: { claims: true },
          });
        }, 'Get trip items for stats'),

        safePrismaOperation(async () => {
          return await prisma.itemClaim.findMany({
            where: { item: { tripId } },
          });
        }, 'Get trip claims for stats'),
      ]);

      const stats = {
        totalItems: items.length,
        recommendedItems: items.filter(item => item.type === 'RECOMMENDED').length,
        sharedItems: items.filter(item => item.type === 'SHARED').length,
        essentialItems: items.filter(item => item.isEssential).length,
        fullyFulfilledItems: 0,
        claimedItems: 0,
        unclaimedItems: 0,
        totalClaims: claims.length,
        claimsByStatus: {
          claimed: claims.filter(claim => claim.status === 'CLAIMED').length,
          brought: claims.filter(claim => claim.status === 'BROUGHT').length,
          cancelled: claims.filter(claim => claim.status === 'CANCELLED').length,
        },
      };

      // Calculate fulfilled and claimed items
      items.forEach(item => {
        const activeClaims = item.claims.filter(claim => claim.status !== 'CANCELLED');
        const totalClaimed = activeClaims.reduce((sum, claim) => sum + claim.quantity, 0);

        if (totalClaimed >= item.quantityNeeded) {
          stats.fullyFulfilledItems++;
        }

        if (activeClaims.length > 0) {
          stats.claimedItems++;
        } else {
          stats.unclaimedItems++;
        }
      });

      return stats;
    } catch (error) {
      if (error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError) {
        throw error;
      }

      log.error('Failed to get trip item statistics', error, {
        tripId,
        userId: user.id,
      });

      throw new Error('Failed to retrieve item statistics');
    }
  }

  /**
   * Check if user is a member of the trip and get their role
   */
  private static async checkTripMembership(tripId: string, userId: string): Promise<{
    role: MemberRole;
    status: string;
  } | null> {
    try {
      const membership = await safePrismaOperation(async () => {
        return await prisma.tripMember.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId,
            },
          },
          select: {
            role: true,
            status: true,
          },
        });
      }, 'Check trip membership');

      if (!membership || membership.status !== 'CONFIRMED') {
        return null;
      }

      return {
        role: membership.role as MemberRole,
        status: membership.status,
      };
    } catch (error) {
      log.error('Failed to check trip membership', error, {
        tripId,
        userId,
      });
      return null;
    }
  }
}

// Export the service
export default ItemService;