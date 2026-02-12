/**
 * InviteModal component - displays trip invite code with copy functionality
 * Allows HOST/CO_HOST to share invite codes with others
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Check as CheckIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  inviteCode: string;
  tripTitle: string;
}

export function InviteModal({ open, onClose, inviteCode, tripTitle }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const inviteLink = `${window.location.origin}/join/${inviteCode}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setShowSnackbar(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setShowSnackbar(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShare = async () => {
    if ('share' in navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Join my trip: ${tripTitle}`,
          text: `You're invited to join "${tripTitle}" on Group Planner!`,
          url: inviteLink,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to share:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleClose = () => {
    setCopied(false);
    setCopiedLink(false);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="invite-dialog-title"
      >
        <DialogTitle id="invite-dialog-title">
          Invite Members to "{tripTitle}"
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Share this invite code or link with people you want to join your trip.
          </Typography>

          {/* Invite Code */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Invite Code
            </Typography>
            <TextField
              fullWidth
              value={inviteCode}
              InputProps={{
                readOnly: true,
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                      <IconButton onClick={handleCopyCode} edge="end">
                        {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">
              or
            </Typography>
          </Divider>

          {/* Invite Link */}
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Invite Link
            </Typography>
            <TextField
              fullWidth
              value={inviteLink}
              InputProps={{
                readOnly: true,
                sx: { fontSize: '0.875rem' },
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copiedLink ? 'Copied!' : 'Copy link'}>
                      <IconButton onClick={handleCopyLink} edge="end">
                        {copiedLink ? <CheckIcon color="success" /> : <CopyIcon />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            Anyone with this code or link can join your trip.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Close</Button>
          {'share' in navigator && (
            <Button
              variant="contained"
              startIcon={<ShareIcon />}
              onClick={handleShare}
            >
              Share
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={2000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}

export default InviteModal;
