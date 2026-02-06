# Group Trip Planner - Phase 1 Implementation Design
*Comprehensive technical specification by EmeraldOwl*

## Overview

This document provides a complete implementation blueprint for Phase 1 of the Group Trip Planner MVP, covering 8-10 weeks of development work. Every component, model, API endpoint, and implementation detail is specified to enable immediate development start.

**Phase 1 Scope:**
- User authentication and registration
- Basic trip creation and management
- Simple schedule planning (add/view events)
- Basic item lists (recommended only)
- Email invitations and notifications
- Docker deployment setup

## Technology Stack & Dependencies

### Backend Dependencies (package.json)
```json
{
  "name": "group-planner-api",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "typescript": "^5.2.2",
    "@types/node": "^20.8.0",
    "prisma": "^5.4.2",
    "@prisma/client": "^5.4.2",
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.4",
    "jsonwebtoken": "^9.0.2",
    "@types/jsonwebtoken": "^9.0.3",
    "joi": "^17.10.2",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "@types/cors": "^2.8.14",
    "compression": "^1.7.4",
    "@types/compression": "^1.7.3",
    "express-rate-limit": "^7.1.0",
    "nodemailer": "^6.9.5",
    "@types/nodemailer": "^6.4.11",
    "redis": "^4.6.10",
    "socket.io": "^4.7.2",
    "uuid": "^9.0.1",
    "@types/uuid": "^9.0.5",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "@types/multer": "^1.4.8",
    "sharp": "^0.32.6",
    "cron": "^3.1.6"
  },
  "devDependencies": {
    "tsx": "^3.14.0",
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.14",
    "eslint": "^8.50.0",
    "@typescript-eslint/eslint-plugin": "^6.7.2",
    "@typescript-eslint/parser": "^6.7.2",
    "prettier": "^3.0.3"
  }
}
```

### Frontend Dependencies (package.json)
```json
{
  "name": "group-planner-web",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.2.2",
    "@types/react": "^18.2.25",
    "@types/react-dom": "^18.2.11",
    "@mui/material": "^5.14.10",
    "@mui/icons-material": "^5.14.9",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "react-router-dom": "^6.16.0",
    "@tanstack/react-query": "^4.35.3",
    "react-hook-form": "^7.47.0",
    "@hookform/resolvers": "^3.3.1",
    "yup": "^1.3.3",
    "axios": "^1.5.1",
    "socket.io-client": "^4.7.2",
    "date-fns": "^2.30.0",
    "react-datepicker": "^4.18.0",
    "@types/react-datepicker": "^4.15.0",
    "react-hot-toast": "^2.4.1",
    "zustand": "^4.4.3",
    "@dnd-kit/core": "^6.0.8",
    "@dnd-kit/sortable": "^7.0.2",
    "react-dropzone": "^14.2.3"
  },
  "devDependencies": {
    "vite": "^4.4.9",
    "@vitejs/plugin-react": "^4.1.0",
    "eslint": "^8.50.0",
    "@typescript-eslint/eslint-plugin": "^6.7.2",
    "@typescript-eslint/parser": "^6.7.2",
    "prettier": "^3.0.3",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.1.3",
    "vitest": "^0.34.6",
    "jsdom": "^22.1.0"
  }
}
```

## Database Design & Models

### Prisma Schema (schema.prisma)
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  username      String   @unique
  firstName     String
  lastName      String
  passwordHash  String   @map("password_hash")

  // Profile information
  profileData   Json     @default("{}")
  preferences   Json     @default("{}")

  // Email verification
  emailVerified Boolean  @default(false) @map("email_verified")
  emailVerificationToken String? @map("email_verification_token")

  // Password reset
  passwordResetToken String? @map("password_reset_token")
  passwordResetExpires DateTime? @map("password_reset_expires")

  // Timestamps
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  lastLoginAt   DateTime? @map("last_login_at")

  // Relationships
  hostedTrips   Trip[]   @relation("TripHost")
  tripMembers   TripMember[]
  events        Event[]  @relation("EventCreator")
  items         Item[]   @relation("ItemCreator")
  itemClaims    ItemClaim[]
  notifications Notification[]

  @@map("users")
}

model Trip {
  id          String    @id @default(uuid())
  title       String
  description String?
  location    Json?     // LocationData structure

  // Dates
  startDate   DateTime? @map("start_date")
  endDate     DateTime? @map("end_date")

  // Host relationship
  hostId      String    @map("host_id")
  host        User      @relation("TripHost", fields: [hostId], references: [id], onDelete: Cascade)

  // Settings and metadata
  settings    Json      @default("{}")
  metadata    Json      @default("{}")

  // Trip status
  status      TripStatus @default(PLANNING)

  // Invitation settings
  inviteCode  String?   @unique @map("invite_code")
  inviteExpiresAt DateTime? @map("invite_expires_at")
  isPublic    Boolean   @default(false) @map("is_public")

  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relationships
  members     TripMember[]
  events      Event[]
  items       Item[]
  notifications Notification[]

  @@map("trips")
}

enum TripStatus {
  PLANNING
  ACTIVE
  COMPLETED
  CANCELLED
}

model TripMember {
  id       String     @id @default(uuid())
  tripId   String     @map("trip_id")
  userId   String     @map("user_id")
  role     MemberRole @default(MEMBER)
  status   MemberStatus @default(PENDING)

  // Invitation details
  invitedAt DateTime? @map("invited_at")
  joinedAt  DateTime? @map("joined_at")
  invitedBy String?   @map("invited_by")

  // Member preferences
  preferences Json @default("{}")

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relationships
  trip     Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  user     User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tripId, userId])
  @@map("trip_members")
}

enum MemberRole {
  HOST
  CO_HOST
  MEMBER
}

enum MemberStatus {
  PENDING
  ACCEPTED
  DECLINED
  REMOVED
}

model Event {
  id          String    @id @default(uuid())
  tripId      String    @map("trip_id")
  title       String
  description String?
  location    Json?     // LocationData structure

  // Timing
  startTime   DateTime? @map("start_time")
  endTime     DateTime? @map("end_time")
  isAllDay    Boolean   @default(false) @map("is_all_day")

  // Event status
  status      EventStatus @default(PROPOSED)
  priority    EventPriority @default(MEDIUM)

  // Creation and approval
  createdById String    @map("created_by_id")
  approvedById String?  @map("approved_by_id")
  approvedAt  DateTime? @map("approved_at")

  // Event metadata
  category    String?
  tags        String[]  @default([])
  metadata    Json      @default("{}")

  // Cost estimation (for Phase 1, basic field)
  estimatedCost Decimal? @map("estimated_cost") @db.Decimal(10,2)
  currency    String?   @default("USD")

  // Timestamps
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relationships
  trip        Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  createdBy   User      @relation("EventCreator", fields: [createdById], references: [id], onDelete: Cascade)

  @@map("events")
}

enum EventStatus {
  PROPOSED
  APPROVED
  CANCELLED
  COMPLETED
}

enum EventPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model Item {
  id          String     @id @default(uuid())
  tripId      String     @map("trip_id")
  name        String
  description String?
  category    String?

  // Item type and quantities
  type        ItemType
  quantityNeeded Int     @default(1) @map("quantity_needed")
  quantityClaimed Int    @default(0) @map("quantity_claimed")

  // Item priority and status
  priority    Int        @default(0)
  isEssential Boolean    @default(false) @map("is_essential")

  // Creation details
  createdById String     @map("created_by_id")

  // Cost estimation
  estimatedCost Decimal? @map("estimated_cost") @db.Decimal(10,2)
  currency    String?    @default("USD")

  // Additional metadata
  notes       String?
  metadata    Json       @default("{}")

  // Timestamps
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  // Relationships
  trip        Trip       @relation(fields: [tripId], references: [id], onDelete: Cascade)
  createdBy   User       @relation("ItemCreator", fields: [createdById], references: [id], onDelete: Cascade)
  claims      ItemClaim[]

  @@map("items")
}

enum ItemType {
  RECOMMENDED  // Host-recommended personal items
  SHARED      // Community items that can be claimed
}

model ItemClaim {
  id         String   @id @default(uuid())
  itemId     String   @map("item_id")
  userId     String   @map("user_id")
  quantity   Int      @default(1)

  // Claim details
  notes      String?
  status     ClaimStatus @default(CLAIMED)

  // Timestamps
  claimedAt  DateTime @default(now()) @map("claimed_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relationships
  item       Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([itemId, userId])
  @@map("item_claims")
}

enum ClaimStatus {
  CLAIMED
  BROUGHT
  CANCELLED
}

model Notification {
  id          String           @id @default(uuid())
  userId      String           @map("user_id")
  tripId      String?          @map("trip_id")
  type        NotificationType
  title       String
  message     String
  data        Json             @default("{}")

  // Notification status
  isRead      Boolean          @default(false) @map("is_read")
  readAt      DateTime?        @map("read_at")

  // Email notification
  emailSent   Boolean          @default(false) @map("email_sent")
  emailSentAt DateTime?        @map("email_sent_at")

  // Timestamps
  createdAt   DateTime         @default(now()) @map("created_at")

  // Relationships
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  trip        Trip?            @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

enum NotificationType {
  TRIP_INVITATION
  TRIP_UPDATE
  EVENT_CREATED
  EVENT_UPDATED
  ITEM_CLAIMED
  MEMBER_JOINED
  GENERAL
}

// Extension tables for future features
model TripExtension {
  id            String   @id @default(uuid())
  tripId        String   @map("trip_id")
  extensionType String   @map("extension_type")
  data          Json
  version       String   @default("1.0.0")
  active        Boolean  @default(true)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  trip          Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@unique([tripId, extensionType])
  @@map("trip_extensions")
}

model UserExtension {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  extensionType String   @map("extension_type")
  data          Json
  version       String   @default("1.0.0")
  active        Boolean  @default(true)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, extensionType])
  @@map("user_extensions")
}
```

## Backend Architecture

### Directory Structure
```
backend/
├── src/
│   ├── controllers/          # Route handlers
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── trips.controller.ts
│   │   ├── events.controller.ts
│   │   ├── items.controller.ts
│   │   └── notifications.controller.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── errorHandler.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── cors.middleware.ts
│   ├── routes/              # Route definitions
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── trips.routes.ts
│   │   ├── events.routes.ts
│   │   ├── items.routes.ts
│   │   └── notifications.routes.ts
│   ├── services/            # Business logic
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   ├── notification.service.ts
│   │   ├── trip.service.ts
│   │   ├── event.service.ts
│   │   └── item.service.ts
│   ├── utils/               # Utility functions
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── logger.ts
│   │   ├── jwt.ts
│   │   ├── validation.ts
│   │   ├── email.ts
│   │   └── constants.ts
│   ├── types/               # TypeScript types
│   │   ├── express.d.ts
│   │   ├── auth.types.ts
│   │   ├── trip.types.ts
│   │   └── api.types.ts
│   ├── sockets/             # WebSocket handlers
│   │   ├── index.ts
│   │   ├── trip.sockets.ts
│   │   └── notification.sockets.ts
│   └── app.ts               # Express app setup
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── auth.test.ts
│   ├── trips.test.ts
│   └── setup.ts
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Core Types (types/auth.types.ts)
```typescript
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
}
```

### Trip Types (types/trip.types.ts)
```typescript
export interface LocationData {
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  timezone?: string;
  country?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  metadata?: {
    elevation?: number;
    accuracy?: number;
    source?: 'user_input' | 'gps' | 'geocoded';
  };
}

export interface CreateTripRequest {
  title: string;
  description?: string;
  location?: LocationData;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
}

export interface UpdateTripRequest {
  title?: string;
  description?: string;
  location?: LocationData;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface TripDetails {
  id: string;
  title: string;
  description?: string;
  location?: LocationData;
  startDate?: string;
  endDate?: string;
  status: string;
  isPublic: boolean;
  inviteCode?: string;
  host: UserProfile;
  members: TripMember[];
  events: EventSummary[];
  items: ItemSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface TripMember {
  id: string;
  role: 'HOST' | 'CO_HOST' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED';
  user: UserProfile;
  joinedAt?: string;
  invitedAt?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  location?: LocationData;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  category?: string;
  estimatedCost?: number;
  currency?: string;
}

export interface EventSummary {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  status: 'PROPOSED' | 'APPROVED' | 'CANCELLED' | 'COMPLETED';
  createdBy: UserProfile;
  createdAt: string;
}

export interface CreateItemRequest {
  name: string;
  description?: string;
  category?: string;
  type: 'RECOMMENDED' | 'SHARED';
  quantityNeeded?: number;
  estimatedCost?: number;
  currency?: string;
  notes?: string;
  isEssential?: boolean;
}

export interface ItemSummary {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type: 'RECOMMENDED' | 'SHARED';
  quantityNeeded: number;
  quantityClaimed: number;
  isEssential: boolean;
  estimatedCost?: number;
  currency?: string;
  createdBy: UserProfile;
  claims: ItemClaimSummary[];
  createdAt: string;
}

export interface ItemClaimSummary {
  id: string;
  quantity: number;
  status: 'CLAIMED' | 'BROUGHT' | 'CANCELLED';
  user: UserProfile;
  claimedAt: string;
  notes?: string;
}
```

### API Response Types (types/api.types.ts)
```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  pagination?: PaginationMeta;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export interface TripFilters extends PaginationQuery {
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  role?: 'HOST' | 'MEMBER';
  upcoming?: boolean;
}
```

### Authentication Controller (controllers/auth.controller.ts)
```typescript
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { ApiResponse, LoginRequest, RegisterRequest, PasswordResetRequest, PasswordResetConfirm } from '../types';
import { logger } from '../utils/logger';
import { validateRequest } from '../utils/validation';
import Joi from 'joi';

export class AuthController {
  private authService = new AuthService();
  private emailService = new EmailService();

  // Registration validation schema
  private registerSchema = Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
  });

  // Login validation schema
  private loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = this.registerSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }))
        } as ApiResponse);
        return;
      }

      const registerData: RegisterRequest = value;

      // Check if user already exists
      const existingUser = await this.authService.findUserByEmailOrUsername(
        registerData.email,
        registerData.username
      );

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: existingUser.email === registerData.email
            ? 'Email already registered'
            : 'Username already taken'
        } as ApiResponse);
        return;
      }

      // Create new user
      const result = await this.authService.registerUser(registerData);

      // Send verification email
      await this.emailService.sendVerificationEmail(
        result.user.email,
        result.user.firstName,
        result.user.id
      );

      logger.info(`New user registered: ${result.user.email}`);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful. Please check your email to verify your account.'
      } as ApiResponse);

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = this.loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        } as ApiResponse);
        return;
      }

      const loginData: LoginRequest = value;
      const result = await this.authService.loginUser(loginData);

      if (!result) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        } as ApiResponse);
        return;
      }

      logger.info(`User logged in: ${result.user.email}`);

      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      } as ApiResponse);

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token required'
        } as ApiResponse);
        return;
      }

      const result = await this.authService.refreshAccessToken(refreshToken);

      if (!result) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      } as ApiResponse);

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;

      const result = await this.authService.verifyEmail(token);

      if (!result) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        message: 'Email verified successfully'
      } as ApiResponse);

    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Email verification failed',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email }: PasswordResetRequest = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required'
        } as ApiResponse);
        return;
      }

      await this.authService.requestPasswordReset(email);

      // Always return success for security (don't reveal if email exists)
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      } as ApiResponse);

    } catch (error) {
      logger.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset request failed',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password }: PasswordResetConfirm = req.body;

      if (!token || !password) {
        res.status(400).json({
          success: false,
          message: 'Token and password are required'
        } as ApiResponse);
        return;
      }

      // Validate password strength
      const passwordValidation = Joi.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
        .validate(password);

      if (passwordValidation.error) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
        } as ApiResponse);
        return;
      }

      const result = await this.authService.resetPassword(token, password);

      if (!result) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        message: 'Password reset successful'
      } as ApiResponse);

    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await this.authService.revokeRefreshToken(refreshToken);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      } as ApiResponse);

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };
}
```

### Trip Controller (controllers/trips.controller.ts)
```typescript
import { Request, Response } from 'express';
import { TripService } from '../services/trip.service';
import { NotificationService } from '../services/notification.service';
import { ApiResponse, CreateTripRequest, UpdateTripRequest, TripFilters } from '../types';
import { AuthenticatedRequest } from '../types/express';
import { logger } from '../utils/logger';
import Joi from 'joi';

export class TripController {
  private tripService = new TripService();
  private notificationService = new NotificationService();

  private createTripSchema = Joi.object({
    title: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(1000).optional(),
    location: Joi.object({
      address: Joi.string().required(),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      }).optional(),
      timezone: Joi.string().optional(),
      country: Joi.string().optional(),
      region: Joi.string().optional(),
      city: Joi.string().optional(),
      postalCode: Joi.string().optional()
    }).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    isPublic: Joi.boolean().optional()
  });

  public createTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { error, value } = this.createTripSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        } as ApiResponse);
        return;
      }

      const createTripData: CreateTripRequest = value;
      const userId = req.user!.userId;

      const trip = await this.tripService.createTrip(userId, createTripData);

      logger.info(`Trip created: ${trip.id} by user ${userId}`);

      res.status(201).json({
        success: true,
        data: trip,
        message: 'Trip created successfully'
      } as ApiResponse);

    } catch (error) {
      logger.error('Create trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create trip',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public getTrips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const filters: TripFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as any,
        role: req.query.role as any,
        upcoming: req.query.upcoming === 'true',
        search: req.query.search as string,
        sort: req.query.sort as string || 'createdAt',
        order: req.query.order as 'asc' | 'desc' || 'desc'
      };

      const result = await this.tripService.getUserTrips(userId, filters);

      res.json({
        success: true,
        data: result.trips,
        pagination: result.pagination
      } as ApiResponse);

    } catch (error) {
      logger.error('Get trips error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve trips',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public getTripById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.userId;

      const trip = await this.tripService.getTripById(tripId, userId);

      if (!trip) {
        res.status(404).json({
          success: false,
          message: 'Trip not found or access denied'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: trip
      } as ApiResponse);

    } catch (error) {
      logger.error('Get trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve trip',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public updateTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.userId;

      // Validate update data
      const updateSchema = this.createTripSchema.fork([
        'title'
      ], (schema) => schema.optional());

      const { error, value } = updateSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        } as ApiResponse);
        return;
      }

      const updateData: UpdateTripRequest = value;
      const trip = await this.tripService.updateTrip(tripId, userId, updateData);

      if (!trip) {
        res.status(404).json({
          success: false,
          message: 'Trip not found or access denied'
        } as ApiResponse);
        return;
      }

      // Notify trip members of updates
      await this.notificationService.notifyTripUpdate(trip.id, userId);

      logger.info(`Trip updated: ${tripId} by user ${userId}`);

      res.json({
        success: true,
        data: trip,
        message: 'Trip updated successfully'
      } as ApiResponse);

    } catch (error) {
      logger.error('Update trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update trip',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public deleteTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.userId;

      const result = await this.tripService.deleteTrip(tripId, userId);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Trip not found or access denied'
        } as ApiResponse);
        return;
      }

      logger.info(`Trip deleted: ${tripId} by user ${userId}`);

      res.json({
        success: true,
        message: 'Trip deleted successfully'
      } as ApiResponse);

    } catch (error) {
      logger.error('Delete trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete trip',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public generateInviteCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.userId;

      const inviteCode = await this.tripService.generateInviteCode(tripId, userId);

      if (!inviteCode) {
        res.status(404).json({
          success: false,
          message: 'Trip not found or access denied'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: { inviteCode },
        message: 'Invite code generated successfully'
      } as ApiResponse);

    } catch (error) {
      logger.error('Generate invite code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate invite code',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };

  public joinTripByCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { inviteCode } = req.body;
      const userId = req.user!.userId;

      if (!inviteCode) {
        res.status(400).json({
          success: false,
          message: 'Invite code is required'
        } as ApiResponse);
        return;
      }

      const result = await this.tripService.joinTripByInviteCode(inviteCode, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse);
        return;
      }

      // Notify trip members
      await this.notificationService.notifyMemberJoined(result.trip!.id, userId);

      logger.info(`User ${userId} joined trip ${result.trip!.id} via invite code`);

      res.json({
        success: true,
        data: result.trip,
        message: 'Successfully joined trip'
      } as ApiResponse);

    } catch (error) {
      logger.error('Join trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join trip',
        error: 'Internal server error'
      } as ApiResponse);
    }
  };
}
```

### Email Service (services/email.service.ts)
```typescript
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Group Trip Planner" <noreply@groupplanner.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Email sending failed:', error);
      return false;
    }
  }

  public async sendVerificationEmail(
    email: string,
    firstName: string,
    userId: string
  ): Promise<boolean> {
    const verificationUrl = `${process.env.APP_URL}/verify-email/${userId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Group Trip Planner!</h2>
        <p>Hi ${firstName},</p>
        <p>Thanks for signing up! Please verify your email address to get started.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background-color: #4CAF50; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't sign up for Group Trip Planner, you can safely ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Group Trip Planner - Making trip planning effortless
        </p>
      </div>
    `;

    const text = `
      Welcome to Group Trip Planner!

      Hi ${firstName},

      Thanks for signing up! Please verify your email address by visiting:
      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't sign up for Group Trip Planner, you can safely ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Group Trip Planner - Verify your email',
      html,
      text,
    });
  }

  public async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${process.env.APP_URL}/reset-password/${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${firstName},</p>
        <p>You requested a password reset for your Group Trip Planner account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #2196F3; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Group Trip Planner - Making trip planning effortless
        </p>
      </div>
    `;

    const text = `
      Password Reset Request

      Hi ${firstName},

      You requested a password reset for your Group Trip Planner account.

      Reset your password by visiting: ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request a password reset, you can safely ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Group Trip Planner - Password Reset',
      html,
      text,
    });
  }

  public async sendTripInvitationEmail(
    email: string,
    firstName: string,
    tripTitle: string,
    inviterName: string,
    inviteUrl: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're Invited to Join a Trip!</h2>
        <p>Hi ${firstName},</p>
        <p>${inviterName} has invited you to join their trip: <strong>${tripTitle}</strong></p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}"
             style="background-color: #FF9800; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Join Trip
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>Don't have an account? No problem! You can sign up when you click the link.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Group Trip Planner - Making trip planning effortless
        </p>
      </div>
    `;

    const text = `
      You're Invited to Join a Trip!

      Hi ${firstName},

      ${inviterName} has invited you to join their trip: ${tripTitle}

      Join the trip by visiting: ${inviteUrl}

      Don't have an account? No problem! You can sign up when you click the link.
    `;

    return this.sendEmail({
      to: email,
      subject: `You're invited to join ${tripTitle}`,
      html,
      text,
    });
  }
}
```

## Frontend Architecture

### Directory Structure
```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── PasswordResetForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── trips/
│   │   │   ├── TripCard.tsx
│   │   │   ├── TripList.tsx
│   │   │   ├── TripForm.tsx
│   │   │   ├── TripDetails.tsx
│   │   │   ├── MemberList.tsx
│   │   │   └── InviteModal.tsx
│   │   ├── events/
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventList.tsx
│   │   │   ├── EventForm.tsx
│   │   │   ├── Calendar.tsx
│   │   │   └── Timeline.tsx
│   │   ├── items/
│   │   │   ├── ItemCard.tsx
│   │   │   ├── ItemList.tsx
│   │   │   ├── ItemForm.tsx
│   │   │   └── ClaimButton.tsx
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── LocationInput.tsx
│   │   │   └── FileUpload.tsx
│   │   └── notifications/
│   │       ├── NotificationBell.tsx
│   │       ├── NotificationList.tsx
│   │       └── NotificationCard.tsx
│   ├── pages/               # Page components
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── VerifyEmailPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── trips/
│   │   │   ├── TripsPage.tsx
│   │   │   ├── TripDetailsPage.tsx
│   │   │   ├── CreateTripPage.tsx
│   │   │   └── JoinTripPage.tsx
│   │   ├── profile/
│   │   │   └── ProfilePage.tsx
│   │   └── NotFoundPage.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useTrips.ts
│   │   ├── useEvents.ts
│   │   ├── useItems.ts
│   │   ├── useNotifications.ts
│   │   ├── useSocket.ts
│   │   └── useLocalStorage.ts
│   ├── services/            # API services
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── trips.service.ts
│   │   ├── events.service.ts
│   │   ├── items.service.ts
│   │   └── notifications.service.ts
│   ├── store/               # State management
│   │   ├── authStore.ts
│   │   ├── tripStore.ts
│   │   ├── notificationStore.ts
│   │   └── uiStore.ts
│   ├── types/               # TypeScript types
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   ├── trip.types.ts
│   │   └── ui.types.ts
│   ├── utils/               # Utility functions
│   │   ├── constants.ts
│   │   ├── validation.ts
│   │   ├── format.ts
│   │   ├── storage.ts
│   │   └── socket.ts
│   ├── styles/              # Styling
│   │   ├── theme.ts
│   │   ├── globals.css
│   │   └── components.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
│   ├── index.html
│   └── favicon.ico
├── Dockerfile
└── package.json
```

### Main App Component (App.tsx)
```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { theme } from './styles/theme';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TripsPage } from './pages/trips/TripsPage';
import { TripDetailsPage } from './pages/trips/TripDetailsPage';
import { CreateTripPage } from './pages/trips/CreateTripPage';
import { JoinTripPage } from './pages/trips/JoinTripPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Services
import { SocketProvider } from './services/socket.service';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/join/:inviteCode" element={<JoinTripPage />} />

              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<DashboardPage />} />
                <Route path="trips" element={<TripsPage />} />
                <Route path="trips/new" element={<CreateTripPage />} />
                <Route path="trips/:tripId" element={<TripDetailsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
```

### Auth Store (store/authStore.ts)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens } from '../types/auth.types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, tokens: AuthTokens) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user: User, tokens: AuthTokens) => {
        set({
          user,
          tokens,
          isAuthenticated: true,
        });
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### Trip Details Page (pages/trips/TripDetailsPage.tsx)
```typescript
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { tripsService } from '../../services/trips.service';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { EventList } from '../../components/events/EventList';
import { ItemList } from '../../components/items/ItemList';
import { MemberList } from '../../components/trips/MemberList';
import { InviteModal } from '../../components/trips/InviteModal';
import { useAuthStore } from '../../store/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const TripDetailsPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const {
    data: trip,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsService.getTripById(tripId!),
    enabled: !!tripId,
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const isHost = trip && user && trip.host.id === user.id;
  const isMember = trip && user && trip.members.some(m => m.user.id === user.id);

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" py={4}>
          <LoadingSpinner />
        </Box>
      </Container>
    );
  }

  if (error || !trip) {
    return (
      <Container maxWidth="lg">
        <ErrorMessage
          message="Failed to load trip details"
          onRetry={refetch}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        {/* Trip Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="between" alignItems="flex-start">
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Typography variant="h4" component="h1">
                  {trip.title}
                </Typography>
                <Chip
                  label={trip.status}
                  color={trip.status === 'ACTIVE' ? 'primary' : 'default'}
                  size="small"
                />
              </Box>

              {trip.description && (
                <Typography variant="body1" color="text.secondary" mb={2}>
                  {trip.description}
                </Typography>
              )}

              <Grid container spacing={2}>
                {trip.location && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationIcon color="action" />
                      <Typography variant="body2">
                        {trip.location.address}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {trip.startDate && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarIcon color="action" />
                      <Typography variant="body2">
                        {format(new Date(trip.startDate), 'MMM dd, yyyy')}
                        {trip.endDate && ` - ${format(new Date(trip.endDate), 'MMM dd, yyyy')}`}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12} sm={6} md={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PeopleIcon color="action" />
                    <Typography variant="body2">
                      {trip.members.length} member{trip.members.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {(isHost || isMember) && (
              <Box>
                <IconButton onClick={handleMenuClick}>
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={() => setInviteModalOpen(true)}>
                    <ShareIcon sx={{ mr: 1 }} />
                    Invite Members
                  </MenuItem>
                  {isHost && (
                    <MenuItem onClick={handleMenuClose}>
                      <EditIcon sx={{ mr: 1 }} />
                      Edit Trip
                    </MenuItem>
                  )}
                  {isHost && (
                    <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
                      <DeleteIcon sx={{ mr: 1 }} />
                      Delete Trip
                    </MenuItem>
                  )}
                </Menu>
              </Box>
            )}
          </Box>

          {/* Host Information */}
          <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Hosted by
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar>
                {trip.host.firstName[0]}{trip.host.lastName[0]}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {trip.host.firstName} {trip.host.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{trip.host.username}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Navigation Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab
              label="Schedule"
              icon={<CalendarIcon />}
              iconPosition="start"
            />
            <Tab
              label="Items"
              icon={<AssignmentIcon />}
              iconPosition="start"
            />
            <Tab
              label="Members"
              icon={<PeopleIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <EventList
            tripId={trip.id}
            events={trip.events}
            canEdit={isHost || isMember}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <ItemList
            tripId={trip.id}
            items={trip.items}
            canEdit={isHost || isMember}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <MemberList
            tripId={trip.id}
            members={trip.members}
            currentUserId={user?.id}
            isHost={isHost}
          />
        </TabPanel>

        {/* Invite Modal */}
        <InviteModal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          tripId={trip.id}
          tripTitle={trip.title}
        />
      </Box>
    </Container>
  );
};
```

## API Endpoints Specification

### Authentication Endpoints
```typescript
// POST /api/v1/auth/register
interface RegisterEndpoint {
  body: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
  };
  response: {
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  errors: {
    409: 'Email already registered' | 'Username already taken';
    400: 'Validation failed';
  };
}

// POST /api/v1/auth/login
interface LoginEndpoint {
  body: {
    email: string;
    password: string;
  };
  response: {
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  errors: {
    401: 'Invalid email or password';
    403: 'Email not verified';
  };
}

// POST /api/v1/auth/refresh
interface RefreshTokenEndpoint {
  body: {
    refreshToken: string;
  };
  response: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  errors: {
    401: 'Invalid refresh token';
  };
}

// GET /api/v1/auth/verify/:token
interface VerifyEmailEndpoint {
  params: {
    token: string;
  };
  response: {
    message: string;
  };
  errors: {
    400: 'Invalid or expired verification token';
  };
}

// POST /api/v1/auth/forgot-password
interface ForgotPasswordEndpoint {
  body: {
    email: string;
  };
  response: {
    message: string;
  };
}

// POST /api/v1/auth/reset-password
interface ResetPasswordEndpoint {
  body: {
    token: string;
    password: string;
  };
  response: {
    message: string;
  };
  errors: {
    400: 'Invalid or expired reset token';
  };
}

// POST /api/v1/auth/logout
interface LogoutEndpoint {
  body: {
    refreshToken?: string;
  };
  response: {
    message: string;
  };
}
```

### Trip Management Endpoints
```typescript
// GET /api/v1/trips
interface GetTripsEndpoint {
  query: {
    page?: number;
    limit?: number;
    status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    role?: 'HOST' | 'MEMBER';
    upcoming?: boolean;
    search?: string;
    sort?: 'createdAt' | 'startDate' | 'title';
    order?: 'asc' | 'desc';
  };
  response: {
    trips: TripSummary[];
    pagination: PaginationMeta;
  };
}

// POST /api/v1/trips
interface CreateTripEndpoint {
  body: CreateTripRequest;
  response: TripDetails;
  errors: {
    400: 'Validation failed';
  };
}

// GET /api/v1/trips/:tripId
interface GetTripEndpoint {
  params: {
    tripId: string;
  };
  response: TripDetails;
  errors: {
    404: 'Trip not found or access denied';
  };
}

// PUT /api/v1/trips/:tripId
interface UpdateTripEndpoint {
  params: {
    tripId: string;
  };
  body: UpdateTripRequest;
  response: TripDetails;
  errors: {
    404: 'Trip not found or access denied';
    403: 'Only hosts can modify trip details';
  };
}

// DELETE /api/v1/trips/:tripId
interface DeleteTripEndpoint {
  params: {
    tripId: string;
  };
  response: {
    message: string;
  };
  errors: {
    404: 'Trip not found or access denied';
    403: 'Only hosts can delete trips';
  };
}

// POST /api/v1/trips/:tripId/invite
interface GenerateInviteCodeEndpoint {
  params: {
    tripId: string;
  };
  response: {
    inviteCode: string;
    expiresAt: string;
  };
  errors: {
    404: 'Trip not found or access denied';
    403: 'Only hosts can generate invite codes';
  };
}

// POST /api/v1/trips/join
interface JoinTripByCodeEndpoint {
  body: {
    inviteCode: string;
  };
  response: TripDetails;
  errors: {
    400: 'Invalid or expired invite code';
    409: 'Already a member of this trip';
  };
}
```

### Event Management Endpoints
```typescript
// GET /api/v1/trips/:tripId/events
interface GetEventsEndpoint {
  params: {
    tripId: string;
  };
  query: {
    startDate?: string;
    endDate?: string;
    status?: 'PROPOSED' | 'APPROVED' | 'CANCELLED' | 'COMPLETED';
    category?: string;
  };
  response: EventSummary[];
}

// POST /api/v1/trips/:tripId/events
interface CreateEventEndpoint {
  params: {
    tripId: string;
  };
  body: CreateEventRequest;
  response: EventSummary;
  errors: {
    404: 'Trip not found or access denied';
    400: 'Validation failed';
  };
}

// PUT /api/v1/trips/:tripId/events/:eventId
interface UpdateEventEndpoint {
  params: {
    tripId: string;
    eventId: string;
  };
  body: Partial<CreateEventRequest>;
  response: EventSummary;
  errors: {
    404: 'Event not found or access denied';
    403: 'Only event creator or trip host can modify events';
  };
}

// DELETE /api/v1/trips/:tripId/events/:eventId
interface DeleteEventEndpoint {
  params: {
    tripId: string;
    eventId: string;
  };
  response: {
    message: string;
  };
  errors: {
    404: 'Event not found or access denied';
    403: 'Only event creator or trip host can delete events';
  };
}

// POST /api/v1/trips/:tripId/events/:eventId/approve
interface ApproveEventEndpoint {
  params: {
    tripId: string;
    eventId: string;
  };
  response: EventSummary;
  errors: {
    404: 'Event not found';
    403: 'Only trip hosts can approve events';
    409: 'Event already approved';
  };
}
```

### Item Management Endpoints
```typescript
// GET /api/v1/trips/:tripId/items
interface GetItemsEndpoint {
  params: {
    tripId: string;
  };
  query: {
    type?: 'RECOMMENDED' | 'SHARED';
    category?: string;
    unclaimed?: boolean;
  };
  response: ItemSummary[];
}

// POST /api/v1/trips/:tripId/items
interface CreateItemEndpoint {
  params: {
    tripId: string;
  };
  body: CreateItemRequest;
  response: ItemSummary;
  errors: {
    404: 'Trip not found or access denied';
    400: 'Validation failed';
  };
}

// PUT /api/v1/trips/:tripId/items/:itemId
interface UpdateItemEndpoint {
  params: {
    tripId: string;
    itemId: string;
  };
  body: Partial<CreateItemRequest>;
  response: ItemSummary;
  errors: {
    404: 'Item not found or access denied';
    403: 'Only item creator or trip host can modify items';
  };
}

// DELETE /api/v1/trips/:tripId/items/:itemId
interface DeleteItemEndpoint {
  params: {
    tripId: string;
    itemId: string;
  };
  response: {
    message: string;
  };
  errors: {
    404: 'Item not found or access denied';
    403: 'Only item creator or trip host can delete items';
  };
}

// POST /api/v1/trips/:tripId/items/:itemId/claim
interface ClaimItemEndpoint {
  params: {
    tripId: string;
    itemId: string;
  };
  body: {
    quantity?: number;
    notes?: string;
  };
  response: ItemClaimSummary;
  errors: {
    404: 'Item not found';
    400: 'Invalid quantity' | 'Item is recommended type (cannot be claimed)';
    409: 'Already claimed by user' | 'Insufficient quantity available';
  };
}

// DELETE /api/v1/trips/:tripId/items/:itemId/claim
interface UnclaimItemEndpoint {
  params: {
    tripId: string;
    itemId: string;
  };
  response: {
    message: string;
  };
  errors: {
    404: 'Claim not found';
  };
}

// PUT /api/v1/trips/:tripId/items/:itemId/claim
interface UpdateClaimEndpoint {
  params: {
    tripId: string;
    itemId: string;
  };
  body: {
    quantity?: number;
    status?: 'CLAIMED' | 'BROUGHT' | 'CANCELLED';
    notes?: string;
  };
  response: ItemClaimSummary;
  errors: {
    404: 'Claim not found';
    400: 'Invalid quantity';
  };
}
```

## WebSocket Events

### Real-time Communication
```typescript
// Socket.IO namespace: /trips/:tripId
interface TripSocketEvents {
  // Client to server events
  'join:trip': {
    tripId: string;
  };

  'leave:trip': {
    tripId: string;
  };

  // Server to client events
  'trip:updated': {
    tripId: string;
    updatedBy: string;
    changes: Partial<TripDetails>;
  };

  'event:created': {
    tripId: string;
    event: EventSummary;
    createdBy: string;
  };

  'event:updated': {
    tripId: string;
    eventId: string;
    changes: Partial<EventSummary>;
    updatedBy: string;
  };

  'event:deleted': {
    tripId: string;
    eventId: string;
    deletedBy: string;
  };

  'event:approved': {
    tripId: string;
    eventId: string;
    approvedBy: string;
  };

  'item:created': {
    tripId: string;
    item: ItemSummary;
    createdBy: string;
  };

  'item:updated': {
    tripId: string;
    itemId: string;
    changes: Partial<ItemSummary>;
    updatedBy: string;
  };

  'item:deleted': {
    tripId: string;
    itemId: string;
    deletedBy: string;
  };

  'item:claimed': {
    tripId: string;
    itemId: string;
    claim: ItemClaimSummary;
    claimedBy: string;
  };

  'item:unclaimed': {
    tripId: string;
    itemId: string;
    unclaimedBy: string;
  };

  'member:joined': {
    tripId: string;
    member: TripMember;
  };

  'member:left': {
    tripId: string;
    memberId: string;
    leftBy: string;
  };

  'notification:new': {
    notification: Notification;
  };
}

// Socket middleware for authentication and room management
class TripSocketHandler {
  public handleConnection(socket: Socket, io: Server): void {
    // Authenticate socket connection
    socket.on('join:trip', async ({ tripId }) => {
      const hasAccess = await this.verifyTripAccess(socket.userId, tripId);
      if (hasAccess) {
        socket.join(`trip:${tripId}`);
        socket.emit('joined:trip', { tripId });
      } else {
        socket.emit('error', { message: 'Access denied to trip' });
      }
    });

    socket.on('leave:trip', ({ tripId }) => {
      socket.leave(`trip:${tripId}`);
      socket.emit('left:trip', { tripId });
    });

    socket.on('disconnect', () => {
      // Clean up any room memberships
    });
  }

  public emitToTripMembers(tripId: string, event: string, data: any): void {
    this.io.to(`trip:${tripId}`).emit(event, data);
  }
}
```

## Database Migrations

### Initial Migration (001_init.sql)
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_data JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Trips table
CREATE TYPE trip_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location JSONB,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status trip_status DEFAULT 'PLANNING',
    invite_code VARCHAR(50) UNIQUE,
    invite_expires_at TIMESTAMPTZ,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip members table
CREATE TYPE member_role AS ENUM ('HOST', 'CO_HOST', 'MEMBER');
CREATE TYPE member_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REMOVED');

CREATE TABLE trip_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role DEFAULT 'MEMBER',
    status member_status DEFAULT 'PENDING',
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    invited_by UUID REFERENCES users(id),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, user_id)
);

-- Events table
CREATE TYPE event_status AS ENUM ('PROPOSED', 'APPROVED', 'CANCELLED', 'COMPLETED');
CREATE TYPE event_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location JSONB,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_all_day BOOLEAN DEFAULT FALSE,
    status event_status DEFAULT 'PROPOSED',
    priority event_priority DEFAULT 'MEDIUM',
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    estimated_cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items table
CREATE TYPE item_type AS ENUM ('RECOMMENDED', 'SHARED');

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    type item_type NOT NULL,
    quantity_needed INTEGER DEFAULT 1,
    quantity_claimed INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    is_essential BOOLEAN DEFAULT FALSE,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    estimated_cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item claims table
CREATE TYPE claim_status AS ENUM ('CLAIMED', 'BROUGHT', 'CANCELLED');

CREATE TABLE item_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    status claim_status DEFAULT 'CLAIMED',
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, user_id)
);

-- Notifications table
CREATE TYPE notification_type AS ENUM (
    'TRIP_INVITATION', 'TRIP_UPDATE', 'EVENT_CREATED', 'EVENT_UPDATED',
    'ITEM_CLAIMED', 'MEMBER_JOINED', 'GENERAL'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extension tables for future features
CREATE TABLE trip_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    extension_type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, extension_type)
);

CREATE TABLE user_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    extension_type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, extension_type)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);

CREATE INDEX idx_trips_host_id ON trips(host_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX idx_trips_invite_code ON trips(invite_code);

CREATE INDEX idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX idx_trip_members_user_id ON trip_members(user_id);
CREATE INDEX idx_trip_members_status ON trip_members(status);

CREATE INDEX idx_events_trip_id ON events(trip_id);
CREATE INDEX idx_events_time ON events(start_time, end_time);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_by_id ON events(created_by_id);

CREATE INDEX idx_items_trip_id ON items(trip_id);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_created_by_id ON items(created_by_id);

CREATE INDEX idx_item_claims_item_id ON item_claims(item_id);
CREATE INDEX idx_item_claims_user_id ON item_claims(user_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_trip_id ON notifications(trip_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_trip_extensions_trip_id ON trip_extensions(trip_id);
CREATE INDEX idx_trip_extensions_type ON trip_extensions(extension_type);
CREATE INDEX idx_user_extensions_user_id ON user_extensions(user_id);
CREATE INDEX idx_user_extensions_type ON user_extensions(extension_type);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_members_updated_at BEFORE UPDATE ON trip_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_claims_updated_at BEFORE UPDATE ON item_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_extensions_updated_at BEFORE UPDATE ON trip_extensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_extensions_updated_at BEFORE UPDATE ON user_extensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Docker Configuration

### Backend Dockerfile
```dockerfile
# Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application and Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Frontend Dockerfile
```dockerfile
# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      APP_URL: ${APP_URL}
    volumes:
      - uploads:/app/uploads
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      - api
    environment:
      REACT_APP_API_URL: ${REACT_APP_API_URL}
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    depends_on:
      - web
      - api
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  uploads:
    driver: local

networks:
  default:
    driver: bridge
```

## Testing Strategy

### Backend Test Structure
```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createRedisClient } from '../src/utils/redis';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST,
    },
  },
});

export const redis = createRedisClient(process.env.REDIS_URL_TEST);

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
  await redis.connect();
});

afterAll(async () => {
  // Disconnect from test database
  await prisma.$disconnect();
  await redis.disconnect();
});

beforeEach(async () => {
  // Clear all tables before each test
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
    }
  }

  // Clear Redis
  await redis.flushall();
});

// Test utilities
export async function createTestUser(overrides: Partial<User> = {}) {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashedpassword',
      emailVerified: true,
      ...overrides,
    },
  });
}

export async function createTestTrip(hostId: string, overrides: Partial<Trip> = {}) {
  return prisma.trip.create({
    data: {
      title: 'Test Trip',
      description: 'A test trip',
      hostId,
      status: 'PLANNING',
      ...overrides,
    },
  });
}

export function generateJWT(userId: string): string {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}
```

### Auth Controller Tests
```typescript
// tests/auth.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { prisma, createTestUser } from './setup';

describe('Authentication', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(user).toBeDefined();
      expect(user!.emailVerified).toBe(false);
    });

    it('should reject registration with duplicate email', async () => {
      await createTestUser({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          username: 'newuser',
          firstName: 'New',
          lastName: 'User',
          password: 'SecurePassword123!',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already registered');
    });

    it('should validate password requirements', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          password: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' })
        ])
      );
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('ValidPassword123!', 12),
        emailVerified: true,
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      await createTestUser({
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('ValidPassword123!', 12),
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });
  });
});
```

### Trip Management Tests
```typescript
// tests/trips.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { prisma, createTestUser, createTestTrip, generateJWT } from './setup';

describe('Trip Management', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = generateJWT(testUser.id);
  });

  describe('POST /api/v1/trips', () => {
    it('should create a new trip successfully', async () => {
      const tripData = {
        title: 'Amazing Mountain Trip',
        description: 'A weekend in the mountains',
        location: {
          address: '123 Mountain View, CO',
          coordinates: { lat: 40.7128, lng: -74.0060 },
        },
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-06-03T00:00:00Z',
      };

      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tripData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(tripData.title);
      expect(response.body.data.host.id).toBe(testUser.id);
      expect(response.body.data.status).toBe('PLANNING');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/trips')
        .send({
          title: 'Test Trip',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Missing title',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title' })
        ])
      );
    });
  });

  describe('GET /api/v1/trips', () => {
    it('should return user trips with pagination', async () => {
      // Create multiple trips
      await createTestTrip(testUser.id, { title: 'Trip 1' });
      await createTestTrip(testUser.id, { title: 'Trip 2' });

      const response = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.pages).toBe(2);
    });

    it('should filter trips by status', async () => {
      await createTestTrip(testUser.id, { status: 'PLANNING' });
      await createTestTrip(testUser.id, { status: 'ACTIVE' });

      const response = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'PLANNING' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('PLANNING');
    });
  });

  describe('POST /api/v1/trips/join', () => {
    it('should allow joining trip with valid invite code', async () => {
      const host = await createTestUser({
        email: 'host@example.com',
        username: 'host'
      });
      const trip = await createTestTrip(host.id, {
        inviteCode: 'TESTCODE123',
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      });

      const response = await request(app)
        .post('/api/v1/trips/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          inviteCode: 'TESTCODE123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(trip.id);

      // Verify membership was created
      const membership = await prisma.tripMember.findFirst({
        where: {
          tripId: trip.id,
          userId: testUser.id,
        },
      });
      expect(membership).toBeDefined();
      expect(membership!.status).toBe('ACCEPTED');
    });

    it('should reject expired invite codes', async () => {
      const host = await createTestUser({
        email: 'host@example.com',
        username: 'host'
      });
      await createTestTrip(host.id, {
        inviteCode: 'EXPIREDCODE',
        inviteExpiresAt: new Date(Date.now() - 1000), // Expired
      });

      const response = await request(app)
        .post('/api/v1/trips/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          inviteCode: 'EXPIREDCODE',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });
  });
});
```

## Deployment Timeline

### Week 1-2: Foundation Setup
**Backend Core**
- [ ] Project initialization and dependency setup
- [ ] Database schema design and Prisma setup
- [ ] Basic Express server with middleware
- [ ] User model and authentication service
- [ ] Password hashing and JWT token management
- [ ] Email service configuration
- [ ] Basic error handling and logging

**Frontend Core**
- [ ] React application setup with Vite
- [ ] Material-UI theme configuration
- [ ] Routing setup with React Router
- [ ] Authentication context and store
- [ ] API service foundation with Axios
- [ ] Basic layout components (Header, Footer, Layout)

### Week 3-4: Authentication System
**Backend**
- [ ] Complete auth controller with all endpoints
- [ ] Email verification implementation
- [ ] Password reset functionality
- [ ] Refresh token mechanism
- [ ] Rate limiting for auth endpoints
- [ ] Auth middleware for protected routes

**Frontend**
- [ ] Login/Register forms with validation
- [ ] Password reset flow
- [ ] Email verification page
- [ ] Protected route component
- [ ] Auth state management with persistence

### Week 5-6: Trip Management
**Backend**
- [ ] Trip model and controller
- [ ] Trip CRUD operations
- [ ] Trip member management
- [ ] Invite code generation and validation
- [ ] Trip access permissions
- [ ] Trip listing with filtering and pagination

**Frontend**
- [ ] Trip creation form
- [ ] Trip list page with filtering
- [ ] Trip details page structure
- [ ] Trip member management UI
- [ ] Invite modal and join trip functionality

### Week 7-8: Events & Schedule
**Backend**
- [ ] Event model and controller
- [ ] Event CRUD operations
- [ ] Event approval workflow
- [ ] Calendar-style event queries
- [ ] Event conflict detection

**Frontend**
- [ ] Event creation/editing forms
- [ ] Event list and calendar views
- [ ] Timeline component
- [ ] Event approval interface for hosts

### Week 9-10: Items & Claims
**Backend**
- [ ] Item model and controller
- [ ] Item CRUD operations
- [ ] Claiming system for shared items
- [ ] Quantity management
- [ ] Item categorization

**Frontend**
- [ ] Item creation/editing forms
- [ ] Item list with claiming interface
- [ ] Personal checklist view
- [ ] Claim status management

### Week 11-12: Real-time & Notifications
**Backend**
- [ ] Socket.IO integration
- [ ] Real-time event handlers
- [ ] Notification system
- [ ] Email notification templates
- [ ] Background job processing

**Frontend**
- [ ] Socket connection management
- [ ] Real-time updates integration
- [ ] Notification bell and list
- [ ] Toast notifications
- [ ] WebSocket reconnection handling

### Week 13-14: Testing & Polish
**Backend**
- [ ] Comprehensive unit tests
- [ ] Integration tests for key workflows
- [ ] API documentation
- [ ] Performance optimization
- [ ] Security audit

**Frontend**
- [ ] Component unit tests
- [ ] E2E testing with Playwright
- [ ] Responsive design testing
- [ ] Performance optimization
- [ ] Accessibility compliance

### Week 15-16: Deployment & Documentation
**Infrastructure**
- [ ] Docker configuration optimization
- [ ] Production environment setup
- [ ] CI/CD pipeline configuration
- [ ] Monitoring and logging setup
- [ ] Backup strategy implementation

**Documentation**
- [ ] API documentation with OpenAPI
- [ ] User guide creation
- [ ] Deployment instructions
- [ ] Troubleshooting guide
- [ ] Security best practices documentation

This Phase 1 implementation provides a solid, production-ready foundation for the Group Trip Planner MVP while maintaining the extensible architecture needed for future feature development.