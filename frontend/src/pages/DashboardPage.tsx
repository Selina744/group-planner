/**
 * Dashboard Page - main authenticated user landing page
 * Shows user's trips with filtering, quick actions, and navigation
 */

import { useState } from 'react';
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
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Flight as FlightIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

import { useAuthUser, useAuthStore } from '../stores/authStore';
import { useTripsQuery } from '../queries/hooks';
import { TripList } from '../components/trips';
import { NotificationBell } from '../components/notifications';
import type { Notification } from '../stores/notificationStore';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthUser();
  const { logout } = useAuthStore();

  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);

  // Use React Query for trip data
  const { data: tripsData, isLoading, error } = useTripsQuery();
  const trips = tripsData?.trips ?? [];

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
    } catch (err) {
      console.error('Logout failed:', err);
    }
    handleUserMenuClose();
  };

  const handleNotificationClick = (notification: Notification) => {
    // Navigate to the notification's action URL if available
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleNotificationSettings = () => {
    navigate('/settings');
  };

  const getDisplayName = () => {
    if (!user) return 'User';
    return user.username || user.email || 'User';
  };

  // Calculate trip stats
  const getTripStats = () => {
    const now = new Date();
    let active = 0;
    let upcoming = 0;

    trips.forEach((trip) => {
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);

      if (now >= startDate && now <= endDate) {
        active++;
      } else if (now < startDate) {
        upcoming++;
      }
    });

    return { total: trips.length, active, upcoming };
  };

  const stats = getTripStats();

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

              <NotificationBell
                onNotificationClick={handleNotificationClick}
                onSettingsClick={handleNotificationSettings}
              />

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
            Welcome back, {getDisplayName()}!
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
                    {isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <Typography variant="h4" fontWeight={700}>
                        {stats.total}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Total trips
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
                    {isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <Typography variant="h4" fontWeight={700}>
                        {stats.upcoming}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Upcoming trips
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
                    {isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <Typography variant="h4" fontWeight={700}>
                        {stats.active}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Active trips
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Trips List with Filtering */}
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" component="h2">
              Your trips
            </Typography>
          </Box>

          <TripList
            trips={trips}
            isLoading={isLoading}
            error={error?.message}
            onTripClick={handleTripClick}
            onCreateTrip={handleCreateTrip}
            showFilters={trips.length > 0}
            emptyMessage="No trips yet"
            emptyActionLabel="Create your first trip"
          />
        </Box>
      </Container>
    </Box>
  );
}

export default DashboardPage;
