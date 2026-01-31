/**
 * Item service comprehensive test suite
 *
 * Tests all CRUD operations, role-based access control, claim management,
 * and edge cases for the Item coordination system.
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { ItemService } from '../services/item.js';
import { TripService } from '../services/trip.js';
import { prisma } from '../lib/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';
import type { UserProfile } from '../types/auth.js';
import type {
  CreateItemRequest,
  UpdateItemRequest,
  ClaimItemRequest,
  UpdateClaimRequest,
  ItemType,
  ItemCategory,
  ClaimStatus,
} from '../types/item.js';

// Test data interfaces
interface TestTrip {
  id: string;
  title: string;
  inviteCode: string;
}

// Mock user profiles for testing
const mockHostUser: UserProfile = {
  id: 'user-host-1',
  email: 'host@example.com',
  username: 'testhost',
  displayName: 'Test Host',
  emailVerified: true,
  timezone: 'UTC',
};

const mockCoHostUser: UserProfile = {
  id: 'user-cohost-1',
  email: 'cohost@example.com',
  username: 'testcohost',
  displayName: 'Test CoHost',
  emailVerified: true,
  timezone: 'UTC',
};

const mockMemberUser: UserProfile = {
  id: 'user-member-1',
  email: 'member@example.com',
  username: 'testmember',
  displayName: 'Test Member',
  emailVerified: true,
  timezone: 'UTC',
};

const mockOutsiderUser: UserProfile = {
  id: 'user-outsider-1',
  email: 'outsider@example.com',
  username: 'testoutsider',
  displayName: 'Test Outsider',
  emailVerified: true,
  timezone: 'UTC',
};

// Test setup
describe('Item Service', () => {
  let testTrip: TestTrip;

  beforeEach(async () => {
    // Clean database
    await prisma.itemClaim.deleteMany({});
    await prisma.item.deleteMany({});
    await prisma.tripMember.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    // Create mock users in database
    await prisma.user.createMany({
      data: [
        {
          id: mockHostUser.id,
          email: mockHostUser.email,
          username: mockHostUser.username,
          displayName: mockHostUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
        {
          id: mockCoHostUser.id,
          email: mockCoHostUser.email,
          username: mockCoHostUser.username,
          displayName: mockCoHostUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
        {
          id: mockMemberUser.id,
          email: mockMemberUser.email,
          username: mockMemberUser.username,
          displayName: mockMemberUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
        {
          id: mockOutsiderUser.id,
          email: mockOutsiderUser.email,
          username: mockOutsiderUser.username,
          displayName: mockOutsiderUser.displayName,
          passwordHash: 'mock-hash',
          emailVerified: true,
          timezone: 'UTC',
        },
      ]
    });

    // Create test trip with memberships
    const tripResult = await TripService.createTrip(mockHostUser, {
      title: 'Test Trip',
      description: 'A trip for testing',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    testTrip = {
      id: tripResult.trip.id,
      title: tripResult.trip.title,
      inviteCode: tripResult.trip.inviteCode,
    };

    // Add co-host and member to trip
    await prisma.tripMember.create({
      data: {
        tripId: testTrip.id,
        userId: mockCoHostUser.id,
        role: 'CO_HOST',
        status: 'CONFIRMED',
      },
    });

    await prisma.tripMember.create({
      data: {
        tripId: testTrip.id,
        userId: mockMemberUser.id,
        role: 'MEMBER',
        status: 'CONFIRMED',
      },
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.itemClaim.deleteMany({});
    await prisma.item.deleteMany({});
    await prisma.tripMember.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  // Helper function for creating additional test users when needed
  async function createAdditionalUser(id: string, email: string, username: string): Promise<UserProfile> {
    await prisma.user.create({
      data: {
        id,
        email,
        username,
        displayName: `Test User ${username}`,
        passwordHash: 'mock-hash',
        emailVerified: true,
        timezone: 'UTC',
      },
    });

    return {
      id,
      email,
      username,
      displayName: `Test User ${username}`,
      emailVerified: true,
      timezone: 'UTC',
    };
  }

  // CRUD Tests
  describe('Create Item', () => {
    it('should create a RECOMMENDED item by any trip member', async () => {
      const itemData: CreateItemRequest = {
        tripId: testTrip.id,
        name: 'Test Item',
        description: 'A test item for the trip',
        category: 'EQUIPMENT',
        type: 'RECOMMENDED',
        quantityNeeded: 1,
        isEssential: true,
      };

      const result = await ItemService.createItem(mockMemberUser, itemData);

      expect(result.item).toMatchObject({
        name: 'Test Item',
        description: 'A test item for the trip',
        category: 'EQUIPMENT',
        type: 'RECOMMENDED',
        quantityNeeded: 1,
        isEssential: true,
        tripId: testTrip.id,
        quantityClaimed: 0,
        quantityRemaining: 1,
        fullyFulfilled: false,
      });

      expect(result.item.createdBy.id).toBe(mockMemberUser.id);
      expect(result.item.claims).toHaveLength(0);
    });

    it('should create a SHARED item by HOST', async () => {
      const itemData: CreateItemRequest = {
        tripId: testTrip.id,
        name: 'Shared Equipment',
        type: 'SHARED',
        quantityNeeded: 2,
      };

      const result = await ItemService.createItem(mockHostUser, itemData);

      expect(result.item).toMatchObject({
        name: 'Shared Equipment',
        type: 'SHARED',
        quantityNeeded: 2,
        isEssential: false,
      });
    });

    it('should create a SHARED item by CO_HOST', async () => {
      const itemData: CreateItemRequest = {
        tripId: testTrip.id,
        name: 'Co-Host Shared Item',
        type: 'SHARED',
      };

      const result = await ItemService.createItem(mockCoHostUser, itemData);
      expect(result.item.type).toBe('SHARED');
    });

    it('should reject SHARED item creation by MEMBER', async () => {
      const itemData: CreateItemRequest = {
        tripId: testTrip.id,
        name: 'Shared Item',
        type: 'SHARED',
      };

      await expect(
        ItemService.createItem(mockMemberUser, itemData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject item creation by non-trip member', async () => {
      const itemData: CreateItemRequest = {
        tripId: testTrip.id,
        name: 'Outsider Item',
        type: 'RECOMMENDED',
      };

      await expect(
        ItemService.createItem(mockOutsiderUser, itemData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate required fields', async () => {
      await expect(
        ItemService.createItem(mockHostUser, {
          tripId: '',
          name: '',
          type: 'RECOMMENDED',
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        ItemService.createItem(mockHostUser, {
          tripId: testTrip.id,
          name: 'A'.repeat(201), // Too long
          type: 'RECOMMENDED',
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        ItemService.createItem(mockHostUser, {
          tripId: testTrip.id,
          name: 'Valid Item',
          type: 'RECOMMENDED',
          quantityNeeded: 0, // Invalid quantity
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('List Items', () => {
    beforeEach(async () => {
      // Create test items
      await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Host Item 1',
        type: 'RECOMMENDED',
        category: 'EQUIPMENT',
        isEssential: true,
      });

      await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Host Shared Item',
        type: 'SHARED',
        category: 'FOOD',
        quantityNeeded: 3,
      });

      await ItemService.createItem(mockMemberUser, {
        tripId: testTrip.id,
        name: 'Member Item',
        type: 'RECOMMENDED',
        category: 'EQUIPMENT',
      });
    });

    it('should list all items for trip member', async () => {
      const result = await ItemService.listTripItems(mockMemberUser, {
        tripId: testTrip.id,
      });

      expect(result.items).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
    });

    it('should filter by item type', async () => {
      const result = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        type: ['SHARED'],
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('SHARED');
    });

    it('should filter by category', async () => {
      const result = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        category: ['EQUIPMENT'],
      });

      expect(result.items).toHaveLength(2);
      result.items.forEach(item => expect(item.category).toBe('EQUIPMENT'));
    });

    it('should filter by isEssential', async () => {
      const result = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        isEssential: true,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].isEssential).toBe(true);
    });

    it('should filter by creator', async () => {
      const result = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        createdBy: mockMemberUser.id,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].createdBy.id).toBe(mockMemberUser.id);
    });

    it('should search by name', async () => {
      const result = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        search: 'Host',
      });

      expect(result.items).toHaveLength(2);
      result.items.forEach(item => expect(item.name.toLowerCase()).toContain('host'));
    });

    it('should support pagination', async () => {
      const page1 = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        page: 1,
        limit: 2,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.totalPages).toBe(2);
      expect(page1.pagination.hasNext).toBe(true);

      const page2 = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        page: 2,
        limit: 2,
      });

      expect(page2.items).toHaveLength(1);
      expect(page2.pagination.hasNext).toBe(false);
    });

    it('should sort items', async () => {
      const result = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      const names = result.items.map(item => item.name);
      expect(names).toEqual([...names].sort());
    });

    it('should reject access by non-trip member', async () => {
      await expect(
        ItemService.listTripItems(mockOutsiderUser, {
          tripId: testTrip.id,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Get Item By ID', () => {
    let testItemId: string;

    beforeEach(async () => {
      const result = await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Test Item',
        description: 'For testing',
        type: 'RECOMMENDED',
      });
      testItemId = result.item.id;
    });

    it('should get item with full details', async () => {
      const item = await ItemService.getItemById(testItemId, mockMemberUser);

      expect(item).toMatchObject({
        id: testItemId,
        name: 'Test Item',
        description: 'For testing',
        type: 'RECOMMENDED',
        tripId: testTrip.id,
      });

      expect(item.createdBy.id).toBe(mockHostUser.id);
      expect(item.claims).toHaveLength(0);
    });

    it('should reject access by non-trip member', async () => {
      await expect(
        ItemService.getItemById(testItemId, mockOutsiderUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject invalid item ID', async () => {
      await expect(
        ItemService.getItemById('invalid-id', mockHostUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Update Item', () => {
    let testItemId: string;

    beforeEach(async () => {
      const result = await ItemService.createItem(mockMemberUser, {
        tripId: testTrip.id,
        name: 'Original Item',
        type: 'RECOMMENDED',
        quantityNeeded: 2,
      });
      testItemId = result.item.id;
    });

    it('should allow item creator to update', async () => {
      const updateData: UpdateItemRequest = {
        name: 'Updated Item',
        description: 'Updated description',
        quantityNeeded: 3,
        isEssential: true,
      };

      const updatedItem = await ItemService.updateItem(
        testItemId,
        mockMemberUser,
        updateData
      );

      expect(updatedItem).toMatchObject({
        name: 'Updated Item',
        description: 'Updated description',
        quantityNeeded: 3,
        isEssential: true,
      });
    });

    it('should allow HOST to update any item', async () => {
      const updateData: UpdateItemRequest = {
        name: 'Host Updated Item',
      };

      const updatedItem = await ItemService.updateItem(
        testItemId,
        mockHostUser,
        updateData
      );

      expect(updatedItem.name).toBe('Host Updated Item');
    });

    it('should allow CO_HOST to update any item', async () => {
      const updateData: UpdateItemRequest = {
        name: 'CoHost Updated Item',
      };

      const updatedItem = await ItemService.updateItem(
        testItemId,
        mockCoHostUser,
        updateData
      );

      expect(updatedItem.name).toBe('CoHost Updated Item');
    });

    it('should reject update by other members', async () => {
      const otherMember = await createAdditionalUser('other-user-id', 'other@example.com', 'otheruser');
      await prisma.tripMember.create({
        data: {
          tripId: testTrip.id,
          userId: otherMember.id,
          role: 'MEMBER',
          status: 'CONFIRMED',
        },
      });

      const updateData: UpdateItemRequest = {
        name: 'Unauthorized Update',
      };

      await expect(
        ItemService.updateItem(testItemId, otherMember, updateData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should prevent quantity reduction below claimed amount', async () => {
      // Create a claim first
      await ItemService.claimItem(testItemId, mockHostUser, { quantity: 2 });

      const updateData: UpdateItemRequest = {
        quantityNeeded: 1, // Less than claimed amount (2)
      };

      await expect(
        ItemService.updateItem(testItemId, mockMemberUser, updateData)
      ).rejects.toThrow(BadRequestError);
    });

    it('should validate input data', async () => {
      await expect(
        ItemService.updateItem(testItemId, mockMemberUser, {
          name: '', // Empty name
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        ItemService.updateItem(testItemId, mockMemberUser, {
          name: 'A'.repeat(201), // Too long
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        ItemService.updateItem(testItemId, mockMemberUser, {
          quantityNeeded: 0, // Invalid quantity
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('Delete Item', () => {
    let testItemId: string;

    beforeEach(async () => {
      const result = await ItemService.createItem(mockMemberUser, {
        tripId: testTrip.id,
        name: 'Item to Delete',
        type: 'RECOMMENDED',
      });
      testItemId = result.item.id;
    });

    it('should allow item creator to delete', async () => {
      await expect(
        ItemService.deleteItem(testItemId, mockMemberUser)
      ).resolves.not.toThrow();

      await expect(
        ItemService.getItemById(testItemId, mockMemberUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should allow HOST to delete any item', async () => {
      await expect(
        ItemService.deleteItem(testItemId, mockHostUser)
      ).resolves.not.toThrow();
    });

    it('should reject deletion by CO_HOST (not allowed)', async () => {
      await expect(
        ItemService.deleteItem(testItemId, mockCoHostUser)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject deletion by other members', async () => {
      const otherMember = await createAdditionalUser('other-user-id-2', 'other2@example.com', 'otheruser2');
      await prisma.tripMember.create({
        data: {
          tripId: testTrip.id,
          userId: otherMember.id,
          role: 'MEMBER',
          status: 'CONFIRMED',
        },
      });

      await expect(
        ItemService.deleteItem(testItemId, otherMember)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should delete item with active claims', async () => {
      // Create a claim
      await ItemService.claimItem(testItemId, mockHostUser, { quantity: 1 });

      // Should still allow deletion (with warning logged)
      await expect(
        ItemService.deleteItem(testItemId, mockMemberUser)
      ).resolves.not.toThrow();
    });
  });

  describe('Claim Item', () => {
    let testItemId: string;

    beforeEach(async () => {
      const result = await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Claimable Item',
        type: 'RECOMMENDED',
        quantityNeeded: 3,
      });
      testItemId = result.item.id;
    });

    it('should create a claim successfully', async () => {
      const claimData: ClaimItemRequest = {
        quantity: 2,
        notes: 'I can bring this',
      };

      const result = await ItemService.claimItem(testItemId, mockMemberUser, claimData);

      expect(result.claim).toMatchObject({
        itemId: testItemId,
        userId: mockMemberUser.id,
        quantity: 2,
        status: 'CLAIMED',
        notes: 'I can bring this',
      });

      expect(result.item.quantityClaimed).toBe(2);
      expect(result.item.quantityRemaining).toBe(1);
      expect(result.item.fullyFulfilled).toBe(false);
    });

    it('should prevent claiming own item', async () => {
      const claimData: ClaimItemRequest = {
        quantity: 1,
      };

      await expect(
        ItemService.claimItem(testItemId, mockHostUser, claimData)
      ).rejects.toThrow(BadRequestError);
    });

    it('should prevent duplicate claims by same user', async () => {
      await ItemService.claimItem(testItemId, mockMemberUser, { quantity: 1 });

      await expect(
        ItemService.claimItem(testItemId, mockMemberUser, { quantity: 1 })
      ).rejects.toThrow(ConflictError);
    });

    it('should prevent claiming more than available quantity', async () => {
      const claimData: ClaimItemRequest = {
        quantity: 4, // More than quantityNeeded (3)
      };

      await expect(
        ItemService.claimItem(testItemId, mockMemberUser, claimData)
      ).rejects.toThrow(BadRequestError);
    });

    it('should handle partial fulfillment correctly', async () => {
      // First claim
      await ItemService.claimItem(testItemId, mockMemberUser, { quantity: 2 });

      // Second claim should only allow remaining quantity
      await expect(
        ItemService.claimItem(testItemId, mockCoHostUser, { quantity: 2 })
      ).rejects.toThrow(BadRequestError);

      // But should allow claiming exactly the remaining quantity
      const result = await ItemService.claimItem(testItemId, mockCoHostUser, { quantity: 1 });
      expect(result.item.fullyFulfilled).toBe(true);
    });

    it('should validate claim data', async () => {
      await expect(
        ItemService.claimItem(testItemId, mockMemberUser, { quantity: 0 })
      ).rejects.toThrow(BadRequestError);

      await expect(
        ItemService.claimItem(testItemId, mockMemberUser, { quantity: 101 })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('Update Claim', () => {
    let testItemId: string;
    let testClaimId: string;

    beforeEach(async () => {
      const itemResult = await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Item with Claim',
        type: 'RECOMMENDED',
        quantityNeeded: 5,
      });
      testItemId = itemResult.item.id;

      const claimResult = await ItemService.claimItem(testItemId, mockMemberUser, {
        quantity: 2,
        notes: 'Original claim',
      });
      testClaimId = claimResult.claim.id;
    });

    it('should allow claim owner to update', async () => {
      const updateData: UpdateClaimRequest = {
        quantity: 3,
        notes: 'Updated claim',
        status: 'BROUGHT',
      };

      const updatedClaim = await ItemService.updateClaim(
        testClaimId,
        mockMemberUser,
        updateData
      );

      expect(updatedClaim).toMatchObject({
        quantity: 3,
        notes: 'Updated claim',
        status: 'BROUGHT',
      });
    });

    it('should allow HOST to update any claim', async () => {
      const updateData: UpdateClaimRequest = {
        status: 'BROUGHT',
        notes: 'Host verified',
      };

      const updatedClaim = await ItemService.updateClaim(
        testClaimId,
        mockHostUser,
        updateData
      );

      expect(updatedClaim.status).toBe('BROUGHT');
      expect(updatedClaim.notes).toBe('Host verified');
    });

    it('should allow CO_HOST to update any claim', async () => {
      const updateData: UpdateClaimRequest = {
        status: 'CANCELLED',
      };

      const updatedClaim = await ItemService.updateClaim(
        testClaimId,
        mockCoHostUser,
        updateData
      );

      expect(updatedClaim.status).toBe('CANCELLED');
    });

    it('should reject update by other users', async () => {
      const otherMember = await createAdditionalUser('other-user-id-3', 'other3@example.com', 'otheruser3');
      await prisma.tripMember.create({
        data: {
          tripId: testTrip.id,
          userId: otherMember.id,
          role: 'MEMBER',
          status: 'CONFIRMED',
        },
      });

      await expect(
        ItemService.updateClaim(testClaimId, otherMember, { quantity: 1 })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should prevent modifying BROUGHT claims', async () => {
      // First mark as brought
      await ItemService.updateClaim(testClaimId, mockMemberUser, { status: 'BROUGHT' });

      // Then try to modify
      await expect(
        ItemService.updateClaim(testClaimId, mockMemberUser, { status: 'CLAIMED' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should validate quantity against available amount', async () => {
      // Create another claim to reduce available quantity
      await ItemService.claimItem(testItemId, mockCoHostUser, { quantity: 2 });

      // Now available quantity is 5 - 2 (existing) - 2 (new) = 1
      // Trying to increase existing claim to 3 should fail
      await expect(
        ItemService.updateClaim(testClaimId, mockMemberUser, { quantity: 3 })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('Cancel Claim', () => {
    let testItemId: string;
    let testClaimId: string;

    beforeEach(async () => {
      const itemResult = await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Item with Claim',
        type: 'RECOMMENDED',
        quantityNeeded: 2,
      });
      testItemId = itemResult.item.id;

      const claimResult = await ItemService.claimItem(testItemId, mockMemberUser, {
        quantity: 1,
      });
      testClaimId = claimResult.claim.id;
    });

    it('should allow claim owner to cancel', async () => {
      await expect(
        ItemService.cancelClaim(testClaimId, mockMemberUser)
      ).resolves.not.toThrow();

      // Claim should be deleted
      const item = await ItemService.getItemById(testItemId, mockMemberUser);
      expect(item.claims).toHaveLength(0);
      expect(item.quantityClaimed).toBe(0);
    });

    it('should allow HOST to cancel any claim', async () => {
      await expect(
        ItemService.cancelClaim(testClaimId, mockHostUser)
      ).resolves.not.toThrow();
    });

    it('should reject cancellation by CO_HOST (not allowed)', async () => {
      await expect(
        ItemService.cancelClaim(testClaimId, mockCoHostUser)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should prevent cancelling BROUGHT claims', async () => {
      // Mark as brought first
      await ItemService.updateClaim(testClaimId, mockMemberUser, { status: 'BROUGHT' });

      // Then try to cancel
      await expect(
        ItemService.cancelClaim(testClaimId, mockMemberUser)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('Get Trip Item Statistics', () => {
    beforeEach(async () => {
      // Create various items and claims for testing
      const item1 = await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Essential Item',
        type: 'RECOMMENDED',
        quantityNeeded: 2,
        isEssential: true,
      });

      const item2 = await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Shared Food',
        type: 'SHARED',
        quantityNeeded: 1,
      });

      const item3 = await ItemService.createItem(mockMemberUser, {
        tripId: testTrip.id,
        name: 'Member Item',
        type: 'RECOMMENDED',
        quantityNeeded: 3,
      });

      // Create claims
      await ItemService.claimItem(item1.item.id, mockMemberUser, { quantity: 2 }); // Fully fulfilled
      await ItemService.claimItem(item3.item.id, mockCoHostUser, { quantity: 1 }); // Partially claimed

      // Mark one claim as brought
      const claims = await prisma.itemClaim.findMany({ where: { itemId: item1.item.id } });
      await ItemService.updateClaim(claims[0].id, mockMemberUser, { status: 'BROUGHT' });
    });

    it('should return comprehensive trip statistics', async () => {
      const stats = await ItemService.getTripItemStats(testTrip.id, mockHostUser);

      expect(stats).toMatchObject({
        totalItems: 3,
        recommendedItems: 2,
        sharedItems: 1,
        essentialItems: 1,
        fullyFulfilledItems: 1,
        claimedItems: 2,
        unclaimedItems: 1,
        totalClaims: 2,
        claimsByStatus: {
          claimed: 1,
          brought: 1,
          cancelled: 0,
        },
      });
    });

    it('should reject access by non-trip member', async () => {
      await expect(
        ItemService.getTripItemStats(testTrip.id, mockOutsiderUser)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-existent trip', async () => {
      const fakeTrip = 'fake-trip-id';

      await expect(
        ItemService.createItem(mockHostUser, {
          tripId: fakeTrip,
          name: 'Test Item',
          type: 'RECOMMENDED',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle malformed UUIDs gracefully', async () => {
      await expect(
        ItemService.getItemById('not-a-uuid', mockHostUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle empty search queries', async () => {
      await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Test Item',
        type: 'RECOMMENDED',
      });

      const result = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        search: '',
      });

      expect(result.items).toHaveLength(1);
    });

    it('should handle extreme pagination values', async () => {
      await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Test Item',
        type: 'RECOMMENDED',
      });

      // Very large page number
      const result = await ItemService.listTripItems(mockHostUser, {
        tripId: testTrip.id,
        page: 999999,
        limit: 1,
      });

      expect(result.items).toHaveLength(0);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should handle concurrent claims on same item', async () => {
      const itemResult = await ItemService.createItem(mockHostUser, {
        tripId: testTrip.id,
        name: 'Concurrent Test Item',
        type: 'RECOMMENDED',
        quantityNeeded: 1,
      });

      // Create additional users for concurrent claims
      const user1 = await createAdditionalUser('concurrent-user-1', 'concurrent1@example.com', 'concurrent1');
      const user2 = await createAdditionalUser('concurrent-user-2', 'concurrent2@example.com', 'concurrent2');

      // Add them to trip
      await prisma.tripMember.createMany({
        data: [
          {
            tripId: testTrip.id,
            userId: user1.id,
            role: 'MEMBER',
            status: 'CONFIRMED',
          },
          {
            tripId: testTrip.id,
            userId: user2.id,
            role: 'MEMBER',
            status: 'CONFIRMED',
          },
        ],
      });

      // First claim should succeed
      await expect(
        ItemService.claimItem(itemResult.item.id, user1, { quantity: 1 })
      ).resolves.not.toThrow();

      // Second claim should fail (quantity exceeded)
      await expect(
        ItemService.claimItem(itemResult.item.id, user2, { quantity: 1 })
      ).rejects.toThrow(BadRequestError);
    });
  });
});