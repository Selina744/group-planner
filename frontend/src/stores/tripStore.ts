/**
 * Zustand trip store - centralized trip state management
 * Manages trips, members, events, and CRUD operations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TripService } from '../services/tripService';
import type {
  Trip,
  TripMember,
  Event,
  CreateTripForm,
  CreateEventForm,
  MemberRole,
} from '../types';

// Trip search and filter parameters
interface TripFilters {
  search?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
}

// Trip store state
interface TripState {
  // Current trips data
  trips: Trip[];
  currentTrip: Trip | null;
  currentTripMembers: TripMember[];
  currentTripEvents: Event[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Search and pagination
  searchResults: Trip[];
  isSearching: boolean;
  totalPages: number;
  currentPage: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}

// Trip store actions
interface TripActions {
  // Trip CRUD operations
  fetchUserTrips: () => Promise<void>;
  fetchTrip: (tripId: string) => Promise<Trip>;
  createTrip: (tripData: CreateTripForm) => Promise<Trip>;
  updateTrip: (tripId: string, updateData: Partial<Trip>) => Promise<Trip>;
  deleteTrip: (tripId: string) => Promise<void>;

  // Trip membership
  joinTrip: (tripId: string) => Promise<void>;
  leaveTrip: (tripId: string) => Promise<void>;
  fetchTripMembers: (tripId: string) => Promise<void>;
  inviteMember: (tripId: string, email: string) => Promise<void>;
  removeMember: (tripId: string, memberId: string) => Promise<void>;
  updateMemberRole: (tripId: string, memberId: string, role: MemberRole) => Promise<void>;

  // Events management (placeholder for future implementation)
  fetchTripEvents: (tripId: string) => Promise<void>;
  createEvent: (tripId: string, eventData: CreateEventForm) => Promise<Event>;
  updateEvent: (tripId: string, eventId: string, updateData: Partial<Event>) => Promise<Event>;
  deleteEvent: (tripId: string, eventId: string) => Promise<void>;

  // Search and discovery
  searchTrips: (filters: TripFilters, page?: number) => Promise<void>;
  clearSearch: () => void;

  // State management
  setCurrentTrip: (trip: Trip | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

type TripStore = TripState & TripActions;

// Initial state
const initialState: TripState = {
  trips: [],
  currentTrip: null,
  currentTripMembers: [],
  currentTripEvents: [],
  isLoading: false,
  error: null,
  searchResults: [],
  isSearching: false,
  totalPages: 0,
  currentPage: 1,
  pagination: null,
};

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Fetch user's trips
      fetchUserTrips: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await TripService.getUserTrips();
          set({
            trips: response.trips,
            pagination: response.pagination,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to fetch trips.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Fetch a specific trip
      fetchTrip: async (tripId: string) => {
        set({ isLoading: true, error: null });

        try {
          const trip = await TripService.getTripById(tripId);
          set({
            currentTrip: trip,
            isLoading: false,
            error: null,
          });
          return trip;
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to fetch trip.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Create a new trip
      createTrip: async (tripData: CreateTripForm) => {
        set({ isLoading: true, error: null });

        try {
          const newTrip = await TripService.createTrip(tripData);
          const { trips } = get();
          set({
            trips: [newTrip, ...trips],
            currentTrip: newTrip,
            isLoading: false,
            error: null,
          });
          return newTrip;
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to create trip.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Update an existing trip
      updateTrip: async (tripId: string, updateData: Partial<Trip>) => {
        set({ isLoading: true, error: null });

        try {
          const updatedTrip = await TripService.updateTrip(tripId, updateData);
          const { trips, currentTrip } = get();

          // Update in trips list
          const updatedTrips = trips.map(trip =>
            trip.id === tripId ? updatedTrip : trip
          );

          // Update current trip if it's the one being updated
          const updatedCurrentTrip = currentTrip?.id === tripId ? updatedTrip : currentTrip;

          set({
            trips: updatedTrips,
            currentTrip: updatedCurrentTrip,
            isLoading: false,
            error: null,
          });
          return updatedTrip;
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to update trip.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Delete a trip
      deleteTrip: async (tripId: string) => {
        set({ isLoading: true, error: null });

        try {
          await TripService.deleteTrip(tripId);
          const { trips, currentTrip } = get();

          // Remove from trips list
          const filteredTrips = trips.filter(trip => trip.id !== tripId);

          // Clear current trip if it's the one being deleted
          const updatedCurrentTrip = currentTrip?.id === tripId ? null : currentTrip;

          set({
            trips: filteredTrips,
            currentTrip: updatedCurrentTrip,
            currentTripMembers: updatedCurrentTrip ? get().currentTripMembers : [],
            currentTripEvents: updatedCurrentTrip ? get().currentTripEvents : [],
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to delete trip.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Join a public trip
      joinTrip: async (tripId: string) => {
        set({ isLoading: true, error: null });

        try {
          await TripService.joinTrip(tripId);

          // Refresh user trips and current trip
          await get().fetchUserTrips();
          if (get().currentTrip?.id === tripId) {
            await get().fetchTrip(tripId);
            await get().fetchTripMembers(tripId);
          }

          set({ isLoading: false, error: null });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to join trip.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Leave a trip
      leaveTrip: async (tripId: string) => {
        set({ isLoading: true, error: null });

        try {
          await TripService.leaveTrip(tripId);

          // Remove from trips list and clear current trip if needed
          const { trips, currentTrip } = get();
          const filteredTrips = trips.filter(trip => trip.id !== tripId);
          const updatedCurrentTrip = currentTrip?.id === tripId ? null : currentTrip;

          set({
            trips: filteredTrips,
            currentTrip: updatedCurrentTrip,
            currentTripMembers: updatedCurrentTrip ? get().currentTripMembers : [],
            currentTripEvents: updatedCurrentTrip ? get().currentTripEvents : [],
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to leave trip.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Fetch trip members
      fetchTripMembers: async (tripId: string) => {
        try {
          const members = await TripService.getTripMembers(tripId);
          // Map the response to match TripMember interface
          const mappedMembers: TripMember[] = members.map((member: any) => ({
            id: member.id,
            tripId,
            userId: member.userId,
            role: member.role as MemberRole,
            joinedAt: member.joinedAt,
          }));
          set({ currentTripMembers: mappedMembers });
        } catch (error: any) {
          console.error('Failed to fetch trip members:', error);
        }
      },

      // Invite a member to trip (placeholder)
      inviteMember: async (_tripId: string, _email: string) => {
        set({ isLoading: true, error: null });

        try {
          // Note: TripService.inviteMember doesn't exist yet, this is a placeholder
          // await TripService.inviteMember(tripId, email);
          console.log('Invite member not yet implemented in service');

          // Refresh members list when implemented
          // await get().fetchTripMembers(tripId);

          set({ isLoading: false, error: null });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to invite member.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Remove a member from trip
      removeMember: async (tripId: string, memberId: string) => {
        set({ isLoading: true, error: null });

        try {
          await TripService.removeMember(tripId, memberId);

          // Remove from current members list
          const { currentTripMembers } = get();
          const updatedMembers = currentTripMembers.filter(member => member.id !== memberId);

          set({
            currentTripMembers: updatedMembers,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to remove member.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Update member role
      updateMemberRole: async (tripId: string, memberId: string, role: MemberRole) => {
        set({ isLoading: true, error: null });

        try {
          await TripService.updateMemberRole(tripId, memberId, role);

          // Update in current members list
          const { currentTripMembers } = get();
          const updatedMembers = currentTripMembers.map(member =>
            member.id === memberId ? { ...member, role } : member
          );

          set({
            currentTripMembers: updatedMembers,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to update member role.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Fetch trip events (placeholder - needs event service implementation)
      fetchTripEvents: async (_tripId: string) => {
        try {
          // TODO: Implement when event service is available
          // const events = await EventService.getTripEvents(tripId);
          // set({ currentTripEvents: events });
          console.log('Fetch trip events not yet implemented');
        } catch (error: any) {
          console.error('Failed to fetch trip events:', error);
        }
      },

      // Create event (placeholder)
      createEvent: async (_tripId: string, _eventData: CreateEventForm) => {
        try {
          // TODO: Implement when event service is available
          throw new Error('Event creation not yet implemented');
        } catch (error: any) {
          throw error;
        }
      },

      // Update event (placeholder)
      updateEvent: async (_tripId: string, _eventId: string, _updateData: Partial<Event>) => {
        try {
          // TODO: Implement when event service is available
          throw new Error('Event update not yet implemented');
        } catch (error: any) {
          throw error;
        }
      },

      // Delete event (placeholder)
      deleteEvent: async (_tripId: string, _eventId: string) => {
        try {
          // TODO: Implement when event service is available
          throw new Error('Event deletion not yet implemented');
        } catch (error: any) {
          throw error;
        }
      },

      // Search trips
      searchTrips: async (filters: TripFilters, page = 1) => {
        set({ isSearching: true, error: null });

        try {
          // Note: TripService.searchTrips doesn't exist yet, using placeholder
          // const response = await TripService.searchTrips(filters, page);
          console.log('Search trips not yet implemented in service', { filters, page });

          // Placeholder response
          const response = {
            trips: [],
            totalPages: 0,
          };

          set({
            searchResults: response.trips,
            totalPages: response.totalPages,
            currentPage: page,
            isSearching: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to search trips.';
          set({
            isSearching: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Clear search results
      clearSearch: () => {
        set({
          searchResults: [],
          isSearching: false,
          totalPages: 0,
          currentPage: 1,
        });
      },

      // Set current trip
      setCurrentTrip: (trip: Trip | null) => {
        set({ currentTrip: trip });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Set loading
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Reset store
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'trip-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist trips list, not UI state
      partialize: (state) => ({
        trips: state.trips,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useTrips = () => useTripStore(state => state.trips);
export const useCurrentTrip = () => useTripStore(state => state.currentTrip);
export const useCurrentTripMembers = () => useTripStore(state => state.currentTripMembers);
export const useCurrentTripEvents = () => useTripStore(state => state.currentTripEvents);
export const useTripLoading = () => useTripStore(state => state.isLoading);
export const useTripError = () => useTripStore(state => state.error);
export const useTripSearchResults = () => useTripStore(state => state.searchResults);
export const useIsSearching = () => useTripStore(state => state.isSearching);

// Trip actions selector
export const useTripActions = () => useTripStore(state => ({
  fetchUserTrips: state.fetchUserTrips,
  fetchTrip: state.fetchTrip,
  createTrip: state.createTrip,
  updateTrip: state.updateTrip,
  deleteTrip: state.deleteTrip,
  joinTrip: state.joinTrip,
  leaveTrip: state.leaveTrip,
  fetchTripMembers: state.fetchTripMembers,
  inviteMember: state.inviteMember,
  removeMember: state.removeMember,
  updateMemberRole: state.updateMemberRole,
  searchTrips: state.searchTrips,
  clearSearch: state.clearSearch,
  clearError: state.clearError,
}));