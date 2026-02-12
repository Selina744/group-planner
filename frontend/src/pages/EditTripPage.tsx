/**
 * EditTripPage - Page for editing existing trip details
 * Allows HOST and CO_HOST to modify trip information
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Backdrop,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  LocationOn as LocationIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useTripQuery, useUpdateTripMutation } from '../queries/hooks';
import type { CreateTripForm, Location } from '../types';

interface FormData {
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
}

interface FormErrors {
  title?: string;
  locationName?: string;
  startDate?: string;
  endDate?: string;
}

export function EditTripPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: trip, isLoading: tripLoading, error: tripError } = useTripQuery(tripId || '', !!tripId);
  const updateMutation = useUpdateTripMutation();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    locationName: '',
    locationAddress: '',
    startDate: '',
    endDate: '',
    isPublic: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [successSnackbar, setSuccessSnackbar] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize form with trip data
  useEffect(() => {
    if (trip && !initialized) {
      // Extract date portion from ISO string (YYYY-MM-DD)
      const formatDate = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        return dateStr.split('T')[0] || '';
      };

      setFormData({
        title: trip.title || '',
        description: trip.description || '',
        locationName: trip.location?.name || '',
        locationAddress: trip.location?.address || '',
        startDate: formatDate(trip.startDate),
        endDate: formatDate(trip.endDate),
        isPublic: trip.isPublic || false,
      });
      setInitialized(true);
    }
  }, [trip, initialized]);

  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'title':
        if (!value.trim()) return 'Trip title is required';
        if (value.length < 3) return 'Trip title must be at least 3 characters';
        if (value.length > 200) return 'Trip title must be 200 characters or less';
        return undefined;
      case 'locationName':
        if (!value.trim()) return 'Destination is required';
        if (value.length < 2) return 'Destination must be at least 2 characters';
        return undefined;
      case 'startDate':
        if (!value) return 'Start date is required';
        return undefined;
      case 'endDate':
        if (!value) return 'End date is required';
        if (formData.startDate && new Date(value) <= new Date(formData.startDate)) {
          return 'End date must be after start date';
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    const fieldsToValidate: (keyof FormData)[] = ['title', 'locationName', 'startDate', 'endDate'];
    fieldsToValidate.forEach((field) => {
      const error = validateField(field, formData[field] as string);
      if (error) {
        newErrors[field as keyof FormErrors] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (name: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (touched.has(name)) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name: keyof FormData) => () => {
    setTouched(prev => new Set(prev).add(name));
    const error = validateField(name, formData[name] as string);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm() || !tripId) return;

    try {
      const addressValue = formData.locationAddress.trim();
      const descriptionValue = formData.description.trim();

      // Build location object conditionally to satisfy exactOptionalPropertyTypes
      const location: Location = {
        name: formData.locationName.trim(),
        latitude: trip?.location?.latitude || 0,
        longitude: trip?.location?.longitude || 0,
      };
      if (addressValue) {
        location.address = addressValue;
      }

      // Build update data object conditionally
      const updateData: Partial<CreateTripForm> = {
        title: formData.title.trim(),
        location,
        startDate: formData.startDate,
        endDate: formData.endDate,
      };

      // Only add description if it has a value (satisfies exactOptionalPropertyTypes)
      if (descriptionValue) {
        updateData.description = descriptionValue;
      }

      await updateMutation.mutateAsync({
        tripId,
        updateData,
      });

      setSuccessSnackbar(true);
      setTimeout(() => {
        navigate(`/trips/${tripId}`);
      }, 1500);
    } catch (error) {
      console.error('Failed to update trip:', error);
    }
  };

  const handleCancel = () => {
    navigate(`/trips/${tripId}`);
  };

  // Loading state
  if (tripLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (tripError) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 3 }}
        >
          Back to Dashboard
        </Button>
        <Alert severity="error">
          Failed to load trip. It may not exist or you may not have access.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 2, md: 4 } }}>
          {/* Header */}
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <IconButton onClick={handleCancel} edge="start">
              <BackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              Edit Trip
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Error Alert */}
          {updateMutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to save changes. Please try again.
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={3}>
              {/* Trip Title */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Trip Title"
                  value={formData.title}
                  onChange={handleInputChange('title')}
                  onBlur={handleBlur('title')}
                  error={!!(touched.has('title') && errors.title)}
                  helperText={touched.has('title') && errors.title}
                  required
                  inputProps={{ maxLength: 200 }}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description (Optional)"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  inputProps={{ maxLength: 1000 }}
                />
              </Grid>

              {/* Location Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon color="primary" />
                  Location
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Destination"
                      value={formData.locationName}
                      onChange={handleInputChange('locationName')}
                      onBlur={handleBlur('locationName')}
                      error={!!(touched.has('locationName') && errors.locationName)}
                      helperText={touched.has('locationName') && errors.locationName}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Address (Optional)"
                      value={formData.locationAddress}
                      onChange={handleInputChange('locationAddress')}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Dates Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon color="primary" />
                  Dates
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Start Date"
                      value={formData.startDate}
                      onChange={handleInputChange('startDate')}
                      onBlur={handleBlur('startDate')}
                      error={!!(touched.has('startDate') && errors.startDate)}
                      helperText={touched.has('startDate') && errors.startDate}
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="End Date"
                      value={formData.endDate}
                      onChange={handleInputChange('endDate')}
                      onBlur={handleBlur('endDate')}
                      error={!!(touched.has('endDate') && errors.endDate)}
                      helperText={touched.has('endDate') && errors.endDate}
                      required
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: formData.startDate }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Privacy Settings - Read only info for now */}
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  Privacy settings cannot be changed after trip creation.
                  This trip is {trip?.isPublic ? 'public' : 'private'}.
                </Alert>
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={updateMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={updateMutation.isPending}
      >
        <Box textAlign="center">
          <CircularProgress color="inherit" />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Saving changes...
          </Typography>
        </Box>
      </Backdrop>

      {/* Success Snackbar */}
      <Snackbar
        open={successSnackbar}
        autoHideDuration={3000}
        onClose={() => setSuccessSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Trip updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default EditTripPage;
