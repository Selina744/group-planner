/**
 * Create Trip Page - main page for trip creation
 * Handles navigation and success/error states
 */

import React, { useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { TripCreationForm } from '../components/TripCreationForm';
import { useAuthUser, useIsAuthenticated } from '../stores/authStore';
import { useTripError } from '../stores/tripStore';

interface CreateTripPageProps {
  onTripCreated?: (tripId: string) => void;
  onCancel?: () => void;
}

export const CreateTripPage: React.FC<CreateTripPageProps> = ({
  onTripCreated,
  onCancel,
}) => {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const tripError = useTripError();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // In a real app, you'd use react-router or similar for navigation
      console.warn('User not authenticated, should redirect to login');
    }
  }, [isAuthenticated]);

  const handleTripSuccess = (tripId: string) => {
    if (onTripCreated) {
      onTripCreated(tripId);
    } else {
      // Default behavior - navigate to trip page
      console.log(`Trip created successfully! Trip ID: ${tripId}`);
      // In a real app: navigate(`/trips/${tripId}`);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Default behavior - go back to trips list
      console.log('Cancelled trip creation');
      // In a real app: navigate('/trips');
    }
  };

  // Show loading or auth check
  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Authentication Required
        </Typography>
        <Typography color="text.secondary">
          You must be logged in to create a trip.
        </Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <TripCreationForm
        onSuccess={handleTripSuccess}
        onCancel={handleCancel}
        showBackButton={true}
      />
    </Box>
  );
};

export default CreateTripPage;