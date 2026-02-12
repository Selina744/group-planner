/**
 * Timeline component - displays events grouped by day
 * Shows trip events organized chronologically with day headers
 */

import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Add as AddIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { EventCard } from './EventCard';
import { EventForm } from './EventForm';
import type { Event, CreateEventForm, UpdateEventForm } from '../../types';
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useUpdateEventStatusMutation,
} from '../../queries/hooks';

interface TimelineProps {
  events: Event[];
  tripId: string;
  isLoading?: boolean | undefined;
  canCreate?: boolean | undefined;
  canEdit?: boolean | undefined;
  canApprove?: boolean | undefined;
  currentUserId?: string | undefined;
}

interface GroupedEvents {
  date: string;
  displayDate: string;
  events: Event[];
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset time to midnight for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const groupEventsByDay = (events: Event[]): GroupedEvents[] => {
  // Filter out events without start times and sort by start time
  const sortedEvents = events
    .filter((event): event is Event & { startTime: string } => !!event.startTime)
    .sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

  // Group by date
  const grouped = new Map<string, (Event & { startTime: string })[]>();

  sortedEvents.forEach((event) => {
    const date = new Date(event.startTime);
    const dateKey = date.toISOString().split('T')[0]!; // YYYY-MM-DD (always exists)

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(event);
  });

  // Convert to array and add display dates
  return Array.from(grouped.entries()).map(([date, events]) => ({
    date,
    displayDate: formatDate(date),
    events,
  }));
};

export function Timeline({
  events,
  tripId,
  isLoading = false,
  canCreate = false,
  canEdit = false,
  canApprove = false,
  currentUserId,
}: TimelineProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);

  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();
  const deleteMutation = useDeleteEventMutation();
  const updateStatusMutation = useUpdateEventStatusMutation();

  const groupedEvents = useMemo(() => groupEventsByDay(events), [events]);

  const handleOpenForm = () => {
    setEditingEvent(undefined);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingEvent(undefined);
  };

  const handleSubmit = async (data: CreateEventForm | UpdateEventForm) => {
    try {
      if (editingEvent) {
        await updateMutation.mutateAsync({
          eventId: editingEvent.id,
          updateData: data as UpdateEventForm,
        });
      } else {
        await createMutation.mutateAsync(data as CreateEventForm);
      }
      handleCloseForm();
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleDelete = async (event: Event) => {
    if (!window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(event.id);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleApprove = async (event: Event) => {
    try {
      await updateStatusMutation.mutateAsync({
        eventId: event.id,
        status: 'APPROVED',
      });
    } catch (error) {
      console.error('Failed to approve event:', error);
    }
  };

  const handleCancel = async (event: Event) => {
    try {
      await updateStatusMutation.mutateAsync({
        eventId: event.id,
        status: 'CANCELLED',
      });
    } catch (error) {
      console.error('Failed to cancel event:', error);
    }
  };

  const canEditEvent = (event: Event): boolean => {
    return canEdit || (!!currentUserId && event.suggestedById === currentUserId);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  // Empty state - no events with start times
  if (groupedEvents.length === 0) {
    return (
      <Box>
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No scheduled events yet
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Create your first event to start planning the itinerary
          </Typography>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenForm}
            >
              Create Event
            </Button>
          )}
        </Paper>

        {/* Event form modal */}
        <EventForm
          open={formOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          tripId={tripId}
          event={editingEvent}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with create button */}
      {canCreate && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">Schedule</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenForm}
          >
            Add Event
          </Button>
        </Box>
      )}

      {/* Timeline */}
      <Box>
        {groupedEvents.map((group) => (
          <Box key={group.date} mb={4}>
            {/* Day header */}
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                bgcolor: 'background.default',
                zIndex: 1,
                py: 1,
                mb: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                }}
              >
                {group.displayDate}
              </Typography>
              <Divider sx={{ mt: 1 }} />
            </Box>

            {/* Events for this day */}
            <Box pl={{ xs: 0, sm: 2 }}>
              {group.events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onApprove={handleApprove}
                  onCancel={handleCancel}
                  canEdit={canEditEvent(event)}
                  canApprove={canApprove}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Event form modal */}
      <EventForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        tripId={tripId}
        event={editingEvent}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </Box>
  );
}

export default Timeline;
