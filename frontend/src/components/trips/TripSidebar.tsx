/**
 * TripSidebar component - sidebar with member summary and quick actions
 * Displays member avatars, count, and provides quick access to trip functions
 */

import {
  Box,
  Paper,
  Typography,
  Stack,
  Avatar,
  AvatarGroup,
  Button,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { MemberRole } from '../../types';

interface TripMember {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    displayName?: string;
    username?: string;
  };
  role: string;
  joinedAt: string;
}

interface TripSidebarProps {
  members: TripMember[] | undefined;
  isLoading?: boolean;
  currentUserId?: string | undefined;
  userRole?: MemberRole | undefined;
  onEditTrip?: () => void;
  onManageMembers?: () => void;
  onViewSettings?: () => void;
  onShareTrip?: () => void;
  onSwitchToTab?: (tabIndex: number) => void;
}

const getMemberDisplayName = (member: TripMember) => {
  return member.user.displayName || member.user.username || member.user.email;
};

const getMemberInitial = (member: TripMember) => {
  const name = getMemberDisplayName(member);
  return name.charAt(0).toUpperCase();
};

const getRoleColor = (role: string) => {
  switch (role) {
    case MemberRole.HOST:
      return 'primary';
    case MemberRole.CO_HOST:
      return 'secondary';
    default:
      return 'default';
  }
};

export function TripSidebar({
  members = [],
  isLoading = false,
  currentUserId,
  userRole,
  onEditTrip,
  onManageMembers,
  onViewSettings,
  onShareTrip,
  onSwitchToTab,
}: TripSidebarProps) {
  const canEdit = userRole === MemberRole.HOST || userRole === MemberRole.CO_HOST;
  const canManageMembers = userRole === MemberRole.HOST || userRole === MemberRole.CO_HOST;
  const canViewSettings = userRole === MemberRole.HOST;

  // Sort members for display (HOST first, then CO_HOST, then MEMBER)
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { HOST: 0, CO_HOST: 1, MEMBER: 2 };
    return (roleOrder[a.role as keyof typeof roleOrder] ?? 3) - (roleOrder[b.role as keyof typeof roleOrder] ?? 3);
  });

  // Get up to 5 members for avatar display
  const displayMembers = sortedMembers.slice(0, 5);
  const remainingCount = Math.max(0, members.length - 5);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, height: 'fit-content', minWidth: 280 }}>
        <Typography variant="h6" gutterBottom>
          Trip Info
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 'fit-content', minWidth: 280 }}>
      {/* Member Summary */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Members</Typography>
          <Chip
            label={`${members.length}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {members.length > 0 ? (
          <>
            <AvatarGroup max={4} sx={{ justifyContent: 'flex-start', mb: 2 }}>
              {displayMembers.map((member) => (
                <Tooltip
                  key={member.id}
                  title={`${getMemberDisplayName(member)} (${member.role})`}
                >
                  <Avatar
                    sx={{
                      bgcolor: getRoleColor(member.role) === 'primary' ? 'primary.main' :
                               getRoleColor(member.role) === 'secondary' ? 'secondary.main' : 'grey.500',
                      border: member.userId === currentUserId ? '2px solid' : 'none',
                      borderColor: 'primary.light',
                    }}
                  >
                    {getMemberInitial(member)}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>

            {remainingCount > 0 && (
              <Typography variant="body2" color="text.secondary" mb={2}>
                +{remainingCount} more members
              </Typography>
            )}

            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => onSwitchToTab?.(0)} // Switch to Members tab
              sx={{ mb: 1 }}
            >
              View All Members
            </Button>

            {canManageMembers && (
              <Button
                fullWidth
                variant="text"
                size="small"
                startIcon={<AddIcon />}
                onClick={onManageMembers}
              >
                Manage Members
              </Button>
            )}
          </>
        ) : (
          <Box textAlign="center" py={2}>
            <PersonIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No members yet
            </Typography>
            {canManageMembers && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={onManageMembers}
                sx={{ mt: 1 }}
              >
                Invite Members
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Quick Actions */}
      <Box>
        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          Quick Actions
        </Typography>

        <Stack spacing={1}>
          {canEdit && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={onEditTrip}
            >
              Edit Trip
            </Button>
          )}

          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<ShareIcon />}
            onClick={onShareTrip}
          >
            Share Trip
          </Button>

          {canViewSettings && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={onViewSettings}
            >
              Trip Settings
            </Button>
          )}
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Navigation Shortcuts */}
      <Box>
        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          Navigate
        </Typography>

        <Stack spacing={0.5}>
          <Button
            fullWidth
            variant="text"
            size="small"
            onClick={() => onSwitchToTab?.(1)}
            sx={{ justifyContent: 'flex-start' }}
          >
            Schedule
          </Button>
          <Button
            fullWidth
            variant="text"
            size="small"
            onClick={() => onSwitchToTab?.(2)}
            sx={{ justifyContent: 'flex-start' }}
          >
            Items
          </Button>
          <Button
            fullWidth
            variant="text"
            size="small"
            onClick={() => onSwitchToTab?.(3)}
            sx={{ justifyContent: 'flex-start' }}
          >
            Announcements
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

export default TripSidebar;