/**
 * TripList component - displays a filterable list/grid of trips
 * Supports status filtering and empty states
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Flight as FlightIcon,
} from '@mui/icons-material';
import { TripCard, TripCardSkeleton } from './TripCard';
import type { Trip } from '../../types';

type TripStatusFilter = 'all' | 'planning' | 'active' | 'completed';

interface TripListProps {
  trips: Trip[];
  isLoading?: boolean | undefined;
  error?: string | null | undefined;
  onTripClick?: (tripId: string) => void;
  onCreateTrip?: () => void;
  showFilters?: boolean | undefined;
  emptyMessage?: string | undefined;
  emptyActionLabel?: string | undefined;
}

const getTripStatus = (trip: Trip): 'planning' | 'active' | 'completed' => {
  const now = new Date();
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);

  if (now < startDate) {
    return 'planning';
  } else if (now >= startDate && now <= endDate) {
    return 'active';
  } else {
    return 'completed';
  }
};

export function TripList({
  trips,
  isLoading = false,
  error,
  onTripClick,
  onCreateTrip,
  showFilters = true,
  emptyMessage = 'No trips yet',
  emptyActionLabel = 'Create your first trip',
}: TripListProps) {
  const [statusFilter, setStatusFilter] = useState<TripStatusFilter>('all');

  const handleFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: TripStatusFilter | null) => {
    if (newFilter !== null) {
      setStatusFilter(newFilter);
    }
  };

  const filteredTrips = useMemo(() => {
    if (statusFilter === 'all') {
      return trips;
    }
    return trips.filter((trip) => getTripStatus(trip) === statusFilter);
  }, [trips, statusFilter]);

  const tripCounts = useMemo(() => {
    const counts = { all: trips.length, planning: 0, active: 0, completed: 0 };
    trips.forEach((trip) => {
      const status = getTripStatus(trip);
      counts[status]++;
    });
    return counts;
  }, [trips]);

  // Loading state
  if (isLoading) {
    return (
      <Box>
        {showFilters && (
          <Box mb={3}>
            <ToggleButtonGroup
              value="all"
              exclusive
              disabled
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="planning">Planning</ToggleButton>
              <ToggleButton value="active">Active</ToggleButton>
              <ToggleButton value="completed">Completed</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <TripCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // Empty state
  if (trips.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <FlightIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {emptyMessage}
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          Create your first trip to start planning an amazing adventure
        </Typography>
        {onCreateTrip && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateTrip}
          >
            {emptyActionLabel}
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <Box>
      {/* Filter controls */}
      {showFilters && (
        <Box mb={3}>
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={handleFilterChange}
            size="small"
            aria-label="Trip status filter"
          >
            <ToggleButton value="all" aria-label="All trips">
              All ({tripCounts.all})
            </ToggleButton>
            <ToggleButton value="planning" aria-label="Planning trips">
              Planning ({tripCounts.planning})
            </ToggleButton>
            <ToggleButton value="active" aria-label="Active trips">
              Active ({tripCounts.active})
            </ToggleButton>
            <ToggleButton value="completed" aria-label="Completed trips">
              Completed ({tripCounts.completed})
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Filtered empty state */}
      {filteredTrips.length === 0 && trips.length > 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No {statusFilter} trips found
          </Typography>
        </Paper>
      )}

      {/* Trip grid */}
      {filteredTrips.length > 0 && (
        <Grid container spacing={3}>
          {filteredTrips.map((trip) => (
            <Grid item xs={12} sm={6} md={4} key={trip.id}>
              <TripCard
                trip={trip}
                onClick={() => onTripClick?.(trip.id)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default TripList;
