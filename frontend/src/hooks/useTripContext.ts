/**
 * useTripContext - Custom hook for trip data and user permissions
 * Provides trip data, user role, and permission checks for trip components
 */

import { createContext, useContext } from 'react';
import { useTripQuery, useTripMembersQuery } from '../queries/hooks';
import { useAuthUser } from '../stores/authStore';
import { MemberRole } from '../types';
import type { Trip, User } from '../types';

interface TripMember {
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
}

interface TripContextType {
  trip: Trip | undefined;
  members: TripMember[] | undefined;
  currentUser: User | null;
  userRole: MemberRole | undefined;
  userMembership: TripMember | undefined;
  isLoading: boolean;
  error: Error | null;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canManageMembers: boolean;
    canViewSettings: boolean;
    canApprove: boolean;
    isHost: boolean;
    isCoHost: boolean;
    isMember: boolean;
  };
}

export const TripContext = createContext<TripContextType | null>(null);

export function useTripContext() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTripContext must be used within a TripContextProvider');
  }
  return context;
}

/**
 * Hook that provides trip data and user permissions for a specific trip
 * @param tripId - The ID of the trip to load data for
 * @returns Trip context data including permissions
 */
export function useTripData(tripId: string) {
  const currentUser = useAuthUser();

  const {
    data: trip,
    isLoading: tripLoading,
    error: tripError,
  } = useTripQuery(tripId, !!tripId);

  const {
    data: members,
    isLoading: membersLoading,
  } = useTripMembersQuery(tripId, !!tripId);

  // Determine user's role in this trip
  const userMembership = members?.find((m) => m.userId === currentUser?.id);
  const userRole = userMembership?.role as MemberRole | undefined;

  // Calculate permissions based on user role
  const permissions = {
    canEdit: userRole === MemberRole.HOST || userRole === MemberRole.CO_HOST,
    canDelete: userRole === MemberRole.HOST,
    canManageMembers: userRole === MemberRole.HOST || userRole === MemberRole.CO_HOST,
    canViewSettings: userRole === MemberRole.HOST,
    canApprove: userRole === MemberRole.HOST || userRole === MemberRole.CO_HOST,
    isHost: userRole === MemberRole.HOST,
    isCoHost: userRole === MemberRole.CO_HOST,
    isMember: userRole === MemberRole.MEMBER,
  };

  return {
    trip,
    members,
    currentUser,
    userRole,
    userMembership,
    isLoading: tripLoading || membersLoading,
    error: tripError,
    permissions,
  };
}

/**
 * Utility function to check if a user has a specific permission
 * @param userRole - The user's role in the trip
 * @param permission - The permission to check
 * @returns Boolean indicating if the user has the permission
 */
export function hasPermission(
  userRole: MemberRole | undefined,
  permission: 'edit' | 'delete' | 'manageMembers' | 'viewSettings'
): boolean {
  if (!userRole) return false;

  switch (permission) {
    case 'edit':
      return userRole === MemberRole.HOST || userRole === MemberRole.CO_HOST;
    case 'delete':
      return userRole === MemberRole.HOST;
    case 'manageMembers':
      return userRole === MemberRole.HOST || userRole === MemberRole.CO_HOST;
    case 'viewSettings':
      return userRole === MemberRole.HOST;
    default:
      return false;
  }
}