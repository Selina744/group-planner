/**
 * Trip service demonstrating authenticated API usage
 * Shows how to use the API client for business logic endpoints
 */

import { apiClient } from '../api/client';
import type { Trip, CreateTripForm } from '../types/index';

export class TripService {
  /**
   * Get all trips for the current user
   */
  static async getUserTrips(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    trips: Trip[];
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
      const response = await apiClient.get('/trips', { params });
      return response;
    } catch (error) {
      console.error('Failed to fetch user trips:', error);
      throw error;
    }
  }

  /**
   * Get a specific trip by ID
   */
  static async getTripById(tripId: string): Promise<Trip> {
    try {
      const response = await apiClient.get<Trip>(`/trips/${tripId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch trip:', error);
      throw error;
    }
  }

  /**
   * Create a new trip
   */
  static async createTrip(tripData: CreateTripForm): Promise<Trip> {
    try {
      const response = await apiClient.post<Trip>('/trips', tripData);
      return response;
    } catch (error) {
      console.error('Failed to create trip:', error);
      throw error;
    }
  }

  /**
   * Update an existing trip
   */
  static async updateTrip(tripId: string, updateData: Partial<CreateTripForm>): Promise<Trip> {
    try {
      const response = await apiClient.put<Trip>(`/trips/${tripId}`, updateData);
      return response;
    } catch (error) {
      console.error('Failed to update trip:', error);
      throw error;
    }
  }

  /**
   * Delete a trip
   */
  static async deleteTrip(tripId: string): Promise<void> {
    try {
      await apiClient.delete(`/trips/${tripId}`);
    } catch (error) {
      console.error('Failed to delete trip:', error);
      throw error;
    }
  }

  /**
   * Join a public trip
   */
  static async joinTrip(tripId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`/trips/${tripId}/join`);
      return response;
    } catch (error) {
      console.error('Failed to join trip:', error);
      throw error;
    }
  }

  /**
   * Leave a trip
   */
  static async leaveTrip(tripId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`/trips/${tripId}/leave`);
      return response;
    } catch (error) {
      console.error('Failed to leave trip:', error);
      throw error;
    }
  }

  /**
   * Get trip members
   */
  static async getTripMembers(tripId: string): Promise<Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      displayName?: string;
      username?: string;
    };
    role: string;
    joinedAt: string;
  }>> {
    try {
      const response = await apiClient.get(`/trips/${tripId}/members`);
      return response.members;
    } catch (error) {
      console.error('Failed to fetch trip members:', error);
      throw error;
    }
  }

  /**
   * Invite user to trip
   */
  static async inviteToTrip(tripId: string, email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`/trips/${tripId}/invite`, { email });
      return response;
    } catch (error) {
      console.error('Failed to invite user to trip:', error);
      throw error;
    }
  }

  /**
   * Remove member from trip
   */
  static async removeMember(tripId: string, memberId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete(`/trips/${tripId}/members/${memberId}`);
      return response;
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    tripId: string,
    memberId: string,
    role: 'HOST' | 'CO_HOST' | 'MEMBER'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.patch(`/trips/${tripId}/members/${memberId}`, { role });
      return response;
    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  }

  /**
   * Search public trips
   */
  static async searchPublicTrips(params: {
    query?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    trips: Trip[];
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
      const response = await apiClient.get('/trips/search', { params });
      return response;
    } catch (error) {
      console.error('Failed to search trips:', error);
      throw error;
    }
  }
}