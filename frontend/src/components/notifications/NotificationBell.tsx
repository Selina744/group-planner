/**
 * NotificationBell component
 * Bell icon with unread count badge for use in app header
 */

import React, { useState, useCallback } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  Divider,
  Button,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsEmptyIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useUnreadCount, useNotifications } from '../../stores';
import { NotificationList } from './NotificationList';
import type { Notification } from '../../stores/notificationStore';

interface NotificationBellProps {
  /**
   * Called when a notification is clicked
   */
  onNotificationClick?: (notification: Notification) => void;

  /**
   * Called when settings button is clicked
   */
  onSettingsClick?: () => void;

  /**
   * Size of the bell icon button
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Color of the bell icon
   */
  color?: 'inherit' | 'default' | 'primary' | 'secondary';
}

export function NotificationBell({
  onNotificationClick,
  onSettingsClick,
  size = 'medium',
  color = 'inherit',
}: NotificationBellProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const unreadCount = useUnreadCount();
  const notifications = useNotifications();

  const open = Boolean(anchorEl);
  const popoverId = open ? 'notification-popover' : undefined;

  // Handle bell click to open popover
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    },
    []
  );

  // Handle popover close
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (onNotificationClick) {
        onNotificationClick(notification);
      }
      // Optionally close the popover after clicking
      handleClose();
    },
    [onNotificationClick, handleClose]
  );

  // Handle settings click
  const handleSettingsClick = useCallback(() => {
    if (onSettingsClick) {
      onSettingsClick();
    }
    handleClose();
  }, [onSettingsClick, handleClose]);

  // Format badge content (show 99+ for large numbers)
  const badgeContent = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <>
      <IconButton
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-describedby={popoverId}
        onClick={handleClick}
        size={size}
        color={color}
        sx={{
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Badge
          badgeContent={badgeContent}
          color="error"
          max={99}
          overlap="circular"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              height: 18,
              minWidth: 18,
            },
          }}
        >
          {notifications.length > 0 ? (
            <NotificationsIcon />
          ) : (
            <NotificationsEmptyIcon />
          )}
        </Badge>
      </IconButton>

      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxWidth: '100vw',
              mt: 1,
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
          }}
        >
          <Typography variant="h6" component="h2">
            Notifications
          </Typography>

          {onSettingsClick && (
            <IconButton
              size="small"
              aria-label="Notification settings"
              onClick={handleSettingsClick}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Divider />

        {/* Notification list */}
        <NotificationList
          onNotificationClick={handleNotificationClick}
          maxHeight={400}
          showMarkAllRead={true}
        />

        {/* Footer with view all link */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
              <Button
                size="small"
                sx={{ textTransform: 'none' }}
                onClick={handleClose}
              >
                View all notifications
              </Button>
            </Box>
          </>
        )}
      </Popover>
    </>
  );
}

export default NotificationBell;
