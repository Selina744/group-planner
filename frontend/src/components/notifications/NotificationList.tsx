/**
 * NotificationList component
 * Displays a list of notifications with filter tabs (All/Unread) and mark-all-read button
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  DoneAll as MarkAllReadIcon,
  InboxOutlined as EmptyIcon,
} from '@mui/icons-material';
import { NotificationCard } from './NotificationCard';
import {
  useNotifications,
  useUnreadNotifications,
  useNotificationActions,
} from '../../stores';
import type { Notification } from '../../stores/notificationStore';

type FilterTab = 'all' | 'unread';

interface NotificationListProps {
  /**
   * Called when a notification is clicked
   */
  onNotificationClick?: (notification: Notification) => void;

  /**
   * Whether the list is in a loading state
   */
  isLoading?: boolean;

  /**
   * Maximum height for the notification list (enables scrolling)
   */
  maxHeight?: number | string;

  /**
   * Show the mark all as read button
   */
  showMarkAllRead?: boolean;
}

export function NotificationList({
  onNotificationClick,
  isLoading = false,
  maxHeight = 400,
  showMarkAllRead = true,
}: NotificationListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Get notifications from store
  const allNotifications = useNotifications();
  const unreadNotifications = useUnreadNotifications();
  const { markAsRead, markAllAsRead } = useNotificationActions();

  // Filter notifications based on active tab
  const displayedNotifications = useMemo(() => {
    return activeTab === 'unread' ? unreadNotifications : allNotifications;
  }, [activeTab, allNotifications, unreadNotifications]);

  const hasUnread = unreadNotifications.length > 0;

  // Handle tab change
  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: FilterTab) => {
      setActiveTab(newValue);
    },
    []
  );

  // Handle mark as read
  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markAsRead(notificationId);
    },
    [markAsRead]
  );

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  // Handle notification click
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      // Navigation to actionUrl can be handled by the parent
      if (onNotificationClick) {
        onNotificationClick(notification);
      }
    },
    [onNotificationClick]
  );

  // Loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with tabs and mark all read button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          pt: 1,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Notification filter tabs"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
            },
          }}
        >
          <Tab
            label={`All (${allNotifications.length})`}
            value="all"
            id="notification-tab-all"
            aria-controls="notification-tabpanel-all"
          />
          <Tab
            label={`Unread (${unreadNotifications.length})`}
            value="unread"
            id="notification-tab-unread"
            aria-controls="notification-tabpanel-unread"
          />
        </Tabs>

        {showMarkAllRead && hasUnread && (
          <Button
            size="small"
            startIcon={<MarkAllReadIcon />}
            onClick={handleMarkAllAsRead}
            sx={{ textTransform: 'none' }}
          >
            Mark all read
          </Button>
        )}
      </Box>

      <Divider sx={{ mt: 1 }} />

      {/* Notification list */}
      <Box
        role="tabpanel"
        id={`notification-tabpanel-${activeTab}`}
        aria-labelledby={`notification-tab-${activeTab}`}
        sx={{
          maxHeight,
          overflowY: 'auto',
          p: 1,
        }}
      >
        {displayedNotifications.length === 0 ? (
          // Empty state
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              px: 2,
            }}
          >
            <EmptyIcon
              sx={{
                fontSize: 48,
                color: 'text.disabled',
                mb: 2,
              }}
            />
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
            >
              {activeTab === 'unread'
                ? 'No unread notifications'
                : 'No notifications yet'}
            </Typography>
            <Typography
              variant="body2"
              color="text.disabled"
              align="center"
              sx={{ mt: 0.5 }}
            >
              {activeTab === 'unread'
                ? 'You are all caught up!'
                : 'New notifications will appear here'}
            </Typography>
          </Box>
        ) : (
          // Notification cards
          displayedNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onClick={handleNotificationClick}
            />
          ))
        )}
      </Box>
    </Box>
  );
}

export default NotificationList;
