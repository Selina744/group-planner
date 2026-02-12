/**
 * Item service for managing trip items and claims
 * Provides API methods for CRUD operations on items and claims
 */

import { apiClient } from '../api/client';
import type { Item, CreateItemForm, UpdateItemForm, CreateClaimForm, UpdateClaimForm, ItemClaim } from '../types/index';

export class ItemService {
  /**
   * Get all items for a trip
   */
  static async getTripItems(params: {
    tripId: string;
    page?: number;
    limit?: number;
    type?: 'RECOMMENDED' | 'SHARED' | Array<'RECOMMENDED' | 'SHARED'>;
    category?: string | string[];
    isEssential?: boolean;
    unclaimedOnly?: boolean;
    search?: string;
  }): Promise<{
    items: Item[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const response = await apiClient.get('/items', { params });
      return response;
    } catch (error) {
      console.error('Failed to fetch trip items:', error);
      throw error;
    }
  }

  /**
   * Get a specific item by ID
   */
  static async getItemById(itemId: string): Promise<Item> {
    try {
      const response = await apiClient.get<Item>(`/items/${itemId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch item:', error);
      throw error;
    }
  }

  /**
   * Create a new item
   */
  static async createItem(itemData: CreateItemForm): Promise<Item> {
    try {
      const response = await apiClient.post<Item>('/items', itemData);
      return response;
    } catch (error) {
      console.error('Failed to create item:', error);
      throw error;
    }
  }

  /**
   * Update an existing item
   */
  static async updateItem(itemId: string, updateData: UpdateItemForm): Promise<Item> {
    try {
      const response = await apiClient.put<Item>(`/items/${itemId}`, updateData);
      return response;
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  }

  /**
   * Delete an item
   */
  static async deleteItem(itemId: string): Promise<void> {
    try {
      await apiClient.delete(`/items/${itemId}`);
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  }

  /**
   * Claim an item
   */
  static async claimItem(itemId: string, claimData: CreateClaimForm): Promise<ItemClaim> {
    try {
      const response = await apiClient.post<ItemClaim>(`/items/${itemId}/claim`, claimData);
      return response;
    } catch (error) {
      console.error('Failed to claim item:', error);
      throw error;
    }
  }

  /**
   * Update a claim
   */
  static async updateClaim(claimId: string, updateData: UpdateClaimForm): Promise<ItemClaim> {
    try {
      const response = await apiClient.put<ItemClaim>(`/items/claims/${claimId}`, updateData);
      return response;
    } catch (error) {
      console.error('Failed to update claim:', error);
      throw error;
    }
  }

  /**
   * Cancel a claim
   */
  static async cancelClaim(claimId: string): Promise<void> {
    try {
      await apiClient.delete(`/items/claims/${claimId}`);
    } catch (error) {
      console.error('Failed to cancel claim:', error);
      throw error;
    }
  }

  /**
   * Get trip item statistics
   */
  static async getTripItemStats(tripId: string): Promise<{
    totalItems: number;
    totalClaimed: number;
    totalUnclaimed: number;
    claimProgress: number;
  }> {
    try {
      const response = await apiClient.get(`/trips/${tripId}/items/stats`);
      return response;
    } catch (error) {
      console.error('Failed to fetch trip item stats:', error);
      throw error;
    }
  }
}
