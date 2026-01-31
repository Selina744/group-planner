# Zustand State Management

This directory contains the Zustand stores for centralized state management in the Group Planner frontend application. Zustand provides a modern, lightweight, and TypeScript-friendly alternative to Redux.

## Architecture Overview

Our state management is organized into four main stores:

### 1. Auth Store (`authStore.ts`)
Manages user authentication and authorization state.

**Features:**
- JWT token management integration
- User session persistence
- Login/logout functionality
- Profile management
- Password change operations
- Integration with existing AuthService

**Key Hooks:**
```typescript
import { useAuthUser, useIsAuthenticated, useAuthActions } from '../stores';

function MyComponent() {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const { login, logout } = useAuthActions();

  // Component logic...
}
```

### 2. Trip Store (`tripStore.ts`)
Handles trip-related data and operations.

**Features:**
- Trip CRUD operations
- Trip member management
- Trip search and discovery
- Event management (placeholder for future implementation)
- Trip invitation system

**Key Hooks:**
```typescript
import { useTrips, useCurrentTrip, useTripActions } from '../stores';

function TripComponent() {
  const trips = useTrips();
  const currentTrip = useCurrentTrip();
  const { createTrip, fetchUserTrips } = useTripActions();

  // Component logic...
}
```

### 3. Notification Store (`notificationStore.ts`)
Manages in-app notifications and toast messages.

**Features:**
- Persistent notifications (trip invites, updates, etc.)
- Temporary toast notifications
- Read/unread state management
- Trip-specific notification helpers
- Auto-cleanup of expired notifications

**Key Hooks:**
```typescript
import {
  useNotifications,
  useUnreadCount,
  useToastActions,
  useNotificationActions
} from '../stores';

function NotificationComponent() {
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();
  const { showSuccess, showError } = useToastActions();
  const { markAsRead, clearAllNotifications } = useNotificationActions();

  // Component logic...
}
```

### 4. UI Store (`uiStore.ts`)
Handles global UI state and preferences.

**Features:**
- Modal management
- Theme preferences (light/dark/system)
- Navigation state (sidebar, breadcrumbs)
- Loading states
- Confirmation dialogs
- Search state
- Viewport information

**Key Hooks:**
```typescript
import {
  useTheme,
  useModal,
  useUIActions,
  useModalActions
} from '../stores';

function UIComponent() {
  const theme = useTheme();
  const modal = useModal();
  const { setTheme, showConfirmation } = useUIActions();
  const { openModal, closeModal } = useModalActions();

  // Component logic...
}
```

## Integration with Existing Systems

### Authentication Integration
The auth store seamlessly integrates with the existing JWT authentication system:

- Uses `AuthService` for API calls
- Integrates with `tokenManager` for token storage
- Works alongside existing `AuthContext` (can be gradually migrated)
- Maintains compatibility with existing authentication flow

### API Integration
All stores integrate with the existing API client:

- Uses `apiClient` for authenticated requests
- Handles automatic token refresh
- Maintains error handling patterns
- Supports existing API response formats

## Store Initialization

The stores are initialized through the `StoreProvider` component:

```typescript
import { StoreProvider } from '../providers';

function App() {
  return (
    <StoreProvider>
      {/* Your app content */}
    </StoreProvider>
  );
}
```

The provider handles:
- Store initialization on app startup
- Authentication restoration
- Viewport detection and responsive updates
- Cleanup on unmount

## Best Practices

### 1. Use Selector Hooks
Instead of subscribing to entire stores, use specific selector hooks:

```typescript
// ✅ Good - only re-renders when user changes
const user = useAuthUser();

// ❌ Avoid - re-renders on any auth state change
const { user } = useAuthStore();
```

### 2. Separate Actions and State
Use separate action hooks for better performance:

```typescript
// ✅ Good - actions don't cause re-renders
const { login, logout } = useAuthActions();
const user = useAuthUser();

// ❌ Avoid - getting actions with state
const { login, logout, user } = useAuthStore();
```

### 3. Handle Async Actions
Always handle errors in async actions:

```typescript
const { login } = useAuthActions();

const handleLogin = async (credentials) => {
  try {
    await login(credentials);
    // Handle success
  } catch (error) {
    // Handle error - error is already set in store
    console.error('Login failed:', error);
  }
};
```

### 4. Use Type-Safe Actions
All actions are fully typed with TypeScript:

```typescript
// TypeScript will enforce correct parameter types
await createTrip({
  title: 'My Trip',
  description: 'A great trip',
  location: { name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
  startDate: '2024-06-01',
  endDate: '2024-06-07',
  isPublic: false,
});
```

## Persistence

Stores automatically persist relevant data to localStorage:

- **Auth Store**: User info and authentication status
- **Trip Store**: User's trips list
- **Notification Store**: Notifications and settings
- **UI Store**: Theme preferences and UI settings

Sensitive data like tokens are handled by the existing `tokenManager`.

## Development Tools

In development mode, you can access store dev tools:

1. Click the gear icon (🛠) in the bottom-right corner
2. Use "Log States" to inspect current store states
3. Use "Reset All" to reset all stores to initial state

You can also access stores directly in the console:

```javascript
// In browser console (development only)
const { getStoreStates } = require('./src/stores');
console.log(getStoreStates());
```

## Migration Path

The Zustand stores are designed to work alongside the existing React Context system:

1. **Phase 1** (Current): Both systems coexist
2. **Phase 2**: Gradually migrate components to use Zustand hooks
3. **Phase 3**: Remove React Context when migration is complete

This allows for incremental adoption without breaking existing functionality.

## Performance Optimizations

### Selective Subscriptions
Zustand allows components to subscribe only to specific parts of the state:

```typescript
// Only re-renders when user changes
const user = useAuthStore(state => state.user);

// Only re-renders when trips array changes
const trips = useTripStore(state => state.trips);
```

### Optimistic Updates
The stores support optimistic updates for better UX:

```typescript
// Trip is immediately added to local state, then synced with server
const newTrip = await createTrip(tripData);
```

### Automatic Cleanup
Stores handle automatic cleanup:
- Expired notifications are removed
- Event listeners are cleaned up
- Memory leaks are prevented

## Error Handling

Each store provides consistent error handling:

```typescript
const authError = useAuthError();
const tripError = useTripError();
const uiError = useUIError();

// Or get all errors at once
const { hasAnyError, getAllErrors } = useGlobalErrorState();
```

Errors are automatically cleared when new actions succeed.

## Testing

Stores can be easily tested:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../stores/authStore';

test('should login user', async () => {
  const { result } = renderHook(() => useAuthStore());

  await act(async () => {
    await result.current.login({ identifier: 'test@example.com', password: 'password' });
  });

  expect(result.current.isAuthenticated).toBe(true);
});
```

## Next Steps

1. **Component Migration**: Gradually migrate existing components to use Zustand hooks
2. **Event System**: Implement event management in the trip store
3. **Real-time Updates**: Add WebSocket integration for live updates
4. **Offline Support**: Add offline state management
5. **Performance Monitoring**: Add store performance monitoring