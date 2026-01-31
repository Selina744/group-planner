/**
 * Store Usage Examples - demonstrates how to use the Zustand stores
 * These examples show best practices for using the stores in components
 */

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Grid,
} from '@mui/material';

// Import store hooks
import {
  useAuthUser,
  useIsAuthenticated,
  useAuthActions,
  useAuthError,
  useAuthLoading,
  useTrips,
  useTripActions,
  useTripLoading,
  useNotifications,
  useUnreadCount,
  useToastActions,
  useNotificationActions,
  useUIActions,
  useModalActions,
  useTheme,
  useIsSidebarOpen,
} from '../stores';

// Example 1: Auth Store Usage
export function AuthStoreExample() {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authError = useAuthError();
  const isLoading = useAuthLoading();
  const { login, logout } = useAuthActions();

  const [credentials, setCredentials] = useState({
    identifier: '',
    password: '',
  });

  const handleLogin = async () => {
    try {
      await login(credentials);
      console.log('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Auth Store Example
        </Typography>

        {authError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {authError}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Chip
            label={isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            color={isAuthenticated ? 'success' : 'default'}
          />
          {user && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Welcome, {user.displayName || user.email}!
            </Typography>
          )}
        </Box>

        {!isAuthenticated ? (
          <Stack spacing={2}>
            <TextField
              label="Email or Username"
              value={credentials.identifier}
              onChange={(e) =>
                setCredentials({ ...credentials, identifier: e.target.value })
              }
              disabled={isLoading}
            />
            <TextField
              label="Password"
              type="password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
              disabled={isLoading}
            />
            <Button
              variant="contained"
              onClick={handleLogin}
              disabled={isLoading || !credentials.identifier || !credentials.password}
              startIcon={isLoading && <CircularProgress size={16} />}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </Stack>
        ) : (
          <Button variant="outlined" onClick={logout}>
            Logout
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Example 2: Trip Store Usage
export function TripStoreExample() {
  const trips = useTrips();
  const isLoading = useTripLoading();
  const { fetchUserTrips, createTrip } = useTripActions();

  const [newTripTitle, setNewTripTitle] = useState('');

  const handleCreateTrip = async () => {
    if (!newTripTitle.trim()) return;

    try {
      await createTrip({
        title: newTripTitle,
        description: 'Created from store example',
        location: {
          name: 'Example Location',
          latitude: 0,
          longitude: 0,
        },
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isPublic: false,
      });
      setNewTripTitle('');
      console.log('Trip created successfully!');
    } catch (error) {
      console.error('Failed to create trip:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Trip Store Example
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Button
              variant="outlined"
              onClick={fetchUserTrips}
              disabled={isLoading}
              startIcon={isLoading && <CircularProgress size={16} />}
            >
              {isLoading ? 'Loading...' : 'Refresh Trips'}
            </Button>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Create New Trip
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Trip title"
                value={newTripTitle}
                onChange={(e) => setNewTripTitle(e.target.value)}
                disabled={isLoading}
              />
              <Button
                variant="contained"
                onClick={handleCreateTrip}
                disabled={isLoading || !newTripTitle.trim()}
              >
                Create
              </Button>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Your Trips ({trips.length})
            </Typography>
            {trips.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No trips yet. Create your first trip!
              </Typography>
            ) : (
              <Stack spacing={1}>
                {trips.slice(0, 3).map((trip) => (
                  <Box
                    key={trip.id}
                    sx={{
                      p: 1,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {trip.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {trip.location.name} • {new Date(trip.startDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                ))}
                {trips.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    ... and {trips.length - 3} more
                  </Typography>
                )}
              </Stack>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Example 3: Notification Store Usage
export function NotificationStoreExample() {
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();
  const { showSuccess, showError, showWarning, showInfo } = useToastActions();
  const { addNotification, markAllAsRead, clearAllNotifications } = useNotificationActions();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Notification Store Example
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Toast Notifications
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={() => showSuccess('Operation completed successfully!')}
              >
                Success Toast
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => showError('Something went wrong!')}
              >
                Error Toast
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => showWarning('Please be careful!')}
              >
                Warning Toast
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="info"
                onClick={() => showInfo('Here is some information')}
              >
                Info Toast
              </Button>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Persistent Notifications
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  addNotification({
                    type: 'trip_invite',
                    title: 'Trip Invitation',
                    message: 'John invited you to join "Summer Vacation"',
                    read: false,
                    persistent: true,
                  })
                }
              >
                Add Trip Invite
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  addNotification({
                    type: 'member_joined',
                    title: 'New Member',
                    message: 'Alice joined your trip "Beach Weekend"',
                    read: false,
                  })
                }
              >
                Add Member Notification
              </Button>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Notifications ({notifications.length})
              {unreadCount > 0 && (
                <Chip size="small" label={`${unreadCount} unread`} color="primary" sx={{ ml: 1 }} />
              )}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" onClick={markAllAsRead}>
                Mark All Read
              </Button>
              <Button size="small" variant="outlined" onClick={clearAllNotifications}>
                Clear All
              </Button>
            </Stack>

            {notifications.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            ) : (
              <Stack spacing={1}>
                {notifications.slice(0, 3).map((notification) => (
                  <Box
                    key={notification.id}
                    sx={{
                      p: 1,
                      border: 1,
                      borderColor: notification.read ? 'divider' : 'primary.main',
                      borderRadius: 1,
                      backgroundColor: notification.read ? 'inherit' : 'primary.50',
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {notification.title}
                      {!notification.read && (
                        <Chip size="small" label="NEW" color="primary" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                    <Typography variant="caption">{notification.message}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Example 4: UI Store Usage
export function UIStoreExample() {
  const theme = useTheme();
  const isSidebarOpen = useIsSidebarOpen();
  const { setTheme, showConfirmation } = useUIActions();
  const { openModal } = useModalActions();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          UI Store Example
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Theme Control
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant={theme === 'light' ? 'contained' : 'outlined'}
                onClick={() => setTheme('light')}
              >
                Light
              </Button>
              <Button
                size="small"
                variant={theme === 'dark' ? 'contained' : 'outlined'}
                onClick={() => setTheme('dark')}
              >
                Dark
              </Button>
              <Button
                size="small"
                variant={theme === 'system' ? 'contained' : 'outlined'}
                onClick={() => setTheme('system')}
              >
                System
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Current theme: {theme}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Modal Actions
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                onClick={() => openModal('createTrip')}
              >
                Open Create Trip Modal
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => openModal('profile', { userId: 'example' })}
              >
                Open Profile Modal
              </Button>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Confirmation Dialog
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() =>
                showConfirmation({
                  title: 'Delete Item',
                  message: 'Are you sure you want to delete this item? This action cannot be undone.',
                  confirmText: 'Delete',
                  cancelText: 'Cancel',
                  variant: 'danger',
                  onConfirm: () => console.log('Item deleted!'),
                  onCancel: () => console.log('Delete cancelled'),
                })
              }
            >
              Show Confirmation
            </Button>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Navigation State
            </Typography>
            <Typography variant="body2">
              Sidebar: {isSidebarOpen ? 'Open' : 'Closed'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Main examples container
export function StoreUsageExamples() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Zustand Store Usage Examples
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        These examples demonstrate how to use the Zustand stores in your components.
        Each example shows best practices for store integration.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <AuthStoreExample />
        </Grid>
        <Grid item xs={12} md={6}>
          <TripStoreExample />
        </Grid>
        <Grid item xs={12} md={6}>
          <NotificationStoreExample />
        </Grid>
        <Grid item xs={12} md={6}>
          <UIStoreExample />
        </Grid>
      </Grid>
    </Box>
  );
}