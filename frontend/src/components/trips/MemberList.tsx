/**
 * MemberList component - displays trip members with roles
 * Shows avatar, name, and role badge for each member
 */

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Star as HostIcon,
  StarHalf as CoHostIcon,
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

interface MemberListProps {
  members: TripMember[];
  isLoading?: boolean | undefined;
  currentUserId?: string | undefined;
}

const getRoleDisplay = (role: string) => {
  switch (role) {
    case MemberRole.HOST:
      return { label: 'Host', color: 'primary' as const, icon: <HostIcon fontSize="small" /> };
    case MemberRole.CO_HOST:
      return { label: 'Co-Host', color: 'secondary' as const, icon: <CoHostIcon fontSize="small" /> };
    case MemberRole.MEMBER:
    default:
      return { label: 'Member', color: 'default' as const, icon: null };
  }
};

const getMemberDisplayName = (member: TripMember) => {
  return member.user.displayName || member.user.username || member.user.email;
};

const getMemberInitial = (member: TripMember) => {
  const name = getMemberDisplayName(member);
  return name.charAt(0).toUpperCase();
};

function MemberSkeleton() {
  return (
    <ListItem>
      <ListItemAvatar>
        <Skeleton variant="circular" width={40} height={40} />
      </ListItemAvatar>
      <ListItemText
        primary={<Skeleton width={120} />}
        secondary={<Skeleton width={80} />}
      />
    </ListItem>
  );
}

export function MemberList({ members, isLoading, currentUserId }: MemberListProps) {
  if (isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Members
        </Typography>
        <List dense>
          {[1, 2, 3].map((i) => (
            <MemberSkeleton key={i} />
          ))}
        </List>
      </Paper>
    );
  }

  if (!members || members.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Members
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="center" py={4}>
          <Typography color="text.secondary">No members found</Typography>
        </Box>
      </Paper>
    );
  }

  // Sort members: HOST first, then CO_HOST, then MEMBER
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { HOST: 0, CO_HOST: 1, MEMBER: 2 };
    return (roleOrder[a.role as keyof typeof roleOrder] ?? 3) - (roleOrder[b.role as keyof typeof roleOrder] ?? 3);
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">
          Members
        </Typography>
        <Chip
          label={`${members.length} ${members.length === 1 ? 'member' : 'members'}`}
          size="small"
          variant="outlined"
        />
      </Box>
      <List dense>
        {sortedMembers.map((member) => {
          const roleDisplay = getRoleDisplay(member.role);
          const isCurrentUser = member.userId === currentUserId;

          return (
            <ListItem
              key={member.id}
              sx={{
                borderRadius: 1,
                bgcolor: isCurrentUser ? 'action.selected' : 'transparent',
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  {getMemberInitial(member)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight={500}>
                      {getMemberDisplayName(member)}
                    </Typography>
                    {isCurrentUser && (
                      <Typography variant="caption" color="text.secondary">
                        (you)
                      </Typography>
                    )}
                  </Box>
                }
                secondary={member.user.email}
              />
              <Chip
                icon={roleDisplay.icon || <PersonIcon fontSize="small" />}
                label={roleDisplay.label}
                color={roleDisplay.color}
                size="small"
                variant="outlined"
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}

export default MemberList;
