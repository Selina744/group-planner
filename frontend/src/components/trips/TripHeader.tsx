/**
 * TripHeader component - displays trip header information
 * Shows title, description, dates, location, and status
 */

import {
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
} from '@mui/icons-material';
import type { Trip } from '../../types';
import { MemberRole } from '../../types';

interface TripHeaderProps {
  trip: Trip;
  userRole?: MemberRole | undefined;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TripHeader({ trip, userRole, onEdit, onDelete }: TripHeaderProps) {
  const canEdit = userRole === MemberRole.HOST || userRole === MemberRole.CO_HOST;
  const canDelete = userRole === MemberRole.HOST;

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
  };

  const getTripStatus = () => {
    const now = new Date();
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    if (now < startDate) {
      return { label: 'Upcoming', color: 'info' as const };
    } else if (now >= startDate && now <= endDate) {
      return { label: 'In Progress', color: 'success' as const };
    } else {
      return { label: 'Completed', color: 'default' as const };
    }
  };

  const status = getTripStatus();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Typography variant="h4" component="h1" fontWeight={700}>
              {trip.title}
            </Typography>
            <Chip
              label={status.label}
              color={status.color}
              size="small"
            />
            <Tooltip title={trip.isPublic ? 'Public trip' : 'Private trip'}>
              {trip.isPublic ? (
                <PublicIcon color="action" fontSize="small" />
              ) : (
                <PrivateIcon color="action" fontSize="small" />
              )}
            </Tooltip>
          </Box>

          {trip.description && (
            <Typography variant="body1" color="text.secondary" mb={2}>
              {trip.description}
            </Typography>
          )}

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {trip.startDate && trip.endDate && (
              <Chip
                icon={<CalendarIcon />}
                label={formatDateRange(trip.startDate, trip.endDate)}
                variant="outlined"
                size="small"
              />
            )}
            {trip.location?.name && (
              <Chip
                icon={<LocationIcon />}
                label={trip.location.name}
                variant="outlined"
                size="small"
              />
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1}>
          {canEdit && onEdit && (
            <Tooltip title="Edit trip">
              <IconButton onClick={onEdit} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
          {canDelete && onDelete && (
            <Tooltip title="Delete trip">
              <IconButton onClick={onDelete} color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default TripHeader;
