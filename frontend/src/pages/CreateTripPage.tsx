/**
 * Create Trip Page - main page for trip creation
 * Handles navigation and success/error states
 */

import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import { TripCreationForm } from '../components/TripCreationForm';
import { useIsAuthenticated } from '../stores/authStore';

export const CreateTripPage: React.FC = () => {
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  const handleTripSuccess = (tripId: string) => {
    // Navigate to the newly created trip's details page
    navigate(`/trips/${tripId}`, {
      state: { message: 'Trip created successfully!' },
    });
  };

  const handleCancel = () => {
    // Navigate back to dashboard
    navigate('/dashboard');
  };

  // Show auth required message if not authenticated
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
