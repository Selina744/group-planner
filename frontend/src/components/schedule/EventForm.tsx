/**
 * EventForm component - modal for creating and editing events
 * Provides a form with all event fields
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Grid,
  InputAdornment,
} from '@mui/material';
import type { Event, CreateEventForm, UpdateEventForm } from '../../types';

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventForm | UpdateEventForm) => void;
  tripId: string;
  event?: Event | undefined;
  isLoading?: boolean | undefined;
}

const CATEGORIES = [
  { value: 'ACCOMMODATION', label: 'Accommodation' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'DINING', label: 'Dining' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'OTHER', label: 'Other' },
];

export function EventForm({
  open,
  onClose,
  onSubmit,
  tripId,
  event,
  isLoading = false,
}: EventFormProps) {
  const [formData, setFormData] = useState<CreateEventForm>({
    tripId,
    title: '',
    isAllDay: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when event prop changes
  useEffect(() => {
    if (event) {
      const newData: CreateEventForm = {
        tripId: event.tripId,
        title: event.title,
        isAllDay: event.isAllDay,
      };
      if (event.description) newData.description = event.description;
      if (event.startTime) newData.startTime = event.startTime;
      if (event.endTime) newData.endTime = event.endTime;
      if (event.category) newData.category = event.category;
      if (event.estimatedCost) newData.estimatedCost = event.estimatedCost;
      if (event.currency) newData.currency = event.currency;
      if (event.location) newData.location = event.location;
      setFormData(newData);
    } else {
      // Reset form for new event
      setFormData({
        tripId,
        title: '',
        isAllDay: false,
      });
    }
    setErrors({});
  }, [event, tripId, open]);

  const handleChange = (field: keyof CreateEventForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleLocationChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: e.target.value,
      },
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    if (formData.estimatedCost !== undefined && formData.estimatedCost < 0) {
      newErrors.estimatedCost = 'Cost must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Clean up form data - build only with defined values
    const submitData: CreateEventForm | UpdateEventForm = {
      tripId: formData.tripId,
      title: formData.title.trim(),
      isAllDay: formData.isAllDay,
    };

    if (formData.description?.trim()) {
      submitData.description = formData.description.trim();
    }
    if (formData.startTime) {
      submitData.startTime = formData.startTime;
    }
    if (formData.endTime) {
      submitData.endTime = formData.endTime;
    }
    if (formData.category) {
      submitData.category = formData.category;
    }
    if (formData.estimatedCost !== undefined) {
      submitData.estimatedCost = formData.estimatedCost;
    }
    if (formData.currency) {
      submitData.currency = formData.currency;
    }

    // Only include location if it has meaningful data
    if (formData.location?.venue || formData.location?.address) {
      submitData.location = formData.location;
    }

    onSubmit(submitData);
  };

  const handleCancel = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {/* Title */}
            <TextField
              label="Title"
              value={formData.title}
              onChange={handleChange('title')}
              error={Boolean(errors.title)}
              helperText={errors.title}
              required
              fullWidth
            />

            {/* Description */}
            <TextField
              label="Description"
              value={formData.description || ''}
              onChange={handleChange('description')}
              multiline
              rows={3}
              fullWidth
            />

            {/* Category */}
            <TextField
              select
              label="Category"
              value={formData.category || ''}
              onChange={handleChange('category')}
              fullWidth
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>

            {/* All day checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isAllDay}
                  onChange={handleChange('isAllDay')}
                />
              }
              label="All day event"
            />

            {/* Date/Time pickers */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Time"
                  type={formData.isAllDay ? 'date' : 'datetime-local'}
                  value={formData.startTime || ''}
                  onChange={handleChange('startTime')}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Time"
                  type={formData.isAllDay ? 'date' : 'datetime-local'}
                  value={formData.endTime || ''}
                  onChange={handleChange('endTime')}
                  error={Boolean(errors.endTime)}
                  helperText={errors.endTime}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {/* Location */}
            <TextField
              label="Venue/Location Name"
              value={formData.location?.venue || ''}
              onChange={handleLocationChange('venue')}
              fullWidth
            />

            <TextField
              label="Address"
              value={formData.location?.address || ''}
              onChange={handleLocationChange('address')}
              fullWidth
            />

            {/* Cost */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Estimated Cost"
                  type="number"
                  value={formData.estimatedCost ?? ''}
                  onChange={handleChange('estimatedCost')}
                  error={Boolean(errors.estimatedCost)}
                  helperText={errors.estimatedCost}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Currency"
                  value={formData.currency || 'USD'}
                  onChange={handleChange('currency')}
                  fullWidth
                  inputProps={{ maxLength: 3 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default EventForm;
