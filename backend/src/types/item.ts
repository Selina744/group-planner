/**
 * Item types and interfaces for Group Planner API
 *
 * This module defines all types related to item coordination, claim lifecycle,
 * and item management throughout the application.
 */

/**
 * Item type enum matching database
 */
export type ItemType = 'RECOMMENDED' | 'SHARED';

/**
 * Claim status enum matching database
 */
export type ClaimStatus = 'CLAIMED' | 'BROUGHT' | 'CANCELLED';

/**
 * Item category types (flexible string for extensibility)
 */
export type ItemCategory =
  | 'FOOD'
  | 'EQUIPMENT'
  | 'SUPPLIES'
  | 'CLOTHING'
  | 'ELECTRONICS'
  | 'TRANSPORTATION'
  | 'ENTERTAINMENT'
  | 'SAFETY'
  | 'OTHER';

/**
 * Item creation request
 */
export interface CreateItemRequest {
  tripId: string;
  name: string;
  description?: string;
  category?: ItemCategory;
  type: ItemType;
  quantityNeeded?: number;
  isEssential?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Item update request
 */
export interface UpdateItemRequest {
  name?: string;
  description?: string;
  category?: ItemCategory;
  type?: ItemType;
  quantityNeeded?: number;
  isEssential?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Item claim request
 */
export interface ClaimItemRequest {
  quantity?: number;
  notes?: string;
}

/**
 * Item claim update request
 */
export interface UpdateClaimRequest {
  quantity?: number;
  status?: ClaimStatus;
  notes?: string;
}

/**
 * Item list filters
 */
export interface ItemListFilters {
  tripId?: string;
  type?: ItemType[];
  category?: ItemCategory[];
  isEssential?: boolean;
  createdBy?: string; // User ID
  claimedBy?: string; // User ID
  unclaimedOnly?: boolean; // Show only items with unfulfilled quantity
  search?: string; // Search in name/description
}

/**
 * Item list query parameters
 */
export interface ItemListQuery extends ItemListFilters {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'type' | 'quantityNeeded' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Item claim information
 */
export interface ItemClaim {
  id: string;
  itemId: string;
  userId: string;
  quantity: number;
  status: ClaimStatus;
  notes?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  user: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
}

/**
 * Complete item information
 */
export interface Item {
  id: string;
  tripId: string;
  name: string;
  description?: string;
  category?: ItemCategory;
  type: ItemType;
  quantityNeeded: number;
  isEssential: boolean;
  metadata: Record<string, unknown>;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  // Creator information
  createdBy: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
  // Claim information
  claims: ItemClaim[];
  quantityClaimed: number; // Calculated field
  quantityRemaining: number; // Calculated field
  fullyFulfilled: boolean; // Calculated field
}

/**
 * Item summary for lists (without full claim details)
 */
export interface ItemSummary {
  id: string;
  tripId: string;
  name: string;
  description?: string;
  category?: ItemCategory;
  type: ItemType;
  quantityNeeded: number;
  isEssential: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
  // Summary claim information
  quantityClaimed: number;
  quantityRemaining: number;
  fullyFulfilled: boolean;
  claimCount: number;
}

/**
 * Item list response
 */
export interface ItemListResponse {
  items: ItemSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Item creation result
 */
export interface CreateItemResponse {
  item: Item;
}

/**
 * Claim creation result
 */
export interface CreateClaimResponse {
  claim: ItemClaim;
  item: Item; // Updated item with new claim
}

/**
 * Database item type (from Prisma, including sensitive fields)
 */
export interface DatabaseItem {
  id: string;
  tripId: string;
  name: string;
  description?: string;
  category?: string;
  type: ItemType;
  quantityNeeded: number;
  isEssential: boolean;
  createdById: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database item with relations (from Prisma)
 */
export interface DatabaseItemWithRelations extends DatabaseItem {
  trip?: {
    id: string;
    title: string;
  };
  createdBy?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
  claims?: DatabaseItemClaim[];
}

/**
 * Database item claim type (from Prisma)
 */
export interface DatabaseItemClaim {
  id: string;
  itemId: string;
  userId: string;
  quantity: number;
  status: ClaimStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database item claim with relations (from Prisma)
 */
export interface DatabaseItemClaimWithRelations extends DatabaseItemClaim {
  item?: DatabaseItem;
  user?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  };
}

/**
 * Item service error types
 */
export type ItemError =
  | 'ITEM_NOT_FOUND'
  | 'CLAIM_NOT_FOUND'
  | 'TRIP_NOT_FOUND'
  | 'NOT_A_MEMBER'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INVALID_ITEM_DATA'
  | 'INVALID_CLAIM_DATA'
  | 'QUANTITY_EXCEEDED'
  | 'ALREADY_CLAIMED'
  | 'CANNOT_CLAIM_OWN_ITEM'
  | 'CANNOT_MODIFY_BROUGHT'
  | 'INSUFFICIENT_QUANTITY';

/**
 * Item service method return type
 */
export interface ItemServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ItemError;
  message?: string;
}

/**
 * Trip item statistics
 */
export interface TripItemStats {
  totalItems: number;
  recommendedItems: number;
  sharedItems: number;
  essentialItems: number;
  fullyFulfilledItems: number;
  claimedItems: number;
  unclaimedItems: number;
  totalClaims: number;
  claimsByStatus: {
    claimed: number;
    brought: number;
    cancelled: number;
  };
}

/**
 * User claim statistics
 */
export interface UserClaimStats {
  totalClaims: number;
  activeClaims: number;
  broughtClaims: number;
  cancelledClaims: number;
  tripsWithClaims: number;
}

/**
 * Item validation result
 */
export interface ItemValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}