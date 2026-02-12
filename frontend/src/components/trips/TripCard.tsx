/**
 * TripCard component - displays a trip in card format
 * Shows title, dates, location, status, and member count
 */

import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  Stack,
  Box,
  Skeleton,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import type { Trip } from '../../types';

type TripStatus = 'planning' | 'active' | 'completed';

interface TripCardProps {
  trip: Trip;
  onClick?: () => void;
  memberCount?: number | undefined;
}

const getTripStatus = (trip: Trip): { status: TripStatus; label: string; color: 'info' | 'success' | 'default' } => {
  const now = new Date();
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);

  if (now < startDate) {
    return { status: 'planning', label: 'Planning', color: 'info' };
  } else if (now >= startDate && now <= endDate) {
    return { status: 'active', label: 'Active', color: 'success' };
  } else {
    return { status: 'completed', label: 'Completed', color: 'default' };
  }
};

const formatDateRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  const yearOptions: Intl.DateTimeFormatOptions = {
    ...options,
    year: 'numeric',
  };

  // If same year, only show year once
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, yearOptions)}`;
  }
  return `${startDate.toLocaleDateString(undefined, yearOptions)} - ${endDate.toLocaleDateString(undefined, yearOptions)}`;
};

export function TripCard({ trip, onClick, memberCount }: TripCardProps) {
  const statusInfo = getTripStatus(trip);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header with title and status */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="h6" component="h3" noWrap sx={{ flex: 1, mr: 1 }}>
              {trip.title}
            </Typography>
            <Chip
              label={statusInfo.label}
              color={statusInfo.color}
              size="small"
            />
          </Box>

          {/* Description */}
          {trip.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                minHeight: 40,
              }}
            >
              {trip.description}
            </Typography>
          )}

          {/* Info chips */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 'auto' }}>
            {trip.startDate && trip.endDate && (
              <Chip
                icon={<CalendarIcon />}
                label={formatDateRange(trip.startDate, trip.endDate)}
                size="small"
                variant="outlined"
              />
            )}
            {trip.location?.name && (
              <Chip
                icon={<LocationIcon />}
                label={trip.location.name}
                size="small"
                variant="outlined"
                sx={{ maxWidth: 150 }}
              />
            )}
            {memberCount !== undefined && (
              <Chip
                icon={<PeopleIcon />}
                label={`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function TripCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: 2 }} />
        </Box>
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="80%" />
        <Box mt={2}>
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rectangular" width={120} height={24} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 2 }} />
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export default TripCard;
