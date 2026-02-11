/**
 * Dashboard Page - main authenticated user landing page
 * Shows user's trips, quick actions, and navigation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Flight as FlightIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

import { useAuthUser, useAuthStore } from '../stores/authStore';
import { useTrips, useTripActions } from '../stores/tripStore';
import type { Trip } from '../types';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthUser();
  const { logout } = useAuthStore();
  const { fetchUserTrips } = useTripActions();
  const trips = useTrips();

  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);

  // Load user's trips on mount
  useEffect(() => {
    fetchUserTrips();
  }, [fetchUserTrips]);

  const handleCreateTrip = () => {
    navigate('/trips/create');
  };

  const handleTripClick = (tripId: string) => {
    navigate(`/trips/${tripId}`);
  };

  const handleUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleProfile = () => {
    navigate('/profile');
    handleUserMenuClose();
  };

  const handleSettings = () => {
    navigate('/settings');
    handleUserMenuClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    handleUserMenuClose();
  };

  const getDisplayName = () => {
    if (!user) return 'User';
    return user.username || user.email || 'User';
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', py: 2 }}>
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" component="h1">
              Dashboard
            </Typography>

            <Box display="flex" alignItems="center" gap={2}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateTrip}
              >
                New Trip
              </Button>

              <IconButton onClick={handleUserMenu}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {getDisplayName().charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2">
                    {getDisplayName()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleProfile}>Profile</MenuItem>
                <MenuItem onClick={handleSettings}>
                  <SettingsIcon sx={{ mr: 1 }} fontSize="small" />
                  Settings
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>Sign out</MenuItem>
              </Menu>
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            Welcome back, {getDisplayName()}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ready to plan your next adventure?
          </Typography>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <FlightIcon color="primary" />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {trips.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active trips
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <CalendarIcon color="primary" />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      -
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upcoming events
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <PeopleIcon color="primary" />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      -
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Collaborators
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Trips */}
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" component="h2">
              Your trips
            </Typography>
            {trips.length > 0 && (
              <Button
                variant="text"
                onClick={() => navigate('/trips')}
              >
                View all
              </Button>
            )}
          </Box>

          {trips.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <FlightIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No trips yet
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                Create your first trip to start planning an amazing adventure
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateTrip}
              >
                Create your first trip
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {trips.slice(0, 6).map((trip: Trip) => (
                <Grid item xs={12} sm={6} md={4} key={trip.id}>
                  <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => handleTripClick(trip.id)}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom noWrap>
                        {trip.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: 40, overflow: 'hidden' }}>
                        {trip.description}
                      </Typography>

                      <Stack direction="row" spacing={1} mb={2}>
                        {trip.startDate && (
                          <Chip
                            label={new Date(trip.startDate).toLocaleDateString()}
                            size="small"
                            variant="outlined"
                            icon={<CalendarIcon />}
                          />
                        )}
                        <Chip
                          label="View members"
                          size="small"
                          variant="outlined"
                          icon={<PeopleIcon />}
                        />
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Created {new Date(trip.createdAt).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </Box>
  );
}

export default DashboardPage;