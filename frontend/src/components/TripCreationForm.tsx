/**
 * Trip Creation Form - comprehensive form for creating new trips
 * Integrates with Zustand trip store and uses Material-UI components
 * Includes full validation, loading states, and error handling
 */

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Alert,
  Backdrop,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useTripActions, useTripLoading, useTripError } from '../stores/tripStore';
import { useAuthUser } from '../stores/authStore';
import { useForm } from '../hooks/useForm';
import type { CreateTripForm, Location } from '../types/index';

// Form validation rules
const VALIDATION = {
  title: {
    required: 'Trip title is required',
    maxLength: { value: 200, message: 'Trip title must be 200 characters or less' },
    minLength: { value: 3, message: 'Trip title must be at least 3 characters' },
  },
  description: {
    maxLength: { value: 1000, message: 'Description must be 1000 characters or less' },
  },
  location: {
    required: 'Trip location is required',
    minLength: { value: 2, message: 'Location must be at least 2 characters' },
  },
  startDate: {
    required: 'Start date is required',
  },
  endDate: {
    required: 'End date is required',
  },
};

interface TripCreationFormProps {
  onSuccess?: (tripId: string) => void;
  onCancel?: () => void;
  showBackButton?: boolean;
}

interface FormData extends Omit<CreateTripForm, 'location'> {
  locationName: string;
  locationAddress?: string;
}

export const TripCreationForm: React.FC<TripCreationFormProps> = ({
  onSuccess,
  onCancel,
  showBackButton = false,
}) => {
  // Store state and actions
  const user = useAuthUser();
  const isLoading = useTripLoading();
  const storeError = useTripError();
  const { createTrip, clearError } = useTripActions();

  // Get current date for date input min values
  const today = new Date().toISOString().split('T')[0];

  // Form validation function
  const validateForm = (values: FormData) => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    // Title validation
    if (!values.title.trim()) {
      errors.title = VALIDATION.title.required;
    } else if (values.title.length < VALIDATION.title.minLength.value) {
      errors.title = VALIDATION.title.minLength.message;
    } else if (values.title.length > VALIDATION.title.maxLength.value) {
      errors.title = VALIDATION.title.maxLength.message;
    }

    // Description validation
    if (values.description && values.description.length > VALIDATION.description.maxLength.value) {
      errors.description = VALIDATION.description.maxLength.message;
    }

    // Location validation
    if (!values.locationName.trim()) {
      errors.locationName = VALIDATION.location.required;
    } else if (values.locationName.length < VALIDATION.location.minLength.value) {
      errors.locationName = VALIDATION.location.minLength.message;
    }

    // Start date validation
    if (!values.startDate) {
      errors.startDate = VALIDATION.startDate.required;
    } else if (new Date(values.startDate) < new Date().setHours(0, 0, 0, 0)) {
      errors.startDate = 'Start date cannot be in the past';
    }

    // End date validation
    if (!values.endDate) {
      errors.endDate = VALIDATION.endDate.required;
    } else if (values.startDate && new Date(values.endDate) <= new Date(values.startDate)) {
      errors.endDate = 'End date must be after start date';
    }

    return errors;
  };

  // Form submission handler
  const handleFormSubmit = async (formData: FormData) => {
    // Clear previous errors
    clearError();

    if (!user) {
      throw new Error('You must be logged in to create a trip');
    }

    // Create location object - for now using placeholder coordinates
    // In a real implementation, you'd integrate with a geocoding service
    const location: Location = {
      name: formData.locationName.trim(),
      latitude: 0, // Placeholder - would come from geocoding
      longitude: 0, // Placeholder - would come from geocoding
      address: formData.locationAddress?.trim(),
    };

    const tripData: CreateTripForm = {
      title: formData.title.trim(),
      description: formData.description?.trim() || undefined,
      location,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isPublic: formData.isPublic,
    };

    const newTrip = await createTrip(tripData);

    // Success - call success handler
    if (onSuccess) {
      onSuccess(newTrip.id);
    }
  };

  // Initialize form
  const form = useForm<FormData>({
    initialValues: {
      title: '',
      description: '',
      locationName: '',
      locationAddress: '',
      startDate: '',
      endDate: '',
      isPublic: false,
    },
    validate: validateForm,
    onSubmit: handleFormSubmit,
  });

  // Event handlers
  const handleInputChange = (name: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    form.setValue(name, value);
  };

  const handleFieldBlur = (name: keyof FormData) => () => {
    form.setFieldTouched(name, true);

    // Validate field on blur if it has been touched
    const error = form.validateField(name);
    if (error) {
      form.setFieldError(name, error);
    }
  };

  const handlePrivacyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('isPublic', event.target.value === 'public');
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Card sx={{ maxWidth: 800, mx: 'auto' }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              {showBackButton && (
                <IconButton onClick={handleCancel} size="small">
                  <ArrowBackIcon />
                </IconButton>
              )}
              <Typography variant="h4" component="h1">
                Create New Trip
              </Typography>
            </Box>
          }
          subheader="Plan your next adventure with friends and family"
          sx={{ pb: 1 }}
        />
        <Divider />
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          <Box component="form" onSubmit={form.handleSubmit()} noValidate>
            {/* Error Display */}
            {storeError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {storeError}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Trip Title */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Trip Title"
                  placeholder="e.g., Summer Road Trip to California"
                  value={form.values.title}
                  onChange={handleInputChange('title')}
                  onBlur={handleFieldBlur('title')}
                  error={form.touched.title && !!form.errors.title}
                  helperText={form.touched.title && form.errors.title}
                  required
                  InputProps={{
                    startAdornment: <CalendarIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                  inputProps={{
                    maxLength: VALIDATION.title.maxLength.value,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {form.values.title.length}/{VALIDATION.title.maxLength.value} characters
                </Typography>
              </Grid>

              {/* Trip Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description (Optional)"
                  placeholder="Tell us about your trip plans, activities, or anything participants should know..."
                  value={form.values.description}
                  onChange={handleInputChange('description')}
                  onBlur={handleFieldBlur('description')}
                  error={form.touched.description && !!form.errors.description}
                  helperText={form.touched.description && form.errors.description}
                  InputProps={{
                    startAdornment: (
                      <DescriptionIcon sx={{ mr: 1, mt: 1, color: 'action.active', alignSelf: 'flex-start' }} />
                    ),
                  }}
                  inputProps={{
                    maxLength: VALIDATION.description.maxLength.value,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {form.values.description.length}/{VALIDATION.description.maxLength.value} characters
                </Typography>
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
                      placeholder="e.g., San Francisco, CA"
                      value={form.values.locationName}
                      onChange={handleInputChange('locationName')}
                      onBlur={handleFieldBlur('locationName')}
                      error={form.touched.locationName && !!form.errors.locationName}
                      helperText={form.touched.locationName && form.errors.locationName}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Address (Optional)"
                      placeholder="Specific address"
                      value={form.values.locationAddress || ''}
                      onChange={handleInputChange('locationAddress')}
                      onBlur={handleFieldBlur('locationAddress')}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Date Section */}
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
                      value={form.values.startDate}
                      onChange={handleInputChange('startDate')}
                      onBlur={handleFieldBlur('startDate')}
                      error={form.touched.startDate && !!form.errors.startDate}
                      helperText={form.touched.startDate && form.errors.startDate}
                      required
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: today }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="End Date"
                      value={form.values.endDate}
                      onChange={handleInputChange('endDate')}
                      onBlur={handleFieldBlur('endDate')}
                      error={form.touched.endDate && !!form.errors.endDate}
                      helperText={form.touched.endDate && form.errors.endDate}
                      required
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: form.values.startDate || today }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Privacy Settings */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon color="primary" />
                  Privacy Settings
                </Typography>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ mb: 1 }}>
                    Who can see this trip?
                  </FormLabel>
                  <RadioGroup
                    value={form.values.isPublic ? 'public' : 'private'}
                    onChange={handlePrivacyChange}
                  >
                    <FormControlLabel
                      value="private"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            Private Trip
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Only invited members can see and join this trip
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="public"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              Public Trip
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Anyone can discover and request to join this trip
                            </Typography>
                          </Box>
                          <Tooltip title="Public trips appear in search results and can be joined by anyone">
                            <InfoIcon fontSize="small" color="action" />
                          </Tooltip>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {/* Trip Preview */}
              {form.values.title && form.values.locationName && form.values.startDate && form.values.endDate && (
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Trip Preview
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" component="span" fontWeight="medium">
                        {form.values.title}
                      </Typography>
                      {form.values.isPublic && (
                        <Chip label="Public" size="small" color="primary" sx={{ ml: 1 }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      <LocationIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                      {form.values.locationName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <CalendarIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                      {new Date(form.values.startDate).toLocaleDateString()} - {new Date(form.values.endDate).toLocaleDateString()}
                    </Typography>
                    {form.values.description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {form.values.description}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {onCancel && (
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={form.isSubmitting}
                      sx={{ minWidth: 120 }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={form.isSubmitting}
                    sx={{ minWidth: 120 }}
                  >
                    {form.isSubmitting ? 'Creating...' : 'Create Trip'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading || form.isSubmitting}
      >
        <Box textAlign="center">
          <CircularProgress color="inherit" />
          <Typography variant="body2" sx={{ mt: 2 }}>
            {form.isSubmitting ? 'Creating your trip...' : 'Loading...'}
          </Typography>
        </Box>
      </Backdrop>
    </Container>
  );
};

export default TripCreationForm;