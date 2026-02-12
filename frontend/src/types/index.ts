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
  inviteCode?: string
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

export interface EventLocation {
  address?: string
  city?: string
  state?: string
  country?: string
  coordinates?: {
    lat: number
    lng: number
  }
  placeId?: string
  venue?: string
}

export interface Event {
  id: string
  tripId: string
  title: string
  description?: string
  location?: EventLocation
  startTime?: string
  endTime?: string
  isAllDay: boolean
  status: EventStatus
  category?: string
  estimatedCost?: number
  currency?: string
  suggestedById: string
  approvedById?: string
  suggestedBy?: {
    id: string
    email: string
    displayName?: string
    username?: string
  }
  approvedBy?: {
    id: string
    email: string
    displayName?: string
    username?: string
  }
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export enum EventCategory {
  ACCOMMODATION = 'ACCOMMODATION',
  TRANSPORTATION = 'TRANSPORTATION',
  ACTIVITY = 'ACTIVITY',
  DINING = 'DINING',
  MEETING = 'MEETING',
  OTHER = 'OTHER'
}

export enum EventStatus {
  PROPOSED = 'PROPOSED',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED'
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
  tripId: string
  title: string
  description?: string
  location?: EventLocation
  startTime?: string
  endTime?: string
  isAllDay: boolean
  category?: string
  estimatedCost?: number
  currency?: string
}

export interface UpdateEventForm {
  title?: string
  description?: string
  location?: EventLocation
  startTime?: string
  endTime?: string
  isAllDay?: boolean
  category?: string
  estimatedCost?: number
  currency?: string
}

// Item types
export enum ItemType {
  RECOMMENDED = 'RECOMMENDED',
  SHARED = 'SHARED'
}

export enum ItemCategory {
  FOOD = 'FOOD',
  EQUIPMENT = 'EQUIPMENT',
  SUPPLIES = 'SUPPLIES',
  CLOTHING = 'CLOTHING',
  ELECTRONICS = 'ELECTRONICS',
  TRANSPORTATION = 'TRANSPORTATION',
  ENTERTAINMENT = 'ENTERTAINMENT',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER'
}

export enum ClaimStatus {
  CLAIMED = 'CLAIMED',
  BROUGHT = 'BROUGHT',
  CANCELLED = 'CANCELLED'
}

export interface ItemClaim {
  id: string
  itemId: string
  userId: string
  user?: {
    id: string
    email: string
    displayName?: string
    username?: string
  }
  quantity: number
  status: ClaimStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: string
  tripId: string
  name: string
  description?: string
  category?: ItemCategory
  type: ItemType
  quantityNeeded: number
  isEssential: boolean
  createdById: string
  createdBy?: {
    id: string
    email: string
    displayName?: string
    username?: string
  }
  claims?: ItemClaim[]
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateItemForm {
  tripId: string
  name: string
  description?: string
  category?: ItemCategory
  type: ItemType
  quantityNeeded?: number
  isEssential?: boolean
}

export interface UpdateItemForm {
  name?: string
  description?: string
  category?: ItemCategory
  type?: ItemType
  quantityNeeded?: number
  isEssential?: boolean
}

export interface CreateClaimForm {
  quantity?: number
  notes?: string
}

export interface UpdateClaimForm {
  quantity?: number
  status?: ClaimStatus
  notes?: string
}