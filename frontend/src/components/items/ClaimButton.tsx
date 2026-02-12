/**
 * ClaimButton component - button for claiming/unclaiming items
 * Handles claim quantity and status updates
 */

import { useState } from 'react';
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
} from '@mui/material';
import {
  Add as ClaimIcon,
  Remove as UnclaimIcon,
  CheckCircle as BroughtIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import type { ItemClaim, ClaimStatus } from '../../types';
import { useClaimItemMutation, useCancelClaimMutation, useUpdateClaimMutation } from '../../queries/hooks';

interface ClaimButtonProps {
  itemId: string;
  currentUserClaim?: ItemClaim | undefined;
  quantityNeeded: number;
  quantityClaimed: number;
  disabled?: boolean | undefined;
}

export function ClaimButton({
  itemId,
  currentUserClaim,
  quantityNeeded,
  quantityClaimed,
  disabled = false,
}: ClaimButtonProps) {
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimQuantity, setClaimQuantity] = useState(1);
  const [claimNotes, setClaimNotes] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const claimMutation = useClaimItemMutation();
  const cancelMutation = useCancelClaimMutation();
  const updateMutation = useUpdateClaimMutation();

  const hasClaim = !!currentUserClaim;
  const remaining = quantityNeeded - quantityClaimed;
  const maxClaimable = hasClaim ? remaining + (currentUserClaim?.quantity || 0) : remaining;

  const handleClaimClick = () => {
    setClaimQuantity(Math.min(1, maxClaimable));
    setClaimNotes('');
    setClaimDialogOpen(true);
  };

  const handleClaimSubmit = async () => {
    try {
      await claimMutation.mutateAsync({
        itemId,
        claimData: {
          quantity: claimQuantity,
          ...(claimNotes ? { notes: claimNotes } : {}),
        },
      });
      setClaimDialogOpen(false);
    } catch (error) {
      console.error('Failed to claim item:', error);
    }
  };

  const handleUnclaim = async () => {
    if (!currentUserClaim) return;

    try {
      await cancelMutation.mutateAsync(currentUserClaim.id);
      setMenuAnchor(null);
    } catch (error) {
      console.error('Failed to unclaim item:', error);
    }
  };

  const handleMarkBrought = async () => {
    if (!currentUserClaim) return;

    try {
      await updateMutation.mutateAsync({
        claimId: currentUserClaim.id,
        updateData: { status: 'BROUGHT' as ClaimStatus },
      });
      setMenuAnchor(null);
    } catch (error) {
      console.error('Failed to mark item as brought:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  if (hasClaim) {
    return (
      <>
        <Box display="flex" gap={1} alignItems="center">
          <Button
            variant="outlined"
            color="success"
            size="small"
            startIcon={<BroughtIcon />}
            disabled={currentUserClaim.status === 'BROUGHT'}
          >
            {currentUserClaim.status === 'BROUGHT' ? 'Brought' : `Claimed (${currentUserClaim.quantity})`}
          </Button>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreIcon fontSize="small" />
          </IconButton>
        </Box>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleMarkBrought} disabled={currentUserClaim.status === 'BROUGHT'}>
            <ListItemIcon>
              <BroughtIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark as brought</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleUnclaim} disabled={cancelMutation.isPending}>
            <ListItemIcon>
              <UnclaimIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Unclaim</ListItemText>
          </MenuItem>
        </Menu>
      </>
    );
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ClaimIcon />}
        onClick={handleClaimClick}
        disabled={disabled || remaining <= 0}
      >
        Claim
      </Button>

      <Dialog open={claimDialogOpen} onClose={() => setClaimDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Claim Item</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={claimQuantity}
              onChange={(e) => setClaimQuantity(Math.max(1, Math.min(maxClaimable, parseInt(e.target.value, 10) || 1)))}
              inputProps={{ min: 1, max: maxClaimable }}
              helperText={`Maximum: ${maxClaimable}`}
            />
            <TextField
              label="Notes (optional)"
              multiline
              rows={3}
              fullWidth
              value={claimNotes}
              onChange={(e) => setClaimNotes(e.target.value)}
              placeholder="Add any notes about this item..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleClaimSubmit}
            variant="contained"
            disabled={claimMutation.isPending || claimQuantity < 1}
          >
            {claimMutation.isPending ? 'Claiming...' : 'Claim'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ClaimButton;
