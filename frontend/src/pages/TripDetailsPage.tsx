/**
 * TripDetailsPage - displays detailed view of a single trip
 * Shows trip header, members, and navigation tabs for schedule/items
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CalendarMonth as ScheduleIcon,
  Inventory as ItemsIcon,
  People as MembersIcon,
  Home as HomeIcon,
  Announcement as AnnouncementsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

import { useDeleteTripMutation, useTripEventsQuery, useTripItemsQuery } from '../queries/hooks';
import { TripHeader, MemberList, TripSidebar, InviteModal } from '../components/trips';
import { Timeline } from '../components/schedule';
import { ItemList, ItemForm } from '../components/items';
import { useTripData } from '../hooks/useTripContext';
import type { Item, ItemType } from '../types';

interface ApiError extends Error {
  status?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`trip-tabpanel-${index}`}
      aria-labelledby={`trip-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `trip-tab-${index}`,
    'aria-controls': `trip-tabpanel-${index}`,
  };
}

export function TripDetailsPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined);
  const [itemFormType, setItemFormType] = useState<ItemType>('RECOMMENDED' as ItemType);

  // Use the new trip context hook for unified data and permissions
  const {
    trip,
    members,
    currentUser: user,
    userRole,
    isLoading,
    error: tripError,
    permissions,
  } = useTripData(tripId || '');

  const deleteMutation = useDeleteTripMutation();

  // Fetch trip events
  const {
    data: eventsData,
    isLoading: eventsLoading,
  } = useTripEventsQuery(tripId || '', !!tripId);

  // Fetch items for the trip
  const {
    data: itemsData,
    isLoading: itemsLoading,
  } = useTripItemsQuery(tripId || '', {}, !!tripId);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleEdit = () => {
    // TODO: Navigate to edit page when implemented
    navigate(`/trips/${tripId}/edit`);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tripId) return;

    try {
      await deleteMutation.mutateAsync(tripId);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete trip:', error);
    }
    setDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleAddItem = (type: ItemType) => {
    setEditingItem(undefined);
    setItemFormType(type);
    setItemFormOpen(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setItemFormType(item.type);
    setItemFormOpen(true);
  };

  const handleItemFormClose = () => {
    setItemFormOpen(false);
    setEditingItem(undefined);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (tripError) {
    const error = tripError as ApiError | null;
    const errorMessage = error?.message || 'Failed to load trip';
    const isNotFound = error?.status === 404;
    const isUnauthorized = error?.status === 403 || error?.status === 401;

    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Dashboard
        </Button>
        <Alert severity="error">
          {isNotFound && 'Trip not found. It may have been deleted or you may not have access.'}
          {isUnauthorized && 'You do not have permission to view this trip.'}
          {!isNotFound && !isUnauthorized && errorMessage}
        </Alert>
      </Container>
    );
  }

  // No trip data
  if (!trip) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Dashboard
        </Button>
        <Alert severity="warning">Trip not found</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header Bar */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', py: 2 }}>
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handleBack} edge="start">
              <BackIcon />
            </IconButton>
            <Breadcrumbs aria-label="breadcrumb">
              <Link
                color="inherit"
                href="/dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/dashboard');
                }}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <HomeIcon fontSize="small" />
                Dashboard
              </Link>
              <Typography color="text.primary">{trip.title}</Typography>
            </Breadcrumbs>
          </Box>
        </Container>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Trip Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <TripHeader
            trip={trip}
            userRole={userRole}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        </Paper>

        {/* Main Content Grid */}
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 300px' }} gap={3}>
          {/* Tab Navigation and Content */}
          <Box>
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="trip sections"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab
                  icon={<MembersIcon />}
                  iconPosition="start"
                  label="Members"
                  {...a11yProps(0)}
                />
                <Tab
                  icon={<ScheduleIcon />}
                  iconPosition="start"
                  label="Schedule"
                  {...a11yProps(1)}
                />
                <Tab
                  icon={<ItemsIcon />}
                  iconPosition="start"
                  label="Items"
                  {...a11yProps(2)}
                />
                <Tab
                  icon={<AnnouncementsIcon />}
                  iconPosition="start"
                  label="Announcements"
                  {...a11yProps(3)}
                />
                {permissions.canViewSettings && (
                  <Tab
                    icon={<SettingsIcon />}
                    iconPosition="start"
                    label="Settings"
                    {...a11yProps(4)}
                  />
                )}
              </Tabs>

              {/* Members Tab */}
              <TabPanel value={tabValue} index={0}>
                <Box px={3}>
                  <MemberList
                    members={members || []}
                    isLoading={isLoading}
                    currentUserId={user?.id}
                  />
                </Box>
              </TabPanel>

              {/* Schedule Tab */}
              <TabPanel value={tabValue} index={1}>
                <Box px={3}>
                  <Timeline
                    events={eventsData?.events || []}
                    tripId={tripId || ''}
                    isLoading={eventsLoading}
                    canCreate={permissions.canEdit}
                    canEdit={permissions.canEdit}
                    canApprove={permissions.canApprove}
                    currentUserId={user?.id}
                  />
                </Box>
              </TabPanel>

              {/* Items Tab */}
              <TabPanel value={tabValue} index={2}>
                <Box px={3}>
                  <ItemList
                    items={itemsData?.items || []}
                    currentUserId={user?.id}
                    canManageItems={permissions.canEdit}
                    isLoading={itemsLoading}
                    onEditItem={handleEditItem}
                    onAddItem={handleAddItem}
                  />
                </Box>
              </TabPanel>

              {/* Announcements Tab */}
              <TabPanel value={tabValue} index={3}>
                <Box px={3}>
                  <Alert severity="info">
                    Announcements functionality coming soon. This will show trip announcements and updates.
                  </Alert>
                </Box>
              </TabPanel>

              {/* Settings Tab - Only visible to HOST */}
              {permissions.canViewSettings && (
                <TabPanel value={tabValue} index={4}>
                  <Box px={3}>
                    <Alert severity="info">
                      Settings functionality coming soon. This will allow trip configuration and advanced options.
                    </Alert>
                  </Box>
                </TabPanel>
              )}
            </Paper>
          </Box>

          {/* Sidebar */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <TripSidebar
              members={members}
              isLoading={isLoading}
              currentUserId={user?.id}
              userRole={userRole}
              onEditTrip={handleEdit}
              onManageMembers={() => {
                // TODO: Navigate to member management when implemented
                setTabValue(0); // For now, switch to Members tab
              }}
              onViewSettings={() => {
                if (permissions.canViewSettings) {
                  setTabValue(4); // Switch to Settings tab
                }
              }}
              onShareTrip={() => {
                setInviteModalOpen(true);
              }}
              onSwitchToTab={setTabValue}
            />
          </Box>
        </Box>
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete Trip</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{trip.title}"? This action cannot be undone and will remove all associated events and items.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Modal */}
      {trip.inviteCode && (
        <InviteModal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          inviteCode={trip.inviteCode}
          tripTitle={trip.title}
        />
      )}

      {/* Item Form Modal */}
      <ItemForm
        open={itemFormOpen}
        onClose={handleItemFormClose}
        tripId={tripId || ''}
        item={editingItem}
        defaultType={itemFormType}
      />
    </Box>
  );
}

export default TripDetailsPage;
