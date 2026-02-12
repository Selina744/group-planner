/**
 * NotificationCard component
 * Displays a single notification with type icon, timestamp, and read/unread status
 */

import React, { useCallback } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Mail as InviteIcon,
  Update as UpdateIcon,
  PersonAdd as MemberJoinedIcon,
  Event as EventIcon,
  Circle as UnreadDot,
} from '@mui/icons-material';
import type { Notification, NotificationType } from '../../stores/notificationStore';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

/**
 * Get the appropriate icon for a notification type
 */
function getNotificationIcon(type: NotificationType): React.ReactNode {
  const iconProps = { fontSize: 'medium' as const };

  switch (type) {
    case 'success':
      return <SuccessIcon {...iconProps} color="success" />;
    case 'warning':
      return <WarningIcon {...iconProps} color="warning" />;
    case 'error':
      return <ErrorIcon {...iconProps} color="error" />;
    case 'trip_invite':
      return <InviteIcon {...iconProps} color="primary" />;
    case 'trip_update':
      return <UpdateIcon {...iconProps} color="info" />;
    case 'member_joined':
      return <MemberJoinedIcon {...iconProps} color="success" />;
    case 'event_added':
    case 'event_updated':
      return <EventIcon {...iconProps} color="secondary" />;
    case 'info':
    default:
      return <InfoIcon {...iconProps} color="info" />;
  }
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // For older notifications, show the date
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function NotificationCard({
  notification,
  onMarkAsRead,
  onClick,
}: NotificationCardProps) {
  const handleClick = useCallback(() => {
    // Mark as read when clicked
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // Call the onClick callback
    if (onClick) {
      onClick(notification);
    }
  }, [notification, onMarkAsRead, onClick]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <Card
      sx={{
        mb: 1,
        backgroundColor: notification.read
          ? 'background.paper'
          : 'action.hover',
        transition: 'background-color 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: notification.read
            ? 'action.hover'
            : 'action.selected',
        },
      }}
      elevation={notification.read ? 0 : 1}
    >
      <CardActionArea
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        sx={{ p: 2 }}
        aria-label={`${notification.read ? 'Read' : 'Unread'} notification: ${notification.title}`}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Notification icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              mt: 0.5,
            }}
          >
            {getNotificationIcon(notification.type)}
          </Box>

          {/* Notification content */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography
                variant="subtitle2"
                component="h3"
                sx={{
                  fontWeight: notification.read ? 'normal' : 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {notification.title}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {/* Unread indicator */}
                {!notification.read && (
                  <Tooltip title="Unread">
                    <UnreadDot
                      sx={{
                        fontSize: 8,
                        color: 'primary.main',
                      }}
                    />
                  </Tooltip>
                )}

                {/* Timestamp */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ whiteSpace: 'nowrap', ml: 1 }}
                >
                  {formatTimestamp(notification.createdAt)}
                </Typography>
              </Box>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {notification.message}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}

export default NotificationCard;
