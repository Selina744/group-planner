/**
 * ItemList component - displays items with sections for recommended and shared
 * Shows item details, claims, and provides actions for managing items
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Alert,
  Collapse,
  Avatar,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  CheckCircle as CheckedIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as EssentialIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { Item, ItemType } from '../../types';
import { ClaimProgress } from './ClaimProgress';
import { ClaimButton } from './ClaimButton';
import { useDeleteItemMutation } from '../../queries/hooks';

interface ItemListProps {
  items: Item[];
  currentUserId?: string | undefined;
  canManageItems?: boolean | undefined;
  isLoading?: boolean | undefined;
  onEditItem?: ((item: Item) => void) | undefined;
  onAddItem?: ((type: ItemType) => void) | undefined;
}

function ItemSkeleton() {
  return (
    <ListItem sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', py: 2 }}>
      <Box display="flex" justifyContent="space-between" width="100%" mb={1}>
        <Box flex={1}>
          <Skeleton width="60%" height={24} />
          <Skeleton width="40%" height={20} sx={{ mt: 0.5 }} />
        </Box>
        <Skeleton variant="rectangular" width={80} height={32} />
      </Box>
      <Skeleton width="100%" height={8} sx={{ borderRadius: 1 }} />
    </ListItem>
  );
}

function ItemCard({
  item,
  currentUserId,
  canManage,
  onEdit,
}: {
  item: Item;
  currentUserId?: string | undefined;
  canManage: boolean;
  onEdit?: ((item: Item) => void) | undefined;
}) {
  const [showClaims, setShowClaims] = useState(false);
  const deleteMutation = useDeleteItemMutation();

  const claims = item.claims || [];
  const quantityClaimed = claims.reduce((sum, claim) => sum + (claim.status !== 'CANCELLED' ? claim.quantity : 0), 0);
  const currentUserClaim = claims.find((c) => c.userId === currentUserId && c.status !== 'CANCELLED');

  const isRecommended = item.type === 'RECOMMENDED';
  const isShared = item.type === 'SHARED';
  const hasUserChecked = isRecommended && currentUserClaim;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteMutation.mutateAsync(item.id);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  return (
    <ListItem
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            {isRecommended && (
              <IconButton
                size="small"
                color={hasUserChecked ? 'success' : 'default'}
                sx={{ p: 0 }}
              >
                {hasUserChecked ? <CheckedIcon /> : <UncheckedIcon />}
              </IconButton>
            )}
            <Typography variant="body1" fontWeight={500}>
              {item.name}
            </Typography>
            {item.isEssential && (
              <Tooltip title="Essential item">
                <EssentialIcon color="warning" fontSize="small" />
              </Tooltip>
            )}
            {item.category && (
              <Chip label={item.category} size="small" variant="outlined" />
            )}
          </Box>
          {item.description && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: isRecommended ? 5 : 0 }}>
              {item.description}
            </Typography>
          )}
        </Box>

        <Box display="flex" gap={1} alignItems="center">
          {isShared && (
            <ClaimButton
              itemId={item.id}
              currentUserClaim={currentUserClaim}
              quantityNeeded={item.quantityNeeded}
              quantityClaimed={quantityClaimed}
            />
          )}
          {canManage && (
            <>
              {onEdit && (
                <IconButton size="small" onClick={() => onEdit(item)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton
                size="small"
                color="error"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </Box>

      {isShared && (
        <Box sx={{ ml: 0 }}>
          <ClaimProgress quantityNeeded={item.quantityNeeded} quantityClaimed={quantityClaimed} />

          {claims.length > 0 && (
            <Box mt={1}>
              <Button
                size="small"
                onClick={() => setShowClaims(!showClaims)}
                endIcon={showClaims ? <CollapseIcon /> : <ExpandIcon />}
              >
                {claims.length} {claims.length === 1 ? 'claim' : 'claims'}
              </Button>
              <Collapse in={showClaims}>
                <Stack spacing={0.5} mt={1}>
                  {claims.map((claim) => (
                    <Box
                      key={claim.id}
                      display="flex"
                      alignItems="center"
                      gap={1}
                      sx={{ pl: 2, py: 0.5 }}
                    >
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                        {(claim.user?.displayName || claim.user?.username || claim.user?.email || '?')[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <Typography variant="body2">
                        {claim.user?.displayName || claim.user?.username || claim.user?.email || 'Unknown User'}
                      </Typography>
                      <Chip
                        label={`${claim.quantity}`}
                        size="small"
                        variant="outlined"
                      />
                      {claim.status === 'BROUGHT' && (
                        <Chip
                          label="Brought"
                          size="small"
                          color="success"
                        />
                      )}
                      {claim.notes && (
                        <Typography variant="caption" color="text.secondary">
                          - {claim.notes}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Collapse>
            </Box>
          )}
        </Box>
      )}

      {isRecommended && !hasUserChecked && (
        <Box sx={{ ml: 5, mt: 1 }}>
          <ClaimButton
            itemId={item.id}
            currentUserClaim={currentUserClaim}
            quantityNeeded={1}
            quantityClaimed={currentUserClaim ? 1 : 0}
          />
        </Box>
      )}
    </ListItem>
  );
}

export function ItemList({
  items,
  currentUserId,
  canManageItems = false,
  isLoading = false,
  onEditItem,
  onAddItem,
}: ItemListProps) {
  const recommendedItems = items.filter((item) => item.type === 'RECOMMENDED');
  const sharedItems = items.filter((item) => item.type === 'SHARED');

  if (isLoading) {
    return (
      <Box>
        <Paper variant="outlined" sx={{ mb: 3 }}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Recommended Items
            </Typography>
            <List dense>
              {[1, 2, 3].map((i) => (
                <ItemSkeleton key={i} />
              ))}
            </List>
          </Box>
        </Paper>

        <Paper variant="outlined">
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Shared Items
            </Typography>
            <List dense>
              {[1, 2].map((i) => (
                <ItemSkeleton key={i} />
              ))}
            </List>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Recommended Items Section */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Box p={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Recommended Items
            </Typography>
            {onAddItem && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => onAddItem('RECOMMENDED' as ItemType)}
              >
                Add Item
              </Button>
            )}
          </Box>

          {recommendedItems.length === 0 ? (
            <Alert severity="info">
              No recommended items yet. Add items to create a personal checklist for this trip.
            </Alert>
          ) : (
            <List dense>
              {recommendedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  currentUserId={currentUserId}
                  canManage={canManageItems}
                  onEdit={onEditItem}
                />
              ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* Shared Items Section */}
      <Paper variant="outlined">
        <Box p={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Shared Items
            </Typography>
            {onAddItem && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => onAddItem('SHARED' as ItemType)}
              >
                Add Shared Item
              </Button>
            )}
          </Box>

          {sharedItems.length === 0 ? (
            <Alert severity="info">
              No shared items yet. Add shared items that trip members can claim to bring.
            </Alert>
          ) : (
            <List dense>
              {sharedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  currentUserId={currentUserId}
                  canManage={canManageItems}
                  onEdit={onEditItem}
                />
              ))}
            </List>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default ItemList;
