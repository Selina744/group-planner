# Phase 1: Core MVP Implementation Design
## Agent: BrownDog | Program: claude-code | Model: claude-sonnet-4

---

## Phase 1 Scope

Phase 1 delivers the foundational product: user accounts, trip creation, basic scheduling, recommended item lists, email invitations/notifications, and a Docker deployment. No shared item claiming, no real-time WebSocket updates, no mobile app. Those are Phase 2.

**Deliverables:**
1. User authentication and registration
2. Basic trip creation and management
3. Simple schedule planning (add/view events)
4. Basic item lists (recommended only)
5. Email invitations and notifications
6. Docker deployment setup

---

## Project Structure

```
group-planner/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── README.md
├── AGENTS.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.js
│   ├── jest.config.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   │
│   ├── src/
│   │   ├── index.ts                    # Entry point: Express app bootstrap
│   │   ├── app.ts                      # Express app configuration
│   │   ├── server.ts                   # HTTP server startup
│   │   │
│   │   ├── config/
│   │   │   ├── index.ts                # Central config loader from env
│   │   │   ├── database.ts             # Prisma client singleton
│   │   │   ├── redis.ts                # Redis client singleton
│   │   │   ├── email.ts                # Nodemailer transporter config
│   │   │   └── logger.ts               # Winston logger config
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts                 # JWT verification middleware
│   │   │   ├── rateLimiter.ts          # Rate limiting per endpoint type
│   │   │   ├── validate.ts             # Request validation wrapper
│   │   │   ├── errorHandler.ts         # Global error handler
│   │   │   ├── requestLogger.ts        # HTTP request logging
│   │   │   └── tripAccess.ts           # Trip membership/host verification
│   │   │
│   │   ├── routes/
│   │   │   ├── index.ts                # Route aggregator
│   │   │   ├── auth.routes.ts          # /api/v1/auth/*
│   │   │   ├── user.routes.ts          # /api/v1/users/*
│   │   │   ├── trip.routes.ts          # /api/v1/trips/*
│   │   │   ├── event.routes.ts         # /api/v1/trips/:tripId/events/*
│   │   │   ├── item.routes.ts          # /api/v1/trips/:tripId/items/*
│   │   │   ├── invite.routes.ts        # /api/v1/invites/*
│   │   │   ├── notification.routes.ts  # /api/v1/notifications/*
│   │   │   └── health.routes.ts        # /api/v1/health
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── trip.controller.ts
│   │   │   ├── event.controller.ts
│   │   │   ├── item.controller.ts
│   │   │   ├── invite.controller.ts
│   │   │   └── notification.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts         # Registration, login, token management
│   │   │   ├── user.service.ts         # Profile CRUD
│   │   │   ├── trip.service.ts         # Trip CRUD, membership
│   │   │   ├── event.service.ts        # Event CRUD within trips
│   │   │   ├── item.service.ts         # Item CRUD within trips
│   │   │   ├── invite.service.ts       # Invitation generation and acceptance
│   │   │   ├── notification.service.ts # Notification creation and delivery
│   │   │   └── email.service.ts        # Email composition and sending
│   │   │
│   │   ├── validators/
│   │   │   ├── auth.validator.ts
│   │   │   ├── trip.validator.ts
│   │   │   ├── event.validator.ts
│   │   │   ├── item.validator.ts
│   │   │   └── invite.validator.ts
│   │   │
│   │   ├── types/
│   │   │   ├── index.ts                # Shared type exports
│   │   │   ├── auth.types.ts
│   │   │   ├── trip.types.ts
│   │   │   ├── event.types.ts
│   │   │   ├── item.types.ts
│   │   │   ├── invite.types.ts
│   │   │   ├── notification.types.ts
│   │   │   └── express.d.ts           # Express request augmentation
│   │   │
│   │   ├── utils/
│   │   │   ├── jwt.ts                  # Token sign/verify helpers
│   │   │   ├── password.ts             # Bcrypt hash/compare helpers
│   │   │   ├── pagination.ts           # Cursor/offset pagination helpers
│   │   │   ├── errors.ts               # Custom error classes
│   │   │   └── slug.ts                 # URL-safe slug generation
│   │   │
│   │   └── emails/
│   │       ├── templates/
│   │       │   ├── welcome.hbs
│   │       │   ├── password-reset.hbs
│   │       │   ├── trip-invite.hbs
│   │       │   ├── trip-updated.hbs
│   │       │   ├── event-added.hbs
│   │       │   └── layout.hbs          # Base email layout
│   │       └── renderer.ts             # Handlebars template renderer
│   │
│   └── tests/
│       ├── setup.ts                    # Test DB setup/teardown
│       ├── factories/                  # Test data factories
│       │   ├── user.factory.ts
│       │   ├── trip.factory.ts
│       │   ├── event.factory.ts
│       │   └── item.factory.ts
│       ├── integration/
│       │   ├── auth.test.ts
│       │   ├── trip.test.ts
│       │   ├── event.test.ts
│       │   ├── item.test.ts
│       │   └── invite.test.ts
│       └── unit/
│           ├── services/
│           └── utils/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── .eslintrc.js
│   │
│   ├── public/
│   │   ├── favicon.ico
│   │   └── manifest.json
│   │
│   └── src/
│       ├── main.tsx                    # React DOM entry point
│       ├── App.tsx                     # Root component with providers
│       ├── routes.tsx                  # Route definitions
│       ├── vite-env.d.ts
│       │
│       ├── api/
│       │   ├── client.ts              # Axios instance with interceptors
│       │   ├── auth.api.ts            # Auth endpoint functions
│       │   ├── trips.api.ts           # Trip endpoint functions
│       │   ├── events.api.ts          # Event endpoint functions
│       │   ├── items.api.ts           # Item endpoint functions
│       │   ├── invites.api.ts         # Invite endpoint functions
│       │   └── notifications.api.ts   # Notification endpoint functions
│       │
│       ├── hooks/
│       │   ├── useAuth.ts             # Auth state and actions
│       │   ├── useTrips.ts            # Trip queries and mutations
│       │   ├── useEvents.ts           # Event queries and mutations
│       │   ├── useItems.ts            # Item queries and mutations
│       │   ├── useInvites.ts          # Invite queries and mutations
│       │   ├── useNotifications.ts    # Notification queries
│       │   └── useDebounce.ts         # Input debouncing
│       │
│       ├── context/
│       │   ├── AuthContext.tsx         # Auth state provider
│       │   ├── NotificationContext.tsx # In-app notification state
│       │   └── ThemeContext.tsx        # Light/dark theme toggle
│       │
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   ├── ForgotPasswordPage.tsx
│       │   │   └── ResetPasswordPage.tsx
│       │   │
│       │   ├── dashboard/
│       │   │   └── DashboardPage.tsx   # Trip list + create button
│       │   │
│       │   ├── trips/
│       │   │   ├── TripCreatePage.tsx
│       │   │   ├── TripDetailPage.tsx  # Tab container for schedule/items/members
│       │   │   ├── TripEditPage.tsx
│       │   │   └── TripSettingsPage.tsx
│       │   │
│       │   ├── invite/
│       │   │   └── InviteAcceptPage.tsx # Public invite acceptance page
│       │   │
│       │   ├── profile/
│       │   │   └── ProfilePage.tsx
│       │   │
│       │   └── NotFoundPage.tsx
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.tsx       # Shell with nav, header, content area
│       │   │   ├── Navbar.tsx          # Side navigation
│       │   │   ├── Header.tsx          # Top bar with user menu, notifications
│       │   │   ├── Footer.tsx
│       │   │   └── ProtectedRoute.tsx  # Auth guard wrapper
│       │   │
│       │   ├── auth/
│       │   │   ├── LoginForm.tsx
│       │   │   ├── RegisterForm.tsx
│       │   │   └── PasswordResetForm.tsx
│       │   │
│       │   ├── trips/
│       │   │   ├── TripCard.tsx        # Trip summary card for dashboard
│       │   │   ├── TripList.tsx        # Grid/list of TripCards
│       │   │   ├── TripForm.tsx        # Create/edit trip form
│       │   │   ├── TripHeader.tsx      # Trip detail header with title, dates, host
│       │   │   ├── TripTabs.tsx        # Tab navigation for trip sections
│       │   │   └── MemberList.tsx      # Trip member list with roles
│       │   │
│       │   ├── events/
│       │   │   ├── EventList.tsx       # Chronological event listing
│       │   │   ├── EventCard.tsx       # Single event display
│       │   │   ├── EventForm.tsx       # Create/edit event modal or form
│       │   │   ├── EventTimeline.tsx   # Visual timeline component
│       │   │   └── EventDetail.tsx     # Expanded event view
│       │   │
│       │   ├── items/
│       │   │   ├── ItemList.tsx        # Categorized item listing
│       │   │   ├── ItemCard.tsx        # Single item display
│       │   │   ├── ItemForm.tsx        # Create/edit item form
│       │   │   └── CategoryFilter.tsx  # Filter items by category
│       │   │
│       │   ├── invites/
│       │   │   ├── InviteLinkGenerator.tsx  # Generate/copy invite link
│       │   │   ├── InviteEmailForm.tsx      # Send invite by email
│       │   │   └── InviteAcceptCard.tsx     # Accept invite UI
│       │   │
│       │   ├── notifications/
│       │   │   ├── NotificationBell.tsx     # Header notification icon + count
│       │   │   ├── NotificationDropdown.tsx # Notification list dropdown
│       │   │   └── NotificationItem.tsx     # Single notification entry
│       │   │
│       │   └── shared/
│       │       ├── LoadingSpinner.tsx
│       │       ├── ErrorBoundary.tsx
│       │       ├── EmptyState.tsx       # "No items yet" placeholders
│       │       ├── ConfirmDialog.tsx    # Confirmation modal
│       │       ├── DateRangePicker.tsx  # Date range selection
│       │       ├── SearchInput.tsx      # Debounced search field
│       │       ├── Pagination.tsx       # Page navigation
│       │       ├── Avatar.tsx           # User avatar with initials fallback
│       │       ├── StatusBadge.tsx      # Event status badges
│       │       └── Toast.tsx            # Snackbar/toast notifications
│       │
│       ├── theme/
│       │   ├── index.ts                # MUI theme configuration
│       │   ├── palette.ts              # Color palette
│       │   └── typography.ts           # Typography scale
│       │
│       ├── utils/
│       │   ├── dates.ts                # Date formatting helpers
│       │   ├── validation.ts           # Client-side validation rules
│       │   └── storage.ts              # LocalStorage helpers for tokens
│       │
│       └── types/
│           ├── index.ts
│           ├── auth.types.ts
│           ├── trip.types.ts
│           ├── event.types.ts
│           ├── item.types.ts
│           ├── invite.types.ts
│           └── notification.types.ts
│
├── nginx/
│   ├── nginx.conf
│   └── ssl/                            # Mounted SSL certs
│
└── scripts/
    ├── backup.sh
    ├── restore.sh
    ├── wait-for-health.sh
    └── seed-demo-data.sh
```

---

## Database Models (Prisma Schema)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// USER
// ============================================================

model User {
  id            String   @id @default(uuid()) @db.Uuid
  email         String   @unique @db.VarChar(255)
  username      String   @unique @db.VarChar(100)
  displayName   String   @map("display_name") @db.VarChar(255)
  passwordHash  String   @map("password_hash") @db.VarChar(255)
  profileData   Json     @default("{}") @map("profile_data")   // { bio, avatarUrl, phone }
  preferences   Json     @default("{}") @map("preferences")    // { notifications: { email: bool, inApp: bool }, timezone }
  metadata      Json     @default("{}") @map("metadata")       // Extension point
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  hostedTrips      Trip[]          @relation("TripHost")
  tripMemberships  TripMember[]
  suggestedEvents  Event[]         @relation("EventSuggestor")
  approvedEvents   Event[]         @relation("EventApprover")
  createdItems     Item[]
  refreshTokens    RefreshToken[]
  notifications    Notification[]
  sentInvites      Invite[]        @relation("InviteSender")
  passwordResets   PasswordReset[]

  @@map("users")
}

// ============================================================
// AUTHENTICATION SUPPORT
// ============================================================

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  token     String   @unique @db.VarChar(512)
  userId    String   @map("user_id") @db.Uuid
  expiresAt DateTime @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@map("refresh_tokens")
}

model PasswordReset {
  id        String   @id @default(uuid()) @db.Uuid
  token     String   @unique @db.VarChar(512)
  userId    String   @map("user_id") @db.Uuid
  expiresAt DateTime @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("password_resets")
}

// ============================================================
// TRIP
// ============================================================

model Trip {
  id          String    @id @default(uuid()) @db.Uuid
  title       String    @db.VarChar(255)
  description String?   @db.Text
  tripType    String    @default("general") @map("trip_type") @db.VarChar(50) // camping, roadtrip, hiking, general
  startDate   DateTime? @map("start_date")
  endDate     DateTime? @map("end_date")
  location    Json?     // LocationData: { address, coordinates?: {lat, lng}, timezone?, country?, region?, city? }
  coverImage  String?   @map("cover_image") @db.VarChar(512)
  status      TripStatus @default(PLANNING)
  hostId      String    @map("host_id") @db.Uuid
  settings    Json      @default("{}") // { visibility: 'private'|'link', maxMembers?, requireApproval? }
  metadata    Json      @default("{}") // Extension point
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relations
  host        User         @relation("TripHost", fields: [hostId], references: [id])
  members     TripMember[]
  events      Event[]
  items       Item[]
  invites     Invite[]
  announcements Announcement[]

  @@index([hostId, startDate, endDate])
  @@index([status])
  @@map("trips")
}

enum TripStatus {
  PLANNING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

// ============================================================
// TRIP MEMBERSHIP
// ============================================================

model TripMember {
  id       String         @id @default(uuid()) @db.Uuid
  tripId   String         @map("trip_id") @db.Uuid
  userId   String         @map("user_id") @db.Uuid
  role     TripMemberRole @default(MEMBER)
  status   MemberStatus   @default(ACTIVE)
  joinedAt DateTime       @default(now()) @map("joined_at")

  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tripId, userId])
  @@index([userId])
  @@map("trip_members")
}

enum TripMemberRole {
  HOST
  MEMBER
}

enum MemberStatus {
  ACTIVE
  INACTIVE
  REMOVED
}

// ============================================================
// EVENT (SCHEDULE)
// ============================================================

model Event {
  id          String      @id @default(uuid()) @db.Uuid
  tripId      String      @map("trip_id") @db.Uuid
  title       String      @db.VarChar(255)
  description String?     @db.Text
  startTime   DateTime    @map("start_time")
  endTime     DateTime?   @map("end_time")
  location    Json?       // LocationData (same shape as Trip.location)
  status      EventStatus @default(PROPOSED)
  suggestedBy String      @map("suggested_by") @db.Uuid
  approvedBy  String?     @map("approved_by") @db.Uuid
  approvedAt  DateTime?   @map("approved_at")
  sortOrder   Int         @default(0) @map("sort_order")
  metadata    Json        @default("{}") // Extension point
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  // Relations
  trip      Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  suggestor User @relation("EventSuggestor", fields: [suggestedBy], references: [id])
  approver  User? @relation("EventApprover", fields: [approvedBy], references: [id])

  @@index([tripId, startTime])
  @@index([tripId, status])
  @@map("events")
}

enum EventStatus {
  PROPOSED
  APPROVED
  REJECTED
  CANCELLED
}

// ============================================================
// ITEM (RECOMMENDED ITEMS ONLY IN PHASE 1)
// ============================================================

model Item {
  id             String   @id @default(uuid()) @db.Uuid
  tripId         String   @map("trip_id") @db.Uuid
  name           String   @db.VarChar(255)
  description    String?  @db.Text
  category       String   @db.VarChar(100)  // food, equipment, safety, clothing, hygiene, other
  type           ItemType @default(RECOMMENDED)
  quantityNeeded Int      @default(1) @map("quantity_needed")
  isRequired     Boolean  @default(false) @map("is_required") // Host can mark as required vs optional
  priority       Int      @default(0) // 0=normal, 1=high, 2=critical
  createdBy      String   @map("created_by") @db.Uuid
  metadata       Json     @default("{}") // Extension point: { estimatedCost?, weight?, notes? }
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // Relations
  trip    Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  creator User @relation(fields: [createdBy], references: [id])

  @@index([tripId, type])
  @@index([tripId, category])
  @@map("items")
}

enum ItemType {
  RECOMMENDED  // Phase 1: personal items host recommends everyone bring
  SHARED       // Phase 2: community items that need claiming
}

// ============================================================
// INVITE
// ============================================================

model Invite {
  id        String       @id @default(uuid()) @db.Uuid
  tripId    String       @map("trip_id") @db.Uuid
  sentBy    String       @map("sent_by") @db.Uuid
  email     String?      @db.VarChar(255)    // Email invite target (null if link-only)
  code      String       @unique @db.VarChar(64) // URL-safe invite code
  status    InviteStatus @default(PENDING)
  expiresAt DateTime     @map("expires_at")
  usedAt    DateTime?    @map("used_at")
  usedById  String?      @map("used_by_id") @db.Uuid
  createdAt DateTime     @default(now()) @map("created_at")

  trip   Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  sender User @relation("InviteSender", fields: [sentBy], references: [id])

  @@index([code])
  @@index([tripId])
  @@map("invites")
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

// ============================================================
// ANNOUNCEMENT
// ============================================================

model Announcement {
  id        String   @id @default(uuid()) @db.Uuid
  tripId    String   @map("trip_id") @db.Uuid
  title     String   @db.VarChar(255)
  body      String   @db.Text
  createdAt DateTime @default(now()) @map("created_at")

  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@index([tripId, createdAt])
  @@map("announcements")
}

// ============================================================
// NOTIFICATION
// ============================================================

model Notification {
  id        String             @id @default(uuid()) @db.Uuid
  userId    String             @map("user_id") @db.Uuid
  type      NotificationType
  title     String             @db.VarChar(255)
  body      String             @db.Text
  data      Json               @default("{}") // { tripId?, eventId?, inviteId? } for deep linking
  readAt    DateTime?          @map("read_at")
  createdAt DateTime           @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
  @@index([userId, createdAt])
  @@map("notifications")
}

enum NotificationType {
  TRIP_UPDATED
  TRIP_CANCELLED
  EVENT_ADDED
  EVENT_APPROVED
  EVENT_REJECTED
  ITEM_ADDED
  MEMBER_JOINED
  MEMBER_LEFT
  INVITE_RECEIVED
  ANNOUNCEMENT
}

// ============================================================
// EXTENSION TABLES (PHASE 1 SCHEMA, USED LATER)
// ============================================================

model TripExtension {
  id            String   @id @default(uuid()) @db.Uuid
  tripId        String   @map("trip_id") @db.Uuid
  extensionType String   @map("extension_type") @db.VarChar(100)
  data          Json
  version       String   @default("1.0.0") @db.VarChar(20)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@unique([tripId, extensionType])
  @@index([tripId, extensionType])
  @@map("trip_extensions")
}

model UserExtension {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  extensionType String   @map("extension_type") @db.VarChar(100)
  data          Json
  version       String   @default("1.0.0") @db.VarChar(20)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@unique([userId, extensionType])
  @@index([userId, extensionType])
  @@map("user_extensions")
}

model SchemaVersion {
  version       String   @id @db.VarChar(50)
  migrationType String   @map("migration_type") @db.VarChar(20) // core, extension, plugin
  description   String?  @db.Text
  appliedAt     DateTime @default(now()) @map("applied_at")

  @@map("schema_versions")
}
```

---

## API Endpoints (Phase 1)

### Authentication

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `POST` | `/api/v1/auth/register` | Create account | No | 5/15min |
| `POST` | `/api/v1/auth/login` | Login, returns access + refresh tokens | No | 5/15min |
| `POST` | `/api/v1/auth/refresh` | Exchange refresh token for new access token | No | 10/15min |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token | Yes | 10/15min |
| `POST` | `/api/v1/auth/forgot-password` | Send password reset email | No | 3/15min |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token | No | 3/15min |

#### Request/Response Shapes

```typescript
// POST /api/v1/auth/register
interface RegisterRequest {
  email: string;        // valid email, max 255
  username: string;     // 3-100 chars, alphanumeric + underscores
  displayName: string;  // 1-255 chars
  password: string;     // min 8 chars, at least 1 uppercase, 1 number
}
interface RegisterResponse {
  user: UserPublic;
  accessToken: string;
  refreshToken: string;
}

// POST /api/v1/auth/login
interface LoginRequest {
  email: string;
  password: string;
}
interface LoginResponse {
  user: UserPublic;
  accessToken: string;   // JWT, 15 min expiry
  refreshToken: string;  // opaque token, 30 day expiry
}

// POST /api/v1/auth/refresh
interface RefreshRequest {
  refreshToken: string;
}
interface RefreshResponse {
  accessToken: string;
  refreshToken: string; // rotated
}

// POST /api/v1/auth/forgot-password
interface ForgotPasswordRequest {
  email: string;
}
// Always returns 200 to prevent email enumeration
interface ForgotPasswordResponse {
  message: string;
}

// POST /api/v1/auth/reset-password
interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
```

### User Profile

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/users/me` | Get current user profile | Yes |
| `PUT` | `/api/v1/users/me` | Update profile | Yes |
| `PUT` | `/api/v1/users/me/password` | Change password | Yes |
| `PUT` | `/api/v1/users/me/preferences` | Update notification preferences | Yes |

```typescript
interface UserPublic {
  id: string;
  email: string;
  username: string;
  displayName: string;
  profileData: {
    bio?: string;
    avatarUrl?: string;
    phone?: string;
  };
  preferences: {
    notifications: {
      email: boolean;      // Receive email notifications
      inApp: boolean;      // Receive in-app notifications
      tripUpdates: boolean;
      eventChanges: boolean;
      newMembers: boolean;
    };
    timezone: string;      // IANA timezone, e.g. "America/New_York"
  };
  createdAt: string;
}

interface UpdateProfileRequest {
  displayName?: string;
  profileData?: {
    bio?: string;
    avatarUrl?: string;
    phone?: string;
  };
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
```

### Trips

| Method | Path | Description | Auth | Access |
|--------|------|-------------|------|--------|
| `GET` | `/api/v1/trips` | List user's trips | Yes | Member |
| `POST` | `/api/v1/trips` | Create trip | Yes | Any |
| `GET` | `/api/v1/trips/:tripId` | Get trip detail | Yes | Member |
| `PUT` | `/api/v1/trips/:tripId` | Update trip | Yes | Host |
| `DELETE` | `/api/v1/trips/:tripId` | Delete trip | Yes | Host |
| `GET` | `/api/v1/trips/:tripId/members` | List members | Yes | Member |
| `DELETE` | `/api/v1/trips/:tripId/members/:userId` | Remove member | Yes | Host |
| `POST` | `/api/v1/trips/:tripId/leave` | Leave trip | Yes | Member (not host) |
| `POST` | `/api/v1/trips/:tripId/announcements` | Post announcement | Yes | Host |
| `GET` | `/api/v1/trips/:tripId/announcements` | List announcements | Yes | Member |

```typescript
// GET /api/v1/trips (query params)
interface ListTripsQuery {
  status?: TripStatus;       // filter by status
  role?: 'host' | 'member';  // filter by user's role
  page?: number;             // default 1
  limit?: number;            // default 20, max 50
  sort?: 'startDate' | 'createdAt' | 'title'; // default 'startDate'
  order?: 'asc' | 'desc';   // default 'asc'
}

interface ListTripsResponse {
  trips: TripSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface TripSummary {
  id: string;
  title: string;
  description: string | null;
  tripType: string;
  startDate: string | null;
  endDate: string | null;
  location: LocationData | null;
  coverImage: string | null;
  status: TripStatus;
  memberCount: number;
  eventCount: number;
  myRole: TripMemberRole;
}

// POST /api/v1/trips
interface CreateTripRequest {
  title: string;          // 1-255 chars
  description?: string;
  tripType?: string;      // camping, roadtrip, hiking, general
  startDate?: string;     // ISO 8601
  endDate?: string;       // ISO 8601, must be >= startDate
  location?: LocationData;
  settings?: {
    visibility?: 'private' | 'link';
    maxMembers?: number;
  };
}

// PUT /api/v1/trips/:tripId
interface UpdateTripRequest {
  title?: string;
  description?: string;
  tripType?: string;
  startDate?: string;
  endDate?: string;
  location?: LocationData;
  status?: TripStatus;
  settings?: Record<string, unknown>;
}

interface LocationData {
  address: string;
  coordinates?: { lat: number; lng: number };
  timezone?: string;
  country?: string;
  region?: string;
  city?: string;
}

// POST /api/v1/trips/:tripId/announcements
interface CreateAnnouncementRequest {
  title: string;   // 1-255 chars
  body: string;    // 1-5000 chars
}
```

### Events (Schedule)

| Method | Path | Description | Auth | Access |
|--------|------|-------------|------|--------|
| `GET` | `/api/v1/trips/:tripId/events` | List events | Yes | Member |
| `POST` | `/api/v1/trips/:tripId/events` | Create event (proposed by members, auto-approved by host) | Yes | Member |
| `GET` | `/api/v1/trips/:tripId/events/:eventId` | Get event detail | Yes | Member |
| `PUT` | `/api/v1/trips/:tripId/events/:eventId` | Update event | Yes | Host or suggestor (if still proposed) |
| `DELETE` | `/api/v1/trips/:tripId/events/:eventId` | Delete event | Yes | Host or suggestor (if still proposed) |
| `POST` | `/api/v1/trips/:tripId/events/:eventId/approve` | Approve proposed event | Yes | Host |
| `POST` | `/api/v1/trips/:tripId/events/:eventId/reject` | Reject proposed event | Yes | Host |

```typescript
// GET /api/v1/trips/:tripId/events (query params)
interface ListEventsQuery {
  status?: EventStatus;
  startAfter?: string;  // ISO 8601 filter
  startBefore?: string; // ISO 8601 filter
  sort?: 'startTime' | 'createdAt';
  order?: 'asc' | 'desc';
}

// POST /api/v1/trips/:tripId/events
interface CreateEventRequest {
  title: string;         // 1-255 chars
  description?: string;
  startTime: string;     // ISO 8601
  endTime?: string;      // ISO 8601
  location?: LocationData;
}

// PUT /api/v1/trips/:tripId/events/:eventId
interface UpdateEventRequest {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: LocationData;
  sortOrder?: number;
}

interface EventDetail {
  id: string;
  tripId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  location: LocationData | null;
  status: EventStatus;
  suggestedBy: UserPublicBrief;  // { id, displayName, username }
  approvedBy: UserPublicBrief | null;
  approvedAt: string | null;
  hasConflict: boolean;          // Computed: overlaps with another approved event
  conflictsWith: string[];       // IDs of conflicting events
  createdAt: string;
  updatedAt: string;
}
```

### Items

| Method | Path | Description | Auth | Access |
|--------|------|-------------|------|--------|
| `GET` | `/api/v1/trips/:tripId/items` | List items | Yes | Member |
| `POST` | `/api/v1/trips/:tripId/items` | Create item | Yes | Host |
| `GET` | `/api/v1/trips/:tripId/items/:itemId` | Get item detail | Yes | Member |
| `PUT` | `/api/v1/trips/:tripId/items/:itemId` | Update item | Yes | Host |
| `DELETE` | `/api/v1/trips/:tripId/items/:itemId` | Delete item | Yes | Host |

```typescript
// GET /api/v1/trips/:tripId/items (query params)
interface ListItemsQuery {
  category?: string;
  type?: ItemType;             // Phase 1: always 'recommended'
  isRequired?: boolean;
  sort?: 'name' | 'category' | 'priority' | 'createdAt';
  order?: 'asc' | 'desc';
}

// POST /api/v1/trips/:tripId/items
interface CreateItemRequest {
  name: string;          // 1-255 chars
  description?: string;
  category: string;      // food, equipment, safety, clothing, hygiene, other
  type?: ItemType;       // Phase 1: defaults to RECOMMENDED
  quantityNeeded?: number; // default 1
  isRequired?: boolean;  // default false
  priority?: number;     // 0=normal, 1=high, 2=critical
}

// Batch create for convenience
// POST /api/v1/trips/:tripId/items/batch
interface BatchCreateItemsRequest {
  items: CreateItemRequest[];
}

interface ItemDetail {
  id: string;
  tripId: string;
  name: string;
  description: string | null;
  category: string;
  type: ItemType;
  quantityNeeded: number;
  isRequired: boolean;
  priority: number;
  createdBy: UserPublicBrief;
  createdAt: string;
  updatedAt: string;
}
```

### Invites

| Method | Path | Description | Auth | Access |
|--------|------|-------------|------|--------|
| `POST` | `/api/v1/trips/:tripId/invites/link` | Generate invite link | Yes | Host |
| `POST` | `/api/v1/trips/:tripId/invites/email` | Send email invite | Yes | Host |
| `GET` | `/api/v1/trips/:tripId/invites` | List pending invites | Yes | Host |
| `DELETE` | `/api/v1/invites/:inviteId` | Revoke invite | Yes | Host |
| `GET` | `/api/v1/invites/:code` | Get invite info (public) | No | - |
| `POST` | `/api/v1/invites/:code/accept` | Accept invite | Yes | - |

```typescript
// POST /api/v1/trips/:tripId/invites/link
interface CreateLinkInviteRequest {
  expiresInDays?: number;  // default 7, max 30
}
interface CreateLinkInviteResponse {
  code: string;
  url: string;             // {APP_URL}/invite/{code}
  expiresAt: string;
}

// POST /api/v1/trips/:tripId/invites/email
interface CreateEmailInviteRequest {
  emails: string[];        // 1-20 emails
  message?: string;        // optional personal message
  expiresInDays?: number;  // default 7
}

// GET /api/v1/invites/:code (public, no auth)
interface InviteInfoResponse {
  tripTitle: string;
  tripType: string;
  startDate: string | null;
  endDate: string | null;
  hostName: string;
  memberCount: number;
  status: InviteStatus;
}
```

### Notifications

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/notifications` | List notifications (paginated) | Yes |
| `GET` | `/api/v1/notifications/unread-count` | Get unread count | Yes |
| `PUT` | `/api/v1/notifications/:id/read` | Mark single as read | Yes |
| `PUT` | `/api/v1/notifications/read-all` | Mark all as read | Yes |

```typescript
// GET /api/v1/notifications (query params)
interface ListNotificationsQuery {
  unreadOnly?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;  // default 20, max 50
}

interface NotificationDetail {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: {
    tripId?: string;
    eventId?: string;
    inviteId?: string;
  };
  readAt: string | null;
  createdAt: string;
}
```

### Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/health` | System health check | No |

```typescript
interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;           // seconds
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    email: 'ok' | 'error';
  };
  timestamp: string;
}
```

---

## Backend Libraries

```json
{
  "dependencies": {
    // Core framework
    "express": "^4.18",
    "cors": "^2.8",
    "helmet": "^7.1",
    "compression": "^1.7",
    "cookie-parser": "^1.4",

    // Database
    "@prisma/client": "^5.10",
    "ioredis": "^5.3",

    // Authentication
    "bcrypt": "^5.1",
    "jsonwebtoken": "^9.0",

    // Validation
    "express-validator": "^7.0",
    "zod": "^3.22",

    // Rate limiting
    "express-rate-limit": "^7.1",
    "rate-limit-redis": "^4.1",

    // Email
    "nodemailer": "^6.9",
    "handlebars": "^4.7",

    // Utilities
    "uuid": "^9.0",
    "nanoid": "^5.0",
    "date-fns": "^3.3",
    "date-fns-tz": "^2.0",
    "winston": "^3.11",
    "dotenv": "^16.4",
    "http-status-codes": "^2.3"
  },
  "devDependencies": {
    // TypeScript
    "typescript": "^5.3",
    "@types/node": "^20",
    "@types/express": "^4.17",
    "@types/cors": "^2.8",
    "@types/bcrypt": "^5.0",
    "@types/jsonwebtoken": "^9.0",
    "@types/nodemailer": "^6.4",
    "@types/cookie-parser": "^1.4",
    "@types/compression": "^1.7",
    "@types/uuid": "^9.0",
    "tsx": "^4.7",
    "ts-node": "^10.9",

    // Database
    "prisma": "^5.10",

    // Testing
    "jest": "^29.7",
    "ts-jest": "^29.1",
    "@types/jest": "^29.5",
    "supertest": "^6.3",
    "@types/supertest": "^6.0",

    // Linting
    "eslint": "^8.56",
    "@typescript-eslint/eslint-plugin": "^6.21",
    "@typescript-eslint/parser": "^6.21",
    "eslint-config-prettier": "^9.1",

    // Development
    "nodemon": "^3.0",
    "concurrently": "^8.2"
  }
}
```

---

## Frontend Libraries

```json
{
  "dependencies": {
    // Core
    "react": "^18.2",
    "react-dom": "^18.2",
    "react-router-dom": "^6.22",

    // UI Framework
    "@mui/material": "^5.15",
    "@mui/icons-material": "^5.15",
    "@mui/lab": "^5.0",
    "@emotion/react": "^11.11",
    "@emotion/styled": "^11.11",

    // Data Fetching & State
    "@tanstack/react-query": "^5.20",
    "axios": "^1.6",

    // Forms
    "react-hook-form": "^7.50",
    "@hookform/resolvers": "^3.3",
    "zod": "^3.22",

    // Date handling
    "date-fns": "^3.3",
    "@mui/x-date-pickers": "^6.18",

    // Notifications
    "notistack": "^3.0",

    // Utilities
    "clsx": "^2.1"
  },
  "devDependencies": {
    // Build
    "vite": "^5.1",
    "@vitejs/plugin-react": "^4.2",
    "typescript": "^5.3",

    // Types
    "@types/react": "^18.2",
    "@types/react-dom": "^18.2",

    // Testing
    "vitest": "^1.3",
    "@testing-library/react": "^14.2",
    "@testing-library/jest-dom": "^6.4",
    "@testing-library/user-event": "^14.5",
    "msw": "^2.2",

    // Linting
    "eslint": "^8.56",
    "eslint-plugin-react": "^7.33",
    "eslint-plugin-react-hooks": "^4.6"
  }
}
```

---

## Frontend Pages (Detailed)

### 1. Login Page (`/login`)
- **Components**: `LoginForm` (email, password fields, submit button, "forgot password" link, "create account" link)
- **Behavior**: On success, stores tokens via `AuthContext`, redirects to `/dashboard`
- **Validation**: email format, password required
- **Error states**: invalid credentials, rate limited, network error

### 2. Register Page (`/register`)
- **Components**: `RegisterForm` (email, username, display name, password, confirm password)
- **Behavior**: On success, auto-login and redirect to `/dashboard`
- **Validation**: email format, username 3-100 chars alphanumeric, password min 8 chars with complexity, passwords match
- **Error states**: email taken, username taken, validation errors

### 3. Forgot Password Page (`/forgot-password`)
- **Components**: `PasswordResetForm` (email field, submit)
- **Behavior**: Always shows success message (prevents email enumeration)

### 4. Reset Password Page (`/reset-password?token=xxx`)
- **Components**: New password + confirm password fields
- **Behavior**: Validates token on mount, shows error if expired. On success, redirects to `/login`

### 5. Dashboard Page (`/dashboard`) - Protected
- **Components**: `TripList` (grid of `TripCard`s), `SearchInput`, status filter tabs (All, Planning, Confirmed, In Progress, Completed), "Create Trip" FAB button
- **Data**: `useTrips()` hook with React Query
- **Empty state**: Illustration + "Plan your first trip" CTA
- **Layout**: Cards show title, dates, location, member count, trip type icon, user's role badge

### 6. Trip Create Page (`/trips/new`) - Protected
- **Components**: `TripForm` with fields: title, description (rich text optional), trip type dropdown, date range picker, location input (address text field), cover image URL, visibility toggle
- **Behavior**: On submit, creates trip and redirects to `/trips/:id`

### 7. Trip Detail Page (`/trips/:tripId`) - Protected, Member Access
- **Layout**: `TripHeader` (title, dates, location, host badge, status badge, member avatars, edit button if host) + `TripTabs`
- **Tabs**:
  - **Schedule** (default): `EventTimeline` + `EventList` with `EventCard`s. Host sees approve/reject buttons on proposed events. All members see "Suggest Event" button.
  - **Items**: `ItemList` grouped by category with `ItemCard`s. Host sees add/edit/delete controls. Members see read-only list.
  - **Members**: `MemberList` with role badges, host can remove members. Shows invite controls for host.
  - **Announcements**: Chronological list of host announcements. Host sees "New Announcement" form at top.

### 8. Trip Edit Page (`/trips/:tripId/edit`) - Protected, Host Only
- **Components**: Same `TripForm` as create, pre-populated. Additional "Delete Trip" button with `ConfirmDialog`.

### 9. Trip Settings Page (`/trips/:tripId/settings`) - Protected, Host Only
- **Components**: Visibility toggle, max members setting, invite management section with `InviteLinkGenerator` and `InviteEmailForm`, pending invites list

### 10. Invite Accept Page (`/invite/:code`) - Public/Protected
- **Components**: `InviteAcceptCard` showing trip summary (title, type, dates, host, member count)
- **Behavior**: If not logged in, shows login/register options with redirect back. If logged in, shows "Join Trip" button. On accept, redirects to trip detail.

### 11. Profile Page (`/profile`) - Protected
- **Components**: Display name, email (read-only), username (read-only), bio, avatar URL, phone. Separate password change section. Notification preferences toggles.

### 12. 404 Page
- **Components**: Illustration, "Page not found" message, link back to dashboard

---

## Frontend Route Configuration

```tsx
// src/routes.tsx
const routes = [
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/invite/:code', element: <InviteAcceptPage /> },

  // Protected routes (wrapped in AppLayout)
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'trips/new', element: <TripCreatePage /> },
      { path: 'trips/:tripId', element: <TripDetailPage /> },
      { path: 'trips/:tripId/edit', element: <TripEditPage /> },
      { path: 'trips/:tripId/settings', element: <TripSettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },

  // Fallback
  { path: '*', element: <NotFoundPage /> },
];
```

---

## Authentication Flow

### Token Strategy
- **Access Token**: JWT, 15 minute expiry, stored in memory (React state)
- **Refresh Token**: Opaque UUID, 30 day expiry, stored in httpOnly cookie AND localStorage (for SSR flexibility)
- **Token Rotation**: Every refresh issues a new refresh token and revokes the old one

### JWT Payload
```typescript
interface JWTPayload {
  sub: string;       // user ID (UUID)
  email: string;
  username: string;
  iat: number;       // issued at
  exp: number;       // expiration
}
```

### Axios Interceptor Flow
```typescript
// 1. Request interceptor: attach access token
axiosInstance.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response interceptor: handle 401, attempt refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { accessToken } = await refreshTokens();
        authStore.setAccessToken(accessToken);
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(error.config);
      } catch {
        authStore.logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### Password Hashing
- **Algorithm**: bcrypt with 12 rounds
- **Validation**: Minimum 8 characters, at least one uppercase letter, one number

### Password Reset Flow
1. User submits email to `/auth/forgot-password`
2. Backend generates `nanoid(64)` token, stores in `password_resets` table with 1-hour expiry
3. Email sent with link: `{APP_URL}/reset-password?token={token}`
4. User submits new password with token
5. Backend validates token, updates password hash, marks token as used, revokes all refresh tokens

---

## Email System

### Transporter Configuration
```typescript
// Uses Nodemailer with SMTP
const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE === 'true',
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
});
```

### Email Templates (Handlebars)

**Templates included in Phase 1:**

1. **`layout.hbs`** - Base layout with header (app logo), content area, footer (unsubscribe link)
2. **`welcome.hbs`** - Welcome email after registration. Variables: `{ displayName, loginUrl }`
3. **`password-reset.hbs`** - Password reset link. Variables: `{ displayName, resetUrl, expiresIn }`
4. **`trip-invite.hbs`** - Trip invitation. Variables: `{ senderName, tripTitle, tripType, startDate, endDate, personalMessage?, inviteUrl }`
5. **`trip-updated.hbs`** - Trip details changed. Variables: `{ tripTitle, changedFields[], tripUrl }`
6. **`event-added.hbs`** - New event on schedule. Variables: `{ tripTitle, eventTitle, eventTime, eventLocation?, tripUrl }`

### Notification Delivery Logic
```typescript
// When a notification-worthy event occurs:
async function notifyTripMembers(tripId: string, notification: CreateNotification) {
  const members = await prisma.tripMember.findMany({
    where: { tripId, status: 'ACTIVE' },
    include: { user: true },
  });

  for (const member of members) {
    // Skip the actor who triggered the event
    if (member.userId === notification.excludeUserId) continue;

    const prefs = member.user.preferences as UserPreferences;

    // Always create in-app notification
    if (prefs.notifications?.inApp !== false) {
      await prisma.notification.create({
        data: {
          userId: member.userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
      });
    }

    // Send email if enabled
    if (prefs.notifications?.email !== false) {
      await emailService.send(
        member.user.email,
        notification.emailTemplate,
        notification.emailData,
      );
    }
  }
}
```

---

## Error Handling

### Custom Error Classes
```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

class ValidationError extends AppError {
  constructor(errors: Array<{ field: string; message: string }>) {
    super(422, 'VALIDATION_ERROR', 'Validation failed', { errors });
  }
}

class RateLimitError extends AppError {
  constructor() {
    super(429, 'RATE_LIMITED', 'Too many requests');
  }
}
```

### Standard Error Response Shape
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Global error handler middleware
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Log unexpected errors
  logger.error('Unhandled error', { error: err, path: req.path });

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

---

## Access Control Middleware

```typescript
// Verify user is a member of the trip
function requireTripMember(req: Request, res: Response, next: NextFunction) {
  const { tripId } = req.params;
  const userId = req.user.id;

  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('You are not a member of this trip');
  }

  req.tripMembership = membership;
  next();
}

// Verify user is the host of the trip
function requireTripHost(req: Request, res: Response, next: NextFunction) {
  if (req.tripMembership?.role !== 'HOST') {
    throw new ForbiddenError('Only the trip host can perform this action');
  }
  next();
}
```

---

## Conflict Detection (Events)

Phase 1 includes basic time overlap detection for approved events:

```typescript
async function detectConflicts(tripId: string, startTime: Date, endTime: Date | null, excludeEventId?: string) {
  const effectiveEnd = endTime ?? new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1hr

  const conflicts = await prisma.event.findMany({
    where: {
      tripId,
      status: 'APPROVED',
      id: excludeEventId ? { not: excludeEventId } : undefined,
      AND: [
        { startTime: { lt: effectiveEnd } },
        {
          OR: [
            { endTime: { gt: startTime } },
            { endTime: null }, // Events without end time: check if start overlaps
          ],
        },
      ],
    },
    select: { id: true, title: true, startTime: true, endTime: true },
  });

  return conflicts;
}
```

---

## Docker Configuration

### docker-compose.yml (Development)
```yaml
version: '3.8'

services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: development
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "3001:3001"
      - "9229:9229"  # Node debugger
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://planner:planner_dev@postgres:5432/group_planner_dev
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret-not-for-production
      - SMTP_HOST=mailhog
      - SMTP_PORT=1025
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npx nodemon --inspect=0.0.0.0:9229 src/index.ts

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:3001/api/v1

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: group_planner_dev
      POSTGRES_USER: planner
      POSTGRES_PASSWORD: planner_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U planner"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  mailhog:
    image: mailhog/mailhog
    ports:
      - "8025:8025"  # Web UI for viewing dev emails
      - "1025:1025"  # SMTP

volumes:
  postgres_dev:
```

### Backend Dockerfile
```dockerfile
# Multi-stage build

# --- Development ---
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npx", "tsx", "watch", "src/index.ts"]

# --- Build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Production ---
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN npx prisma generate
USER appuser
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Frontend Dockerfile
```dockerfile
# --- Development ---
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- Build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Production ---
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

---

## Testing Strategy

### Backend Testing

**Unit Tests** (services, utils):
- Mock Prisma client using `jest.mock`
- Test business logic in isolation
- Example: `auth.service.test.ts` tests registration validation, duplicate email handling, token generation

**Integration Tests** (routes):
- Use Supertest against the Express app
- Use a test database (separate `DATABASE_URL` for test env)
- Run Prisma migrations before test suite
- Clean database between tests using transaction rollback or truncation
- Example: `trip.test.ts` tests full CRUD + access control

**Test Structure**:
```typescript
// tests/integration/trip.test.ts
describe('Trip API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user and get token
  });

  afterEach(async () => {
    // Clean up test data
  });

  describe('POST /api/v1/trips', () => {
    it('creates a trip and adds creator as host', async () => { ... });
    it('returns 401 without auth token', async () => { ... });
    it('returns 422 with invalid data', async () => { ... });
  });

  describe('GET /api/v1/trips/:tripId', () => {
    it('returns trip detail for members', async () => { ... });
    it('returns 403 for non-members', async () => { ... });
  });
});
```

### Frontend Testing

**Component Tests** (Vitest + React Testing Library):
- Test component rendering and user interactions
- Mock API calls using MSW (Mock Service Worker)
- Example: `LoginForm.test.tsx` tests form submission, validation display, error handling

**Integration Tests**:
- Test page-level flows (login -> dashboard -> create trip)
- Use MSW handlers for API mocking

---

## Seed Data

```typescript
// prisma/seed.ts
async function seed() {
  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      displayName: 'Admin User',
      passwordHash: await bcrypt.hash('admin123', 12),
      preferences: {
        notifications: { email: true, inApp: true },
        timezone: 'America/New_York',
      },
    },
  });

  // Create demo trip
  const trip = await prisma.trip.create({
    data: {
      title: 'Summer Camping Trip',
      description: 'Annual group camping adventure',
      tripType: 'camping',
      startDate: new Date('2026-07-15'),
      endDate: new Date('2026-07-20'),
      location: {
        address: 'Yosemite National Park, CA',
        coordinates: { lat: 37.8651, lng: -119.5383 },
        timezone: 'America/Los_Angeles',
      },
      status: 'PLANNING',
      hostId: admin.id,
    },
  });

  // Add host as member
  await prisma.tripMember.create({
    data: { tripId: trip.id, userId: admin.id, role: 'HOST' },
  });

  // Create sample events
  await prisma.event.createMany({
    data: [
      {
        tripId: trip.id,
        title: 'Arrive & Set Up Camp',
        startTime: new Date('2026-07-15T14:00:00'),
        endTime: new Date('2026-07-15T17:00:00'),
        status: 'APPROVED',
        suggestedBy: admin.id,
        approvedBy: admin.id,
      },
      {
        tripId: trip.id,
        title: 'Sunset Hike to Glacier Point',
        startTime: new Date('2026-07-15T18:00:00'),
        endTime: new Date('2026-07-15T20:30:00'),
        status: 'APPROVED',
        suggestedBy: admin.id,
        approvedBy: admin.id,
      },
    ],
  });

  // Create recommended items
  await prisma.item.createMany({
    data: [
      { tripId: trip.id, name: 'Sleeping bag (rated to 30F)', category: 'equipment', type: 'RECOMMENDED', isRequired: true, priority: 2, createdBy: admin.id },
      { tripId: trip.id, name: 'Headlamp with extra batteries', category: 'equipment', type: 'RECOMMENDED', isRequired: true, priority: 1, createdBy: admin.id },
      { tripId: trip.id, name: 'Sunscreen SPF 50+', category: 'safety', type: 'RECOMMENDED', isRequired: true, priority: 1, createdBy: admin.id },
      { tripId: trip.id, name: 'Hiking boots (broken in)', category: 'clothing', type: 'RECOMMENDED', isRequired: true, priority: 2, createdBy: admin.id },
      { tripId: trip.id, name: 'Camp chair', category: 'equipment', type: 'RECOMMENDED', isRequired: false, priority: 0, createdBy: admin.id },
      { tripId: trip.id, name: 'Playing cards', category: 'other', type: 'RECOMMENDED', isRequired: false, priority: 0, createdBy: admin.id },
    ],
  });
}
```

---

## Environment Variables

```bash
# .env.example

# === Application ===
NODE_ENV=production
APP_PORT=3001
APP_URL=https://your-domain.com
APP_NAME="Group Trip Planner"

# === Database ===
DATABASE_URL=postgresql://planner:CHANGE_ME@postgres:5432/group_planner
DB_NAME=group_planner
DB_USER=planner
DB_PASSWORD=CHANGE_ME

# === Redis ===
REDIS_URL=redis://redis:6379

# === Authentication ===
JWT_SECRET=CHANGE_ME_MIN_32_CHARS_RANDOM_STRING
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
BCRYPT_ROUNDS=12

# === Email (SMTP) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Group Trip Planner <noreply@your-domain.com>"

# === Rate Limiting ===
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_API_MAX=1000
RATE_LIMIT_API_WINDOW_MS=900000

# === Logging ===
LOG_LEVEL=info

# === Feature Flags (Phase 1: all false) ===
FEATURE_BUDGET=false
FEATURE_WEATHER=false
FEATURE_PHOTOS=false
FEATURE_ANALYTICS=false
```

---

## What Phase 1 Does NOT Include

These are explicitly deferred to Phase 2+:

1. **Shared item claiming** - Phase 2
2. **WebSocket real-time updates** - Phase 2 (Phase 1 uses polling or page refresh)
3. **React Native mobile app** - Phase 2
4. **Event voting/polling** - Phase 2
5. **Plugin system runtime** - Phase 3 (schema is laid in Phase 1)
6. **Admin dashboard** - Phase 3
7. **File upload for images** - Phase 2 (Phase 1 uses URL-based cover images)
8. **Advanced conflict detection with rescheduling** - Phase 3
9. **Rich text editing** - Phase 2

---

## Phase 1 Completion Criteria

Phase 1 is done when:

- [ ] A user can register, login, and reset their password
- [ ] A user can create a trip with title, dates, location, and description
- [ ] A host can add recommended items organized by category
- [ ] A host can add events to the schedule
- [ ] Members can suggest events; hosts can approve or reject them
- [ ] The schedule shows basic time conflict warnings
- [ ] A host can generate invite links and send email invitations
- [ ] A user can accept an invite and join a trip
- [ ] Email notifications are sent for trip updates, new events, and invitations
- [ ] In-app notifications are viewable with unread count
- [ ] A host can post announcements to trip members
- [ ] The app deploys via `docker-compose up -d` with PostgreSQL and Redis
- [ ] Health check endpoint returns database and Redis status
- [ ] All API endpoints have integration tests
- [ ] Frontend pages render correctly and handle loading/error states
