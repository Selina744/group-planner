/**
 * EventCard component - displays a single event with status badge
 * Shows event details with visual status indicators
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  Cancel as CancelIcon,
  Schedule as TimeIcon,
  LocationOn as LocationIcon,
  AttachMoney as CostIcon,
  Hotel as AccommodationIcon,
  DirectionsCar as TransportationIcon,
  LocalActivity as ActivityIcon,
  Restaurant as DiningIcon,
  MeetingRoom as MeetingIcon,
  Category as OtherIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import type { Event, EventStatus } from '../../types';

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onApprove?: (event: Event) => void;
  onCancel?: (event: Event) => void;
  canEdit?: boolean;
  canApprove?: boolean;
}

const getStatusDisplay = (status: EventStatus) => {
  switch (status) {
    case 'PROPOSED':
      return { label: 'Proposed', color: 'warning' as const };
    case 'APPROVED':
      return { label: 'Approved', color: 'success' as const };
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'error' as const };
    default:
      return { label: status, color: 'default' as const };
  }
};

const getCategoryIcon = (category?: string) => {
  switch (category) {
    case 'ACCOMMODATION':
      return <AccommodationIcon fontSize="small" />;
    case 'TRANSPORTATION':
      return <TransportationIcon fontSize="small" />;
    case 'ACTIVITY':
      return <ActivityIcon fontSize="small" />;
    case 'DINING':
      return <DiningIcon fontSize="small" />;
    case 'MEETING':
      return <MeetingIcon fontSize="small" />;
    case 'OTHER':
    default:
      return <OtherIcon fontSize="small" />;
  }
};

const formatTime = (dateString?: string, isAllDay?: boolean) => {
  if (!dateString) return 'No time set';
  if (isAllDay) return 'All day';

  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatCost = (cost?: number, currency?: string) => {
  if (!cost) return null;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(cost);
};

const getLocationDisplay = (location?: Event['location']) => {
  if (!location) return null;

  if (location.venue) return location.venue;
  if (location.address) return location.address;
  if (location.city && location.state) return `${location.city}, ${location.state}`;
  if (location.city) return location.city;

  return null;
};

export function EventCard({
  event,
  onEdit,
  onDelete,
  onApprove,
  onCancel,
  canEdit = false,
  canApprove = false,
}: EventCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit?.(event);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete?.(event);
  };

  const handleApprove = () => {
    handleMenuClose();
    onApprove?.(event);
  };

  const handleCancelEvent = () => {
    handleMenuClose();
    onCancel?.(event);
  };

  const statusDisplay = getStatusDisplay(event.status);
  const locationDisplay = getLocationDisplay(event.location);
  const costDisplay = formatCost(event.estimatedCost, event.currency);
  const showMenu = canEdit || canApprove;

  return (
    <Card
      sx={{
        mb: 2,
        opacity: event.status === 'CANCELLED' ? 0.6 : 1,
        position: 'relative',
      }}
    >
      <CardContent>
        {/* Header with title and actions */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box display="flex" alignItems="flex-start" gap={1} flex={1}>
            <Box sx={{ color: 'action.active', mt: 0.5 }}>
              {getCategoryIcon(event.category)}
            </Box>
            <Box flex={1}>
              <Typography variant="h6" component="h3" gutterBottom>
                {event.title}
              </Typography>
              {event.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {event.description}
                </Typography>
              )}
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={statusDisplay.label}
              color={statusDisplay.color}
              size="small"
              variant="outlined"
            />
            {showMenu && (
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                aria-label="Event actions"
              >
                <MoreIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Event details */}
        <Box display="flex" flexDirection="column" gap={0.5}>
          {/* Time */}
          {(event.startTime || event.endTime) && (
            <Box display="flex" alignItems="center" gap={1}>
              <TimeIcon fontSize="small" sx={{ color: 'action.active' }} />
              <Typography variant="body2">
                {formatTime(event.startTime, event.isAllDay)}
                {event.endTime && !event.isAllDay && ` - ${formatTime(event.endTime)}`}
              </Typography>
            </Box>
          )}

          {/* Location */}
          {locationDisplay && (
            <Box display="flex" alignItems="center" gap={1}>
              <LocationIcon fontSize="small" sx={{ color: 'action.active' }} />
              <Typography variant="body2">{locationDisplay}</Typography>
            </Box>
          )}

          {/* Cost */}
          {costDisplay && (
            <Box display="flex" alignItems="center" gap={1}>
              <CostIcon fontSize="small" sx={{ color: 'action.active' }} />
              <Typography variant="body2">{costDisplay}</Typography>
            </Box>
          )}
        </Box>

        {/* Suggested by */}
        {event.suggestedBy && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Suggested by{' '}
            {event.suggestedBy.displayName ||
              event.suggestedBy.username ||
              event.suggestedBy.email}
          </Typography>
        )}
      </CardContent>

      {/* Actions menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {canEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        {canApprove && event.status === 'PROPOSED' && (
          <MenuItem onClick={handleApprove}>
            <ListItemIcon>
              <ApproveIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Approve</ListItemText>
          </MenuItem>
        )}

        {canApprove && event.status === 'APPROVED' && (
          <MenuItem onClick={handleCancelEvent}>
            <ListItemIcon>
              <CancelIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Cancel</ListItemText>
          </MenuItem>
        )}

        {canEdit && (
          <MenuItem onClick={handleDelete}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}

export default EventCard;
