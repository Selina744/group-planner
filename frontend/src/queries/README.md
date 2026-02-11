# React Query Integration

This directory contains the React Query (TanStack Query) setup for server state management in the group-planner frontend.

## Overview

React Query is configured to work alongside our existing Zustand stores:

- **Zustand stores**: Client state (UI state, local preferences, etc.)
- **React Query**: Server state (API data, caching, background updates)

## Configuration

### QueryClient Settings

As specified in requirements:
- **Stale Time**: 5 minutes
- **Retry**: 1 attempt
- **Cache Time**: 10 minutes
- **Window focus refetch**: Enabled

### Provider Setup

The `QueryProvider` is configured in the app root:

```tsx
<BrowserRouter>
  <QueryProvider>
    <StoreProvider>
      <AuthProvider>
        {/* App content */}
      </AuthProvider>
    </StoreProvider>
  </QueryProvider>
</BrowserRouter>
```

## Query Keys

### Structure

Query keys follow a hierarchical pattern:

```typescript
['entity', ...identifiers, filters]
```

### Examples

```typescript
// All trips
queryKeys.trips.all // ['trips']

// User's trips list
queryKeys.trips.list() // ['trips', 'list', { filters }]

// Specific trip
queryKeys.trips.detail('trip-123') // ['trips', 'detail', 'trip-123']

// Trip members
queryKeys.trips.members('trip-123') // ['trips', 'detail', 'trip-123', 'members']
```

### Available Keys

- **trips**: all, lists, detail, members, events, items
- **events**: all, lists, detail
- **items**: all, lists, detail, claims
- **notifications**: all, lists, unread, unreadCount
- **announcements**: all, lists, detail, pinned
- **preferences**: all, user, settings
- **auth**: all, user, sessions, permissions
- **search**: all, trips, users, global

## Usage Examples

### Basic Query

```tsx
import { useTripsQuery } from '../queries';

function TripsPage() {
  const { data: trips, isLoading, error } = useTripsQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {trips.map(trip => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
```

### Query with Filters

```tsx
import { useTripsQuery } from '../queries';

function SearchableTrips() {
  const [search, setSearch] = useState('');

  const { data: trips } = useTripsQuery({
    search,
    isPublic: true
  });

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search trips..."
      />
      {/* Render trips */}
    </div>
  );
}
```

### Mutations

```tsx
import { useCreateTripMutation } from '../queries';

function CreateTripForm() {
  const createTrip = useCreateTripMutation();

  const handleSubmit = (tripData) => {
    createTrip.mutate(tripData, {
      onSuccess: (newTrip) => {
        navigate(`/trips/${newTrip.id}`);
      },
      onError: (error) => {
        console.error('Failed to create trip:', error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={createTrip.isPending}>
        {createTrip.isPending ? 'Creating...' : 'Create Trip'}
      </button>
    </form>
  );
}
```

### Prefetching

```tsx
import { usePrefetchTrip } from '../queries';

function TripPreview({ tripId }) {
  const prefetchTrip = usePrefetchTrip();

  return (
    <div
      onMouseEnter={() => prefetchTrip(tripId)}
      onClick={() => navigate(`/trips/${tripId}`)}
    >
      Trip Preview
    </div>
  );
}
```

### Cache Management

```tsx
import { useCacheInvalidation } from '../queries';

function TripActions({ tripId }) {
  const { invalidateTrip, clearAll } = useCacheInvalidation();

  const handleTripUpdate = () => {
    // After updating a trip, invalidate related queries
    invalidateTrip(tripId);
  };

  const handleLogout = () => {
    // Clear all cached data on logout
    clearAll();
  };

  return (
    <div>
      <button onClick={handleTripUpdate}>Update Trip</button>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

## Integration with Zustand

React Query and Zustand work together:

### Server State (React Query)
- API responses
- Background updates
- Cache management
- Optimistic updates

### Client State (Zustand)
- UI state (modals, navigation)
- User preferences
- Local form state
- Authentication state

### Example Integration

```tsx
// Zustand for UI state
const { isModalOpen, setModalOpen } = useUIStore();

// React Query for server state
const { data: trips, isLoading } = useTripsQuery();

return (
  <div>
    <button onClick={() => setModalOpen(true)}>
      Create Trip
    </button>

    {isModalOpen && (
      <CreateTripModal
        isLoading={isLoading}
        onSuccess={() => setModalOpen(false)}
      />
    )}

    <TripsList trips={trips} />
  </div>
);
```

## Development Tools

In development mode, React Query DevTools are available:

- **Bottom-right corner**: Query inspector button
- **Query Explorer**: View all active queries
- **Cache Inspector**: Examine cached data
- **Network Activity**: Monitor background refetches

## Best Practices

### 1. Use Appropriate Keys
```tsx
// ✅ Good - specific and hierarchical
queryKeys.trips.detail(tripId)

// ❌ Bad - too generic
['trip', tripId]
```

### 2. Handle Loading States
```tsx
// ✅ Good - proper loading handling
if (isLoading) return <Skeleton />;
if (error) return <ErrorBoundary error={error} />;

// ❌ Bad - no loading state
return <div>{data.trips.map(...)}</div>;
```

### 3. Use Mutations for Updates
```tsx
// ✅ Good - use mutation hooks
const updateTrip = useUpdateTripMutation();

// ❌ Bad - direct API calls
const handleUpdate = () => TripService.updateTrip(id, data);
```

### 4. Invalidate Related Data
```tsx
// ✅ Good - invalidate related queries
onSuccess: () => {
  queryClient.invalidateQueries(queryKeys.trips.lists());
  queryClient.invalidateQueries(queryKeys.trips.detail(tripId));
}

// ❌ Bad - no cache updates
onSuccess: () => {
  // Data becomes stale
}
```

## Troubleshooting

### Common Issues

1. **Stale data**: Check invalidation logic
2. **Memory leaks**: Ensure proper cleanup
3. **Over-fetching**: Review query dependencies
4. **Race conditions**: Use proper error boundaries

### Debug Tools

```tsx
// Log cache stats
const { getCacheStats } = useQueryUtils();
console.log('Cache stats:', getCacheStats());

// Clear problematic cache
const { clearEntity } = useQueryUtils();
clearEntity('trips');
```

## Migration from Zustand

When migrating server state from Zustand to React Query:

1. **Identify server vs client state**
2. **Replace fetch logic with queries**
3. **Remove manual cache management**
4. **Update error handling**
5. **Add loading states**

This setup provides a robust foundation for server state management while maintaining compatibility with existing Zustand stores.