/**
 * Authentication demo component showing the JWT interceptor system in action
 * Demonstrates login, authenticated requests, and error handling
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Login,
  Logout,
  Person,
  Security,
  Refresh,
  Error,
  CheckCircle,
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import { AuthService } from '../services/authService';
import { TripService } from '../services/tripService';
import LoginForm from './auth/LoginForm';

export function AuthDemo() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [testResults, setTestResults] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  }[]>([]);

  // API test hooks
  const userProfileApi = useApi(AuthService.getCurrentUser);
  const tripsApi = useApi(TripService.getUserTrips);

  const addTestResult = (type: 'success' | 'error' | 'info', message: string) => {
    setTestResults(prev => [...prev, { type, message }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test authenticated API call
  const testAuthenticatedRequest = async () => {
    try {
      clearResults();
      addTestResult('info', 'Testing authenticated request...');

      await userProfileApi.execute();
      addTestResult('success', 'User profile fetched successfully!');

      await tripsApi.execute({ page: 1, limit: 5 });
      addTestResult('success', 'User trips fetched successfully!');

    } catch (error: any) {
      addTestResult('error', `Request failed: ${error.message}`);
    }
  };

  // Test token refresh (simulate expired token)
  const testTokenRefresh = async () => {
    try {
      clearResults();
      addTestResult('info', 'Testing token refresh mechanism...');

      // This will trigger the interceptor if token is expired
      await AuthService.getCurrentUser();
      addTestResult('success', 'Token refresh handled automatically!');

    } catch (error: any) {
      addTestResult('error', `Token refresh failed: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      clearResults();
      addTestResult('success', 'Logged out successfully');
    } catch (error: any) {
      addTestResult('error', `Logout failed: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Initializing authentication...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        JWT Authentication Demo
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This demo showcases the Axios JWT interceptor system with automatic token refresh,
        error handling, and secure authentication flow.
      </Typography>

      {/* Authentication Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Security color={isAuthenticated ? 'success' : 'error'} />
            <Typography variant="h6">
              Authentication Status
            </Typography>
            <Chip
              label={isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              color={isAuthenticated ? 'success' : 'error'}
              variant="outlined"
            />
          </Stack>

          {isAuthenticated && user ? (
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>User ID:</strong> {user.id}
              </Typography>
              <Typography variant="body2">
                <strong>Email:</strong> {user.email}
              </Typography>
              <Typography variant="body2">
                <strong>Display Name:</strong> {user.displayName || 'Not set'}
              </Typography>
              <Typography variant="body2">
                <strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Please log in to see user information
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Actions
          </Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ gap: 1 }}>
            {!isAuthenticated ? (
              <Button
                variant="contained"
                startIcon={<Login />}
                onClick={() => setShowLoginForm(!showLoginForm)}
              >
                {showLoginForm ? 'Hide Login Form' : 'Show Login Form'}
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  startIcon={<Person />}
                  onClick={testAuthenticatedRequest}
                  disabled={userProfileApi.loading || tripsApi.loading}
                >
                  {userProfileApi.loading || tripsApi.loading ? 'Testing...' : 'Test Authenticated Requests'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={testTokenRefresh}
                >
                  Test Token Refresh
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Logout />}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            )}

            <Button
              variant="text"
              onClick={clearResults}
              disabled={testResults.length === 0}
            >
              Clear Results
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Login Form */}
      {!isAuthenticated && showLoginForm && (
        <Box sx={{ mb: 3 }}>
          <LoginForm
            redirectTo="/dashboard"
            onSwitchToRegister={() => addTestResult('info', 'Registration would be shown here')}
            onForgotPassword={() => addTestResult('info', 'Password reset would be shown here')}
          />
        </Box>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Results
            </Typography>

            <List>
              {testResults.map((result, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <Box display="flex" alignItems="center" width="100%">
                      {result.type === 'success' && <CheckCircle color="success" sx={{ mr: 1 }} />}
                      {result.type === 'error' && <Error color="error" sx={{ mr: 1 }} />}
                      {result.type === 'info' && <CircularProgress size={16} sx={{ mr: 1 }} />}
                      <ListItemText
                        primary={result.message}
                        primaryTypographyProps={{
                          color: result.type === 'error' ? 'error' :
                                result.type === 'success' ? 'success.main' : 'text.primary'
                        }}
                      />
                    </Box>
                  </ListItem>
                  {index < testResults.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* API Response Data */}
      {(userProfileApi.data || tripsApi.data) && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              API Response Data
            </Typography>

            {userProfileApi.data && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  User Profile Response:
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
                  {JSON.stringify(userProfileApi.data, null, 2)}
                </Box>
              </Box>
            )}

            {tripsApi.data && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Trips Response:
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
                  {JSON.stringify(tripsApi.data, null, 2)}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}