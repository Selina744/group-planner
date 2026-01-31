/**
 * Trip Creation Form Demo - showcases the trip creation functionality
 * Includes mock data, testing scenarios, and integration examples
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  Stack,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { TripCreationForm } from '../components/TripCreationForm';
import { useTrips, useTripLoading, useTripError } from '../stores/tripStore';
import { useAuthUser } from '../stores/authStore';

export const TripCreationDemo: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [lastCreatedTrip, setLastCreatedTrip] = useState<string | null>(null);
  const [showIntegrationDetails, setShowIntegrationDetails] = useState(false);

  const user = useAuthUser();
  const trips = useTrips();
  const isLoading = useTripLoading();
  const tripError = useTripError();

  const handleTripCreated = (tripId: string) => {
    setLastCreatedTrip(tripId);
    setShowForm(false);

    // Show success message
    setTimeout(() => {
      setLastCreatedTrip(null);
    }, 10000); // Clear after 10 seconds
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  const demoScenarios = [
    {
      title: "Weekend Getaway",
      description: "Short trip with minimal details",
      data: {
        title: "Weekend Beach Getaway",
        location: "Santa Monica, CA",
        isPublic: false
      }
    },
    {
      title: "Group Adventure",
      description: "Public trip with detailed planning",
      data: {
        title: "European Backpacking Adventure",
        location: "Paris, France",
        description: "3-week journey through Europe visiting major cities",
        isPublic: true
      }
    },
    {
      title: "Family Vacation",
      description: "Private family trip with specific dates",
      data: {
        title: "Family Reunion at Lake Tahoe",
        location: "Lake Tahoe, CA",
        description: "Annual family gathering with activities for all ages",
        isPublic: false
      }
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography variant="h4" gutterBottom>
            Trip Creation Form Demo
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Comprehensive trip creation with Material-UI, Zustand store integration, and full validation.
            This demo showcases the form's capabilities, validation rules, and state management.
          </Typography>
        </Box>

        {/* Status Alerts */}
        <Stack spacing={2}>
          {lastCreatedTrip && (
            <Alert
              severity="success"
              icon={<CheckIcon />}
              onClose={() => setLastCreatedTrip(null)}
            >
              <strong>Trip created successfully!</strong> Trip ID: {lastCreatedTrip}
              <br />
              <small>In a real app, you would be redirected to the trip page.</small>
            </Alert>
          )}

          {tripError && (
            <Alert severity="error" icon={<ErrorIcon />}>
              <strong>Trip Creation Error:</strong> {tripError}
            </Alert>
          )}

          {!user && (
            <Alert severity="warning" icon={<InfoIcon />}>
              <strong>Authentication Required:</strong> You must be logged in to create trips.
              Please use the auth demo in the previous tab to simulate login.
            </Alert>
          )}
        </Stack>

        {/* Current State Overview */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current State
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary">
                  {trips.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Trips Created
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color={user ? 'success.main' : 'error.main'}>
                  {user ? '✓' : '✗'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Authentication
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color={isLoading ? 'warning.main' : 'success.main'}>
                  {isLoading ? '⟳' : '✓'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Loading State
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Form Demo */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Interactive Form Demo
            </Typography>
            <Button
              variant={showForm ? "outlined" : "contained"}
              onClick={() => setShowForm(!showForm)}
              disabled={!user}
            >
              {showForm ? 'Hide Form' : 'Show Creation Form'}
            </Button>
          </Box>

          <Collapse in={showForm}>
            <TripCreationForm
              onSuccess={handleTripCreated}
              onCancel={handleCancel}
              showBackButton={false}
            />
          </Collapse>
        </Box>

        {/* Demo Scenarios */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Demo Scenarios
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Common trip creation scenarios and their typical form data:
          </Typography>

          <Grid container spacing={2}>
            {demoScenarios.map((scenario, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {scenario.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {scenario.description}
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="caption" fontWeight="bold">Sample Data:</Typography>
                      <Typography variant="caption">Title: {scenario.data.title}</Typography>
                      <Typography variant="caption">Location: {scenario.data.location}</Typography>
                      {scenario.data.description && (
                        <Typography variant="caption">Description: {scenario.data.description}</Typography>
                      )}
                      <Box>
                        <Chip
                          label={scenario.data.isPublic ? "Public" : "Private"}
                          size="small"
                          color={scenario.data.isPublic ? "primary" : "default"}
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Technical Integration Details */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Technical Integration
            </Typography>
            <IconButton onClick={() => setShowIntegrationDetails(!showIntegrationDetails)}>
              {showIntegrationDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={showIntegrationDetails}>
            <Paper sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Form Features
                  </Typography>
                  <Stack spacing={1}>
                    <Chip label="Material-UI Components" size="small" color="primary" />
                    <Chip label="TypeScript Validation" size="small" color="primary" />
                    <Chip label="Real-time Field Validation" size="small" color="primary" />
                    <Chip label="Responsive Design" size="small" color="primary" />
                    <Chip label="Loading States" size="small" color="primary" />
                    <Chip label="Error Handling" size="small" color="primary" />
                    <Chip label="Form Preview" size="small" color="primary" />
                    <Chip label="Character Counters" size="small" color="primary" />
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Integration Points
                  </Typography>
                  <Stack spacing={1}>
                    <Chip label="Zustand Trip Store" size="small" color="secondary" />
                    <Chip label="Auth Store Integration" size="small" color="secondary" />
                    <Chip label="Trip Service API" size="small" color="secondary" />
                    <Chip label="JWT Authentication" size="small" color="secondary" />
                    <Chip label="Error State Management" size="small" color="secondary" />
                    <Chip label="Loading State Sync" size="small" color="secondary" />
                    <Chip label="Form State Persistence" size="small" color="secondary" />
                    <Chip label="Navigation Callbacks" size="small" color="secondary" />
                  </Stack>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Validation Rules
                </Typography>
                <Typography variant="body2" component="div">
                  <ul>
                    <li><strong>Trip Title:</strong> Required, 3-200 characters</li>
                    <li><strong>Location:</strong> Required, minimum 2 characters</li>
                    <li><strong>Start Date:</strong> Required, cannot be in the past</li>
                    <li><strong>End Date:</strong> Required, must be after start date</li>
                    <li><strong>Description:</strong> Optional, maximum 1000 characters</li>
                    <li><strong>Privacy:</strong> Public or Private setting with explanations</li>
                  </ul>
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  API Integration
                </Typography>
                <Typography variant="body2">
                  The form integrates with the Trip service through Zustand actions:
                </Typography>
                <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mt: 1 }}>
                  <div>• POST /api/trips - Create new trip</div>
                  <div>• Automatic JWT token handling</div>
                  <div>• Error response normalization</div>
                  <div>• Store state synchronization</div>
                </Typography>
              </Box>
            </Paper>
          </Collapse>
        </Box>
      </Stack>
    </Container>
  );
};

export default TripCreationDemo;