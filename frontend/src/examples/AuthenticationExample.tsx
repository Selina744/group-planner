/**
 * Complete authentication example demonstrating the JWT interceptor system
 * This example shows how to integrate the auth system in a real application
 */

import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  Alert,
  Grid,
  Tab,
  Tabs,
  TabPanel,
} from '@mui/material';

import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import LoginForm from '../components/auth/LoginForm';
import { AuthDemo } from '../components/AuthDemo';
import { TripService } from '../services/tripService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanelComponent(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export function AuthenticationExample() {
  const { user, isAuthenticated, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Example API calls using the authenticated client
  const { data: trips, loading: tripsLoading, execute: loadTrips } = useApi(TripService.getUserTrips);
  const { data: profile, loading: profileLoading, execute: loadProfile } = useApi(() =>
    TripService.getTripById('example-trip-id')
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLoadExampleData = async () => {
    try {
      await loadTrips({ page: 1, limit: 10 });
    } catch (error) {
      console.error('Failed to load trips:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Authentication Required
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 4 }}>
          Please log in to access the JWT Authentication Demo
        </Typography>
        <LoginForm />

        <Box sx={{ mt: 4 }}>
          <Alert severity="info">
            <Typography variant="h6" gutterBottom>
              Demo Credentials
            </Typography>
            <Typography variant="body2">
              For testing purposes, you can register a new account or use these demo credentials:
            </Typography>
            <ul>
              <li><strong>Email:</strong> demo@example.com</li>
              <li><strong>Password:</strong> Demo123!</li>
            </ul>
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          JWT Authentication System Demo
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Welcome back, {user?.displayName || user?.email}!
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={logout}>
            Logout
          </Button>
          <Button variant="contained" onClick={handleLoadExampleData} disabled={tripsLoading}>
            {tripsLoading ? 'Loading...' : 'Test API Call'}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Authentication Demo" />
          <Tab label="User Profile" />
          <Tab label="API Integration" />
          <Tab label="Usage Guide" />
        </Tabs>
      </Box>

      <TabPanelComponent value={tabValue} index={0}>
        <AuthDemo />
      </TabPanelComponent>

      <TabPanelComponent value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              User Profile Information
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  User ID
                </Typography>
                <Typography variant="body1">
                  {user?.id}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {user?.email}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Display Name
                </Typography>
                <Typography variant="body1">
                  {user?.displayName || 'Not set'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Username
                </Typography>
                <Typography variant="body1">
                  {user?.username || 'Not set'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Email Verified
                </Typography>
                <Typography variant="body1">
                  {user?.emailVerified ? 'Yes' : 'No'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Timezone
                </Typography>
                <Typography variant="body1">
                  {user?.timezone}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanelComponent>

      <TabPanelComponent value={tabValue} index={2}>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                API Integration Examples
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                These examples demonstrate how authenticated API calls work with the JWT interceptor system.
              </Typography>

              {trips && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Successfully loaded {trips.trips?.length || 0} trips!
                </Alert>
              )}

              <Button
                variant="contained"
                onClick={handleLoadExampleData}
                disabled={tripsLoading}
              >
                {tripsLoading ? 'Loading Trips...' : 'Load User Trips'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Code Examples
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Making authenticated API calls:
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.875rem'
                  }}
                >
{`// Using the useApi hook
const { data, loading, error, execute } = useApi(TripService.getUserTrips);

// Execute the API call
await execute({ page: 1, limit: 10 });

// Or use the service directly
const trips = await TripService.getUserTrips({ page: 1, limit: 10 });`}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Direct API client usage:
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.875rem'
                  }}
                >
{`import { apiClient } from '@/api/client';

// GET request with automatic JWT token
const response = await apiClient.get('/trips');

// POST request with automatic JWT token
const newTrip = await apiClient.post('/trips', tripData);

// The interceptor handles token refresh automatically!`}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </TabPanelComponent>

      <TabPanelComponent value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Implementation Guide
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              1. Setup Authentication Provider
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.875rem'
              }}
            >
{`import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <YourAppComponents />
    </AuthProvider>
  );
}`}
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              2. Use Authentication in Components
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.875rem'
              }}
            >
{`import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <ProtectedContent user={user} onLogout={logout} />;
}`}
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              3. Make Authenticated API Calls
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.875rem'
              }}
            >
{`import { useApi } from './hooks/useApi';
import { apiClient } from './api/client';

// Using hooks
function TripList() {
  const { data, loading, execute } = useApi(
    () => apiClient.get('/trips')
  );

  useEffect(() => {
    execute();
  }, [execute]);

  if (loading) return <Loading />;
  return <TripGrid trips={data} />;
}

// Direct service calls
const response = await TripService.getUserTrips();`}
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Key Features:</strong><br />
                • Automatic JWT token attachment to requests<br />
                • Automatic token refresh when tokens expire<br />
                • Request queue management during refresh<br />
                • Secure token storage (memory + localStorage)<br />
                • TypeScript support with full type safety<br />
                • React context for state management<br />
                • Custom hooks for API calls
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </TabPanelComponent>
    </Container>
  );
}