// Common types for the frontend application

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface Trip {
  id: string
  title: string
  description?: string
  location: Location
  startDate: string
  endDate: string
  isPublic: boolean
  hostId: string
  createdAt: string
  updatedAt: string
}

export interface Location {
  name: string
  latitude: number
  longitude: number
  address?: string
}

export interface TripMember {
  id: string
  tripId: string
  userId: string
  role: MemberRole
  joinedAt: string
}

export enum MemberRole {
  HOST = 'HOST',
  CO_HOST = 'CO_HOST',
  MEMBER = 'MEMBER'
}

export interface Event {
  id: string
  tripId: string
  title: string
  description?: string
  location?: Location
  startTime: string
  endTime: string
  isAllDay: boolean
  category: EventCategory
  estimatedCost?: number
  currency?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export enum EventCategory {
  ACCOMMODATION = 'ACCOMMODATION',
  TRANSPORTATION = 'TRANSPORTATION',
  ACTIVITY = 'ACTIVITY',
  DINING = 'DINING',
  OTHER = 'OTHER'
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Form types
export interface CreateTripForm {
  title: string
  description?: string
  location: {
    name: string
    latitude: number
    longitude: number
  }
  startDate: string
  endDate: string
  isPublic: boolean
}

export interface CreateEventForm {
  title: string
  description?: string
  location?: {
    name: string
    latitude: number
    longitude: number
  }
  startTime: string
  endTime: string
  isAllDay: boolean
  category: EventCategory
  estimatedCost?: number
  currency?: string
}