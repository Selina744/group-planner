# Item Service

The **Item Service** is the central API surface for collaborating on trip items, including
recommended lists (any member can add) and shared lists (host/co-host only). It combines
business logic (item lifecycle, role-based ownership, claim tracking) with responsive API
patterns and Prisma database transactions so that upstream features such as planning and
notifications can rely on a stable foundation.

## Endpoint Summary

| Method | Path | Purpose | Auth | Input Highlights |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/items` | Create a recommended or shared item | Confirmed trip member | Validates `tripId`, `name`, `type`, optional `category`, `quantityNeeded`, `isEssential`, `metadata` |
| GET | `/api/v1/items` | List items with filters, pagination, sorting, and search | Confirmed trip member | `tripId` required; optional filters include `type`, `category`, `isEssential`, `createdBy`, `claimedBy`, `unclaimedOnly`, `search` |
| GET | `/api/v1/items/:id` | Fetch item details with claims and fulfillment status | Confirmed trip member | `id` must be UUID |
| PUT | `/api/v1/items/:id` | Update item metadata, type, quantity, or essential flag | Item creator or host/co-host | Validates length, quantity bounds, and ownership; ensures SHARED type changes only by host/co-host |
| DELETE | `/api/v1/items/:id` | Remove an item (claims cascade-delete) | Item creator or host | Logs warning if active claims exist but still enforces deletion ownership rules |
| POST | `/api/v1/items/:id/claim` | Claim quantity toward an item | Confirmed trip member (not own item) | Quantities between 1 and 100 allowed; prevents duplicate claims for same user |
| PUT | `/api/v1/claims/:id` | Update claim state, quantity, or notes | Claim owner or host/co-host | Enforces quantity bounds, status transitions, and ownership checks |
| DELETE | `/api/v1/claims/:id` | Cancel a claim | Claim owner or host | Soft-clear statuses and adjusts fulfillment counters |
| GET | `/api/v1/trips/:tripId/items/stats` | Trip-level statistics for planning dashboards | Confirmed trip member | Aggregates counts by type, essential flag, fulfillment, and claim status |


## Authorization & Ownership Rules

1. **Recommended items** may be created by any confirmed trip member (member, co-host, host). Shared
   items are restricted to `HOST` or `CO_HOST` roles. The service verifies membership via the
   `TripMember` table and throws `ForbiddenError` otherwise.
2. Only the item creator or `HOST/CO_HOST` can update an item. Shared-type transitions require host-level privileges.
3. Deletion is limited to the creator and the `HOST` role; the system logs a warning when deleting an
   item that already has claims, then cascades the removal.
4. Claim updates are limited to the claim owner or `HOST/CO_HOST`, while claim cancellations can be performed
   by the owner or the `HOST` to help redistribute responsibilities.

## Validation & Zod Schemas

The item routes layer uses Zod schemas to safeguard inputs:

- `CreateItemRequest`: Requires `tripId`, `name` (1-200 chars), `type`, and optionally trims `description`, `category`, and `metadata`.  `quantityNeeded` defaults to `1` and `isEssential` defaults to `false`.
- `UpdateItemRequest`: Mirrors the creation schema but makes everything optional while guarding length and quantity range and trimming strings.
- `ClaimItemRequest`: Quantities must be integers between `1` and `100`, and `notes` is optional (max 500 chars).
- `UpdateClaimRequest`: Permits changing quantity/status/notes with the same bounds and status enumeration (`CLAIMED`, `BROUGHT`, `CANCELLED`).
- `Item list queries`: Validate pagination params, sorts (`name`, `type`, `quantityNeeded`, `createdAt`, `updatedAt`), boolean flags like `isEssential`/`unclaimedOnly`, and search strings (max 100 chars).

## Business Logic Highlights

- **isEssential flag**: Every item persists `isEssential` (default `false`) so hosts can mark items critical for the trip. Filters and stats honor this flag, and it can be updated via the standard PUT endpoint.
- **Quantity tracking**: The service blocks quantity reductions below the sum of active claims and calculates `quantityClaimed`, `quantityRemaining`, and `fullyFulfilled` for every item response.
- **Claim lifecycle**: Claims enforce unique `(itemId, userId)` constraints and validate `quantity` to prevent oversubscription. Claim updates recompute fulfillment state, and cancellations adjust counts accordingly while allowing hosts to clean up stale claims.
- **Statistics endpoint**: Aggregates comprehensive trip-wide metrics, including total items, recommended/shared splits, essential counts, fulfillment rates, and status breakdowns for claims.

## Prisma Integration

All operations run through the Prisma client with `safePrismaOperation` wrappers for consistent error handling. Included relations (`createdBy`, `claims`, and claim `user` data) keep API responses concise but rich.

## Example Create Request

```json
POST /api/v1/items
Content-Type: application/json

{
  "tripId": "trip-abc",
  "name": "First aid kit",
  "type": "SHARED",
  "category": "SAFETY",
  "quantityNeeded": 2,
  "isEssential": true,
  "metadata": {
    "location": "main bag"
  }
}
```

## Error Handling

The service throws custom errors (`BadRequestError`, `ForbiddenError`, `NotFoundError`, `ConflictError`) for predictable failure modes. Controllers log contextual metadata (user IDs, item IDs, request IDs) to help diagnose issues in production logs.

---

This doc captures the item coordination surface so downstream teams (frontend, mobile, ops) understand how to interact with the CRUD flows, the essential flag, and the authorization guards.
