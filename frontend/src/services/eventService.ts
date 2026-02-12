/**
 * Event service for managing trip events
 * Handles all event-related API calls
 */

import { apiClient } from '../api/client';
import type { Event, CreateEventForm, UpdateEventForm } from '../types/index';

export class EventService {
  /**
   * Get all events for a trip
   */
  static async getTripEvents(params: {
    tripId: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string | string[];
    category?: string | string[];
    startTimeAfter?: string;
    startTimeBefore?: string;
  }): Promise<{
    events: Event[];
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
      const response = await apiClient.get('/events', { params });
      return response;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      throw error;
    }
  }

  /**
   * Get a specific event by ID
   */
  static async getEventById(eventId: string): Promise<Event> {
    try {
      const response = await apiClient.get<Event>(`/events/${eventId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch event:', error);
      throw error;
    }
  }

  /**
   * Create a new event
   */
  static async createEvent(eventData: CreateEventForm): Promise<Event> {
    try {
      const response = await apiClient.post<Event>('/events', eventData);
      return response;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  static async updateEvent(eventId: string, updateData: UpdateEventForm): Promise<Event> {
    try {
      const response = await apiClient.put<Event>(`/events/${eventId}`, updateData);
      return response;
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  static async deleteEvent(eventId: string): Promise<void> {
    try {
      await apiClient.delete(`/events/${eventId}`);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  /**
   * Update event status (approve or cancel)
   */
  static async updateEventStatus(
    eventId: string,
    status: 'APPROVED' | 'CANCELLED',
    reason?: string
  ): Promise<Event> {
    try {
      const response = await apiClient.put<Event>(`/events/${eventId}/approve`, {
        status,
        reason,
      });
      return response;
    } catch (error) {
      console.error('Failed to update event status:', error);
      throw error;
    }
  }
}
