// User types
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserInput {
  email: string
  name: string
  password: string
}

export interface UpdateUserInput {
  name?: string
  avatar?: string
}

// Trip types
export interface Trip {
  id: string
  title: string
  description?: string
  location: Location
  startDate: Date
  endDate: Date
  isPublic: boolean
  hostId: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTripInput {
  title: string
  description?: string
  location: LocationInput
  startDate: string
  endDate: string
  isPublic: boolean
}

export interface UpdateTripInput {
  title?: string
  description?: string
  location?: LocationInput
  startDate?: string
  endDate?: string
  isPublic?: boolean
}

// Location types
export interface Location {
  name: string
  latitude: number
  longitude: number
  address?: string
}

export interface LocationInput {
  name: string
  latitude: number
  longitude: number
  address?: string
}

// Trip member types
export interface TripMember {
  id: string
  tripId: string
  userId: string
  role: MemberRole
  joinedAt: Date
}

export enum MemberRole {
  HOST = 'HOST',
  CO_HOST = 'CO_HOST',
  MEMBER = 'MEMBER'
}

export interface AddMemberInput {
  email: string
  role?: MemberRole
}

export interface UpdateMemberRoleInput {
  role: MemberRole
}

// Event types
export interface Event {
  id: string
  tripId: string
  title: string
  description?: string
  location?: Location
  startTime: Date
  endTime: Date
  isAllDay: boolean
  category: EventCategory
  estimatedCost?: number
  currency?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export enum EventCategory {
  ACCOMMODATION = 'ACCOMMODATION',
  TRANSPORTATION = 'TRANSPORTATION',
  ACTIVITY = 'ACTIVITY',
  DINING = 'DINING',
  OTHER = 'OTHER'
}

export interface CreateEventInput {
  title: string
  description?: string
  location?: LocationInput
  startTime: string
  endTime: string
  isAllDay: boolean
  category: EventCategory
  estimatedCost?: number
  currency?: string
}

export interface UpdateEventInput {
  title?: string
  description?: string
  location?: LocationInput
  startTime?: string
  endTime?: string
  isAllDay?: boolean
  category?: EventCategory
  estimatedCost?: number
  currency?: string
}