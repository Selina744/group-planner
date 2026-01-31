# JWT Authentication System

This module provides a complete JWT authentication solution with automatic token refresh, secure token storage, and React integration.

## Features

- ✅ **Automatic JWT Token Attachment**: Axios interceptor automatically adds Bearer tokens to requests
- ✅ **Token Refresh Interceptor**: Automatically refreshes expired access tokens using refresh tokens
- ✅ **Secure Token Storage**: Access tokens in memory, refresh tokens in localStorage
- ✅ **Request Queue Management**: Queues failed requests during token refresh
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
- ✅ **React Integration**: Context provider and hooks for seamless React usage
- ✅ **TypeScript Support**: Full TypeScript definitions for type safety
- ✅ **Network Error Handling**: Graceful handling of network issues and timeouts

## Quick Start

### 1. Wrap your app with AuthProvider

```tsx
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### 2. Use authentication in components

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div>
      <h1>Welcome, {user?.displayName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 3. Make authenticated API calls

```tsx
import { useApi } from './hooks/useApi';
import { apiClient } from './api/client';

function UserTrips() {
  const { data, loading, error, execute } = useApi(
    () => apiClient.get('/trips')
  );

  useEffect(() => {
    execute();
  }, [execute]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map(trip => (
        <li key={trip.id}>{trip.title}</li>
      ))}
    </ul>
  );
}
```

## API Client Usage

### Direct API calls

```tsx
import { apiClient } from './api/client';

// GET request
const trips = await apiClient.get('/trips');

// POST request
const newTrip = await apiClient.post('/trips', tripData);

// PUT request
const updatedTrip = await apiClient.put('/trips/123', updateData);

// DELETE request
await apiClient.delete('/trips/123');
```

### Public endpoints (no authentication)

```tsx
// For endpoints that don't require authentication
const result = await apiClient.publicRequest({
  method: 'POST',
  url: '/auth/login',
  data: { email, password }
});
```

## Token Management

The system uses a hybrid approach for token storage:

- **Access tokens**: Stored in memory for security
- **Refresh tokens**: Stored in localStorage for persistence

### Manual token operations

```tsx
import { tokenManager } from './utils/tokenManager';

// Check if user is authenticated
const isAuth = tokenManager.isAuthenticated();

// Get current access token
const token = tokenManager.getAccessToken();

// Clear all tokens (logout)
tokenManager.clearTokens();
```

## Authentication Service

The `AuthService` provides high-level authentication methods:

```tsx
import { AuthService } from './services/authService';

// Login
const response = await AuthService.login({
  identifier: 'user@example.com',
  password: 'password'
});

// Register
const response = await AuthService.register({
  email: 'user@example.com',
  password: 'password',
  displayName: 'John Doe'
});

// Get current user
const user = await AuthService.getCurrentUser();

// Logout
await AuthService.logout();
```

## React Hooks

### useAuth Hook

```tsx
const {
  user,              // Current user object
  isAuthenticated,   // Boolean authentication status
  isLoading,         // Loading state during auth operations
  error,             // Current error message
  login,             // Login function
  register,          // Register function
  logout,            // Logout function
  updateProfile,     // Update user profile
  clearError,        // Clear current error
  refreshUser        // Refresh user data
} = useAuth();
```

### API Hooks

```tsx
// Generic API hook
const { data, loading, error, execute } = useApi(apiFunction);

// HTTP method specific hooks
const getHook = useGet('/endpoint');
const postHook = usePost('/endpoint');
const putHook = usePut('/endpoint');
const deleteHook = useDelete('/endpoint');

// Paginated data hook
const {
  items,
  pagination,
  loadPage,
  loadMore,
  refresh
} = usePaginatedApi('/trips', 1, 20);
```

## Error Handling

The system provides comprehensive error handling:

```tsx
interface AuthError {
  message: string;    // User-friendly error message
  code?: string;      // Error code for programmatic handling
  status?: number;    // HTTP status code
}
```

Common error scenarios:

- **Network errors**: Handled with user-friendly messages
- **Token expiration**: Automatically refreshed
- **Authentication failures**: User redirected to login
- **Server errors**: Proper error messages displayed

## Configuration

### Environment Variables

```bash
# .env file
VITE_API_BASE_URL=http://localhost:3000/api
```

### API Client Configuration

The API client automatically configures itself based on environment variables:

- **Base URL**: From `VITE_API_BASE_URL` or defaults to `http://localhost:3000/api`
- **Timeout**: 30 seconds for requests, 10 seconds for token refresh
- **Retry Logic**: Automatic retry for failed requests after token refresh

## Security Features

- **Memory-based access tokens**: Prevents XSS attacks
- **Automatic token refresh**: Minimizes token exposure time
- **Request queuing**: Prevents duplicate refresh attempts
- **HTTPS enforcement**: In production builds
- **CSRF protection**: Through proper token handling

## Integration Examples

### Protected Routes

```tsx
import { RequireAuth } from './contexts/AuthContext';

function ProtectedComponent() {
  return (
    <RequireAuth fallback={<LoginForm />}>
      <YourProtectedContent />
    </RequireAuth>
  );
}
```

### Conditional Rendering

```tsx
function Header() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header>
      {isAuthenticated ? (
        <div>
          <span>Welcome, {user?.displayName}!</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <LoginButton />
      )}
    </header>
  );
}
```

### Form Handling with Validation

```tsx
function LoginForm() {
  const { login, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({ identifier: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData);
      // Redirect or update UI
    } catch (error) {
      // Error is automatically handled by context
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Form fields */}
      <button disabled={isLoading} type="submit">
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
```

## Troubleshooting

### Common Issues

1. **Token refresh fails**
   - Check API endpoint `/auth/refresh` is working
   - Verify refresh token is not expired
   - Check network connectivity

2. **Requests not authenticated**
   - Verify `AuthProvider` wraps your app
   - Check if `apiClient` is being used for requests
   - Ensure user is logged in

3. **CORS issues**
   - Configure backend CORS settings
   - Check API base URL configuration

4. **Memory leaks**
   - Ensure components properly clean up API calls
   - Use provided hooks instead of direct API calls

### Debug Mode

Enable debug logging by setting:

```bash
VITE_DEBUG_MODE=true
```

This will log authentication events and API calls to the console.