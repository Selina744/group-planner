# Phase 1 Implementation Plan — Hybrid

*Synthesized from BrownDog, EmeraldOwl, and HazyBear proposals*

---

## 1. Architecture Overview

- **Backend:** Node.js + TypeScript, Express.js, Prisma ORM, PostgreSQL, Redis
- **Web Client:** React 18 + TypeScript, Vite, Material UI v5, TanStack React Query, Zustand, React Hook Form + Zod, Socket.io-client
- **Mobile Client:** React Native + TypeScript (iOS + Android from day one)
- **Real-time:** Socket.io with Redis adapter stub (single instance Phase 1, horizontally scalable later)
- **Email:** Nodemailer + Handlebars templates
- **Infrastructure:** Docker Compose (dev + prod), Nginx reverse proxy
- **Testing:** Vitest + Supertest (backend), React Testing Library (frontend)

---

## 2. Project Structure

```
group-planner/
├── backend/
│   └── src/
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── trips.controller.ts
│       │   ├── events.controller.ts
│       │   ├── items.controller.ts
│       │   ├── members.controller.ts
│       │   └── notifications.controller.ts
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── trip.service.ts
│       │   ├── event.service.ts
│       │   ├── item.service.ts
│       │   ├── notification.service.ts
│       │   ├── email.service.ts
│       │   └── socket.service.ts
│       ├── middleware/
│       │   ├── auth.middleware.ts
│       │   ├── rbac.middleware.ts
│       │   ├── validate.middleware.ts
│       │   ├── errorHandler.middleware.ts
│       │   └── rateLimiter.middleware.ts
│       ├── schemas/
│       │   ├── auth.schema.ts
│       │   ├── trip.schema.ts
│       │   ├── event.schema.ts
│       │   ├── item.schema.ts
│       │   └── notification.schema.ts
│       ├── types/
│       │   ├── auth.types.ts
│       │   ├── trip.types.ts
│       │   ├── event.types.ts
│       │   ├── item.types.ts
│       │   ├── notification.types.ts
│       │   ├── api.types.ts
│       │   └── express.d.ts
│       ├── sockets/
│       │   ├── index.ts
│       │   ├── trip.sockets.ts
│       │   └── notification.sockets.ts
│       ├── jobs/
│       │   ├── digestEmail.job.ts
│       │   └── unclaimedReminder.job.ts
│       ├── utils/
│       │   ├── errors.ts
│       │   ├── logger.ts
│       │   ├── wrapAsync.ts
│       │   └── apiResponse.ts
│       ├── emails/
│       │   ├── verification.hbs
│       │   ├── passwordReset.hbs
│       │   ├── tripInvite.hbs
│       │   ├── eventUpdate.hbs
│       │   ├── itemReminder.hbs
│       │   └── digest.hbs
│       └── app.ts
├── backend/prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── backend/tests/
│   ├── auth.test.ts
│   ├── trips.test.ts
│   ├── events.test.ts
│   ├── items.test.ts
│   └── setup.ts
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── Layout.tsx
│       │   ├── auth/
│       │   │   ├── LoginForm.tsx
│       │   │   ├── RegisterForm.tsx
│       │   │   ├── PasswordResetForm.tsx
│       │   │   └── ProtectedRoute.tsx
│       │   ├── trips/
│       │   │   ├── TripCard.tsx
│       │   │   ├── TripList.tsx
│       │   │   ├── TripForm.tsx
│       │   │   ├── TripDetails.tsx
│       │   │   ├── MemberList.tsx
│       │   │   └── InviteModal.tsx
│       │   ├── events/
│       │   │   ├── EventCard.tsx
│       │   │   ├── EventList.tsx
│       │   │   ├── EventForm.tsx
│       │   │   ├── Timeline.tsx
│       │   │   └── ConflictWarning.tsx
│       │   ├── items/
│       │   │   ├── ItemCard.tsx
│       │   │   ├── ItemList.tsx
│       │   │   ├── ItemForm.tsx
│       │   │   ├── ClaimButton.tsx
│       │   │   └── ClaimProgress.tsx
│       │   ├── notifications/
│       │   │   ├── NotificationBell.tsx
│       │   │   ├── NotificationList.tsx
│       │   │   └── NotificationCard.tsx
│       │   └── common/
│       │       ├── LoadingSpinner.tsx
│       │       ├── ErrorMessage.tsx
│       │       ├── ConfirmDialog.tsx
│       │       └── EmptyState.tsx
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   ├── VerifyEmailPage.tsx
│       │   │   ├── ForgotPasswordPage.tsx
│       │   │   └── ResetPasswordPage.tsx
│       │   ├── dashboard/
│       │   │   └── DashboardPage.tsx
│       │   ├── trips/
│       │   │   ├── TripsPage.tsx
│       │   │   ├── TripDetailsPage.tsx
│       │   │   ├── CreateTripPage.tsx
│       │   │   └── JoinTripPage.tsx
│       │   ├── profile/
│       │   │   └── ProfilePage.tsx
│       │   └── NotFoundPage.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useTrips.ts
│       │   ├── useEvents.ts
│       │   ├── useItems.ts
│       │   ├── useNotifications.ts
│       │   └── useSocket.ts
│       ├── services/
│       │   ├── api.ts              # Axios instance with interceptors
│       │   ├── auth.service.ts
│       │   ├── trips.service.ts
│       │   ├── events.service.ts
│       │   ├── items.service.ts
│       │   └── notifications.service.ts
│       ├── store/
│       │   ├── authStore.ts
│       │   ├── tripStore.ts
│       │   ├── notificationStore.ts
│       │   └── uiStore.ts
│       ├── types/
│       │   ├── api.types.ts
│       │   ├── auth.types.ts
│       │   ├── trip.types.ts
│       │   └── ui.types.ts
│       ├── utils/
│       │   ├── constants.ts
│       │   ├── format.ts
│       │   ├── validation.ts
│       │   └── socket.ts
│       ├── styles/
│       │   ├── theme.ts
│       │   └── globals.css
│       ├── App.tsx
│       └── main.tsx
├── mobile/                          # React Native
│   └── (standard Expo/RN structure)
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx/
│   └── default.conf
└── docs/
    ├── self-hosting.md
    ├── api.md
    └── development.md
```

---

## 3. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth & Users ──────────────────────────────────

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  username      String   @unique
  displayName   String
  passwordHash  String
  emailVerified Boolean  @default(false)
  timezone      String   @default("UTC")
  preferences   Json     @default("{}")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  refreshTokens        RefreshToken[]
  passwordResets       PasswordReset[]
  tripMemberships      TripMember[]
  suggestedEvents      Event[]        @relation("EventSuggestor")
  approvedEvents       Event[]        @relation("EventApprover")
  createdItems         Item[]
  itemClaims           ItemClaim[]
  notifications        Notification[]
  notificationPrefs    NotificationPreference[]
  announcements        Announcement[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model PasswordReset {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_resets")
}

// ─── Trips ─────────────────────────────────────────

enum TripStatus {
  PLANNING
  ACTIVE
  COMPLETED
  CANCELLED
}

model Trip {
  id          String     @id @default(uuid())
  title       String
  description String?
  location    Json?      // { address, coordinates?, timezone?, city?, region?, country? }
  startDate   DateTime?
  endDate     DateTime?
  status      TripStatus @default(PLANNING)
  inviteCode  String?    @unique
  metadata    Json       @default("{}")
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  members       TripMember[]
  events        Event[]
  items         Item[]
  notifications Notification[]
  announcements Announcement[]
  extensions    TripExtension[]
  notifPrefs    NotificationPreference[]

  @@map("trips")
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

model TripMember {
  tripId    String
  userId    String
  role      MemberRole   @default(MEMBER)
  status    MemberStatus @default(ACCEPTED)
  joinedAt  DateTime     @default(now())

  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([tripId, userId])
  @@map("trip_members")
}

// ─── Schedule ──────────────────────────────────────

enum EventStatus {
  PROPOSED
  APPROVED
  CANCELLED
}

model Event {
  id            String      @id @default(uuid())
  tripId        String
  title         String
  description   String?
  location      Json?
  startTime     DateTime?
  endTime       DateTime?
  isAllDay      Boolean     @default(false)
  status        EventStatus @default(PROPOSED)
  category      String?
  estimatedCost Decimal?
  currency      String?     @default("USD")
  suggestedById String
  approvedById  String?
  metadata      Json        @default("{}")
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  trip       Trip  @relation(fields: [tripId], references: [id], onDelete: Cascade)
  suggestedBy User @relation("EventSuggestor", fields: [suggestedById], references: [id])
  approvedBy  User? @relation("EventApprover", fields: [approvedById], references: [id])

  @@index([tripId, startTime])
  @@map("events")
}

// ─── Items ─────────────────────────────────────────

enum ItemType {
  RECOMMENDED
  SHARED
}

model Item {
  id             String   @id @default(uuid())
  tripId         String
  name           String
  description    String?
  category       String?
  type           ItemType
  quantityNeeded Int      @default(1)
  isEssential    Boolean  @default(false)
  metadata       Json     @default("{}")
  createdById    String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  trip      Trip        @relation(fields: [tripId], references: [id], onDelete: Cascade)
  createdBy User        @relation(fields: [createdById], references: [id])
  claims    ItemClaim[]

  @@index([tripId, type])
  @@map("items")
}

enum ClaimStatus {
  CLAIMED
  BROUGHT
  CANCELLED
}

model ItemClaim {
  id        String      @id @default(uuid())
  itemId    String
  userId    String
  quantity  Int         @default(1)
  status    ClaimStatus @default(CLAIMED)
  notes     String?
  createdAt DateTime    @default(now())

  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([itemId, userId])
  @@map("item_claims")
}

// ─── Notifications ─────────────────────────────────

model Notification {
  id        String   @id @default(uuid())
  userId    String
  tripId    String?
  type      String   // e.g. "event.approved", "item.claimed", "trip.updated"
  title     String
  body      String?
  payload   Json     @default("{}")
  read      Boolean  @default(false)
  readAt    DateTime?
  createdAt DateTime @default(now())

  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  trip Trip? @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@index([userId, read])
  @@map("notifications")
}

model NotificationPreference {
  id              String  @id @default(uuid())
  userId          String
  tripId          String?
  emailEnabled    Boolean @default(true)
  pushEnabled     Boolean @default(true)
  scheduleChanges Boolean @default(true)
  itemUpdates     Boolean @default(true)
  announcements   Boolean @default(true)
  digestFrequency String  @default("daily") // "none", "daily", "weekly"

  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  trip Trip? @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@unique([userId, tripId])
  @@map("notification_preferences")
}

// ─── Announcements ─────────────────────────────────

model Announcement {
  id        String   @id @default(uuid())
  tripId    String
  authorId  String
  title     String
  body      String
  pinned    Boolean  @default(false)
  createdAt DateTime @default(now())

  trip   Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorId], references: [id])

  @@map("announcements")
}

// ─── Extension Tables (future-proof) ───────────────

model TripExtension {
  id            String @id @default(uuid())
  tripId        String
  extensionType String
  data          Json   @default("{}")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@unique([tripId, extensionType])
  @@map("trip_extensions")
}
```

**Key schema decisions:**
- **CO_HOST role** (from EmeraldOwl): allows trip hosts to delegate management
- **ItemClaim with status** (from EmeraldOwl): tracks CLAIMED/BROUGHT/CANCELLED lifecycle
- **isEssential flag** (from EmeraldOwl): highlights critical shared items
- **NotificationPreference table** (from HazyBear): per-trip notification control including digest frequency
- **Event estimatedCost/currency** (from EmeraldOwl): lightweight cost tracking without full budget system
- **Location as JSONB** (from HazyBear/EmeraldOwl): flexible location storage with optional coordinates
- **Extension tables** (from BrownDog/HazyBear): clean hook for future plugin data
- **TripStatus enum** (from EmeraldOwl): explicit trip lifecycle states

---

## 4. API Endpoints

All responses use a standard envelope:
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: { field: string; message: string }[];
  pagination?: { page: number; limit: number; total: number; pages: number };
}
```

### Authentication
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login, returns JWT pair | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |
| POST | `/api/v1/auth/logout` | Revoke refresh token | Yes |
| GET | `/api/v1/auth/verify-email/:token` | Verify email address | No |
| POST | `/api/v1/auth/forgot-password` | Request password reset | No |
| POST | `/api/v1/auth/reset-password` | Reset password with token | No |
| GET | `/api/v1/auth/me` | Get current user profile | Yes |
| PUT | `/api/v1/auth/me` | Update profile | Yes |

### Trips
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/trips` | Create trip | Yes |
| GET | `/api/v1/trips` | List user's trips (filterable, paginated) | Yes |
| GET | `/api/v1/trips/:tripId` | Get trip details | Yes (member) |
| PUT | `/api/v1/trips/:tripId` | Update trip | Yes (host/co-host) |
| DELETE | `/api/v1/trips/:tripId` | Delete trip | Yes (host) |
| POST | `/api/v1/trips/:tripId/invite` | Generate invite code | Yes (host/co-host) |
| POST | `/api/v1/trips/join` | Join trip by invite code | Yes |

### Members
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/trips/:tripId/members` | List members | Yes (member) |
| PUT | `/api/v1/trips/:tripId/members/:userId` | Update role (promote to co-host) | Yes (host) |
| DELETE | `/api/v1/trips/:tripId/members/:userId` | Remove member | Yes (host/co-host) |
| DELETE | `/api/v1/trips/:tripId/members/me` | Leave trip | Yes (member) |

### Events (Schedule)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/trips/:tripId/events` | List events (filterable by status/date) | Yes (member) |
| POST | `/api/v1/trips/:tripId/events` | Create event (proposed if member, approved if host) | Yes (member) |
| PUT | `/api/v1/trips/:tripId/events/:eventId` | Update event | Yes (host/co-host or creator) |
| DELETE | `/api/v1/trips/:tripId/events/:eventId` | Delete event | Yes (host/co-host) |
| POST | `/api/v1/trips/:tripId/events/:eventId/approve` | Approve proposed event | Yes (host/co-host) |
| POST | `/api/v1/trips/:tripId/events/:eventId/cancel` | Cancel event | Yes (host/co-host) |

### Items
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/trips/:tripId/items` | List items (filterable by type) | Yes (member) |
| POST | `/api/v1/trips/:tripId/items` | Create item | Yes (host/co-host for shared, any for recommended) |
| PUT | `/api/v1/trips/:tripId/items/:itemId` | Update item | Yes (host/co-host or creator) |
| DELETE | `/api/v1/trips/:tripId/items/:itemId` | Delete item | Yes (host/co-host) |
| POST | `/api/v1/trips/:tripId/items/:itemId/claim` | Claim shared item | Yes (member) |
| DELETE | `/api/v1/trips/:tripId/items/:itemId/claim` | Unclaim shared item | Yes (claimer) |
| PUT | `/api/v1/trips/:tripId/items/:itemId/claim` | Update claim status (mark BROUGHT) | Yes (claimer) |

### Notifications
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/notifications` | List notifications (paginated, filterable) | Yes |
| PUT | `/api/v1/notifications/:id/read` | Mark as read | Yes |
| PUT | `/api/v1/notifications/read-all` | Mark all as read | Yes |
| GET | `/api/v1/notifications/preferences` | Get notification preferences | Yes |
| PUT | `/api/v1/notifications/preferences` | Update preferences | Yes |

### Announcements
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/trips/:tripId/announcements` | List announcements | Yes (member) |
| POST | `/api/v1/trips/:tripId/announcements` | Create announcement | Yes (host/co-host) |
| PUT | `/api/v1/trips/:tripId/announcements/:id` | Update/pin announcement | Yes (host/co-host) |
| DELETE | `/api/v1/trips/:tripId/announcements/:id` | Delete announcement | Yes (host/co-host) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | API health check |
| GET | `/readyz` | Readiness (DB + Redis) |

---

## 5. Validation (Zod)

All request bodies validated via Zod schemas with a shared `validate` middleware. Example:

```typescript
// schemas/trip.schema.ts
import { z } from 'zod';

export const locationSchema = z.object({
  address: z.string().min(1),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  timezone: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
}).optional();

export const createTripSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  location: locationSchema,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (d) => !d.startDate || !d.endDate || new Date(d.endDate) >= new Date(d.startDate),
  { message: 'endDate must be after startDate', path: ['endDate'] }
);
```

**Why Zod over Joi:** Type inference (`z.infer<typeof schema>`) eliminates duplicate TypeScript interfaces. Schemas double as types.

---

## 6. Error Handling

Custom error classes with centralized error handler middleware (from BrownDog):

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') { super(404, `${resource} not found`); }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(401, message); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(403, message); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(409, message); }
}

export class ValidationError extends AppError {
  constructor(public errors: { field: string; message: string }[]) {
    super(400, 'Validation failed');
  }
}
```

---

## 7. Authentication & Security

- **JWT access tokens**: 15-minute expiry, signed with RS256 or HS256
- **Refresh tokens**: 30-day expiry, stored hashed (SHA-256) in DB, single-use rotation
- **Password hashing**: bcrypt with cost factor 12
- **Email verification**: required before full access; token stored hashed with 24hr expiry
- **Rate limiting**: `express-rate-limit` on auth endpoints (5 attempts/15min for login, 3/hr for password reset)
- **Security headers**: `helmet` middleware
- **CORS**: configurable allowed origins via env var
- **Input sanitization**: Zod validation on all request bodies

### RBAC Middleware

```typescript
// middleware/rbac.middleware.ts
export function requireRole(...roles: MemberRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { tripId } = req.params;
    const membership = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: req.user.userId } },
    });
    if (!membership || !roles.includes(membership.role)) {
      throw new ForbiddenError();
    }
    req.membership = membership;
    next();
  };
}
```

---

## 8. Real-time (Socket.io)

Socket.io server with JWT handshake authentication, organized by trip rooms:

- **Namespace:** default `/`
- **Rooms:** `trip:<tripId>` — joined on trip detail page open
- **Events emitted:**
  - `trip:updated` — trip details changed
  - `event:created`, `event:approved`, `event:cancelled` — schedule changes
  - `item:claimed`, `item:unclaimed` — item claim changes
  - `notification:new` — new notification for user
  - `member:joined`, `member:removed` — membership changes
  - `announcement:new` — new announcement

Redis adapter stub configured for Phase 1 (from HazyBear) — enables horizontal scaling in future without code changes.

---

## 9. Background Jobs

Using `node-cron` (from HazyBear) for simplicity:

1. **Daily digest email** — Configurable per user via `NotificationPreference.digestFrequency`. Summarizes schedule changes, new items, unclaimed essentials.
2. **Unclaimed item reminders** — Sends reminders for essential shared items with `quantityNeeded > claimed` as trip start date approaches.

Jobs produce notifications via the notification service so the same delivery path is used for real-time, email, and push.

---

## 10. Email Templates (Handlebars)

Six templates (from BrownDog) rendered via Handlebars with plain-text fallbacks:

1. `verification.hbs` — Email verification link
2. `passwordReset.hbs` — Password reset link (1hr expiry)
3. `tripInvite.hbs` — Trip invitation with join link
4. `eventUpdate.hbs` — Event approved/cancelled notification
5. `itemReminder.hbs` — Unclaimed essential item reminder
6. `digest.hbs` — Daily/weekly trip digest

---

## 11. Frontend Details

### Libraries
| Library | Purpose |
|---------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| MUI v5 | Component library + theming |
| TanStack React Query | Server state + caching |
| Zustand | Client state (auth, UI) |
| React Hook Form + @hookform/resolvers + zod | Forms with type-safe validation |
| React Router v6 | Routing with auth guards |
| Socket.io-client | Real-time events |
| Axios | HTTP client with token interceptors |
| date-fns | Date formatting |
| notistack | Toast notifications |

### React Query Keys
```
['trips']
['trip', tripId]
['events', tripId]
['items', tripId]
['notifications']
['notification-preferences']
['announcements', tripId]
```

Mutations invalidate relevant query keys. Socket.io events also trigger query invalidation for real-time sync.

### Key Pages

1. **Auth pages** — Login, Register, Verify Email, Forgot Password, Reset Password
2. **Dashboard** — Upcoming trips, quick actions, unread notification count
3. **Trip Detail Shell** — Tabbed layout: Schedule | Items | Members | Announcements | Settings
4. **Schedule Tab** — Timeline grouped by day, event cards with status badges, propose/approve workflow, conflict warnings
5. **Items Tab** — Two sections (recommended checklist, shared items with claim progress bars), quantity indicators
6. **Members Tab** — Member list with roles, invite code generation/sharing, role management for hosts
7. **Notifications Inbox** — Filterable list, mark read, preference toggles
8. **Profile** — Display name, email, timezone, notification defaults

### Axios Interceptor (Token Refresh)

```typescript
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { accessToken } = await authService.refresh();
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);
```

---

## 12. Mobile Client (React Native)

React Native with Expo for cross-platform iOS + Android from day one.

### Libraries
- **Navigation:** React Navigation (stack + bottom tabs)
- **State:** Zustand + TanStack React Query (same patterns as web)
- **HTTP:** Axios with same interceptor pattern
- **Real-time:** Socket.io-client
- **Storage:** expo-secure-store for tokens
- **Push:** expo-notifications + FCM/APNs
- **UI:** React Native Paper or custom MUI-inspired components

### Screens
- Auth (Login, Register, Forgot Password)
- Dashboard (trip list, upcoming events)
- Trip Detail (tabs: Schedule, Items, Members)
- Notifications
- Profile/Settings

### Offline Strategy
- React Query cache persisted to AsyncStorage
- Optimistic updates for claims/reads
- Background fetch for periodic sync

---

## 13. Deployment & Infrastructure

### Docker Compose (dev)
```yaml
services:
  api:
    build: ./backend
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [postgres, redis]
    volumes: ["./backend:/app", "/app/node_modules"]
  web:
    build: ./frontend
    ports: ["5173:5173"]
    volumes: ["./frontend:/app", "/app/node_modules"]
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: group_planner
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

### Docker Compose (prod)
- Multi-stage Dockerfiles for backend and frontend
- Nginx reverse proxy with SSL termination
- Health check endpoints (`/healthz`, `/readyz`)
- Restart policies, resource limits

### Self-Hosting Documentation
- `docs/self-hosting.md`: env var reference, `docker compose up` instructions, backup/restore (`pg_dump`/`pg_restore`), SMTP configuration
- `docs/development.md`: local setup, DB migration, seeding, running tests
- `docs/api.md`: OpenAPI stub for endpoint reference

---

## 14. Testing Strategy

### Backend (Vitest + Supertest)
- **Unit tests:** Service layer logic (conflict detection, claim validation, permission checks)
- **Integration tests:** Full request lifecycle against test PostgreSQL container (`docker-compose.test.yml`)
- **Fixtures:** Reusable factory functions for users, trips, events, items

### Frontend (React Testing Library + Vitest)
- Component render tests for key flows (login, trip creation, item claiming)
- Hook tests for useAuth, useTrips

### CI
- `bun test` runs all backend + frontend tests
- `bun lint` runs ESLint
- `bun build` verifies production build

---

## 15. Seed Data

Seed script (`prisma/seed.ts`) creates:
- 3 demo users (host, co-host, member) with known credentials
- 1 sample trip with location data
- 5 events (mix of approved/proposed)
- 8 items (4 recommended, 4 shared with varying claims)
- Sample notifications and an announcement

---

## 16. Event Conflict Detection

Server-side overlap check (from BrownDog/HazyBear):

```typescript
async function detectConflicts(tripId: string, startTime: Date, endTime: Date, excludeEventId?: string) {
  const overlapping = await prisma.event.findMany({
    where: {
      tripId,
      status: { not: 'CANCELLED' },
      id: excludeEventId ? { not: excludeEventId } : undefined,
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
  });
  return overlapping;
}
```

Returns warnings in the response but allows host override (from HazyBear).

---

## 17. Phase 1 Completion Criteria

- [ ] User registration, login, email verification, password reset
- [ ] Trip CRUD with invite code join flow
- [ ] CO_HOST role promotion and RBAC enforcement
- [ ] Event proposal/approval workflow with conflict detection
- [ ] Recommended + shared item management with claim lifecycle
- [ ] Real-time updates via Socket.io for all mutations
- [ ] Notification system (in-app, email, configurable preferences)
- [ ] Announcements for host-to-group communication
- [ ] Daily digest and unclaimed item reminder jobs
- [ ] React web client with all pages functional
- [ ] React Native mobile client with core flows
- [ ] Docker Compose dev + prod configurations
- [ ] Self-hosting documentation
- [ ] Seed data for demo/testing
- [ ] Test suite covering critical paths

---

## Attribution

| Feature | Source |
|---------|--------|
| Zod validation, custom error classes, Handlebars templates, seed data, Axios interceptors | BrownDog |
| CO_HOST role, TripStatus enum, LocationData structure, ItemClaim status lifecycle, isEssential flag, email verification, pagination/filters, estimatedCost on events | EmeraldOwl |
| NotificationPreference table, node-cron jobs (digest + reminders), Socket.io Redis adapter stub, vitest, quantity tracking, audit-ready extension tables | HazyBear |
