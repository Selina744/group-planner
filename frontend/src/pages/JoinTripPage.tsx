/**
 * JoinTripPage - allows users to join a trip using an invite code
 * Supports both direct link (/join/:code) and manual code entry
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  PersonAdd as JoinIcon,
  ArrowBack as BackIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useIsAuthenticated } from '../stores/authStore';

interface JoinTripResponse {
  success: boolean;
  message: string;
  trip?: {
    id: string;
    title: string;
  };
}

interface ApiError extends Error {
  message: string;
}

async function joinTripByCode(inviteCode: string): Promise<JoinTripResponse> {
  return apiClient.post('/trips/join', { inviteCode });
}

export function JoinTripPage() {
  const { code: urlCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();

  const [inviteCode, setInviteCode] = useState(urlCode || '');
  const [error, setError] = useState<string | null>(null);

  const joinMutation = useMutation({
    mutationFn: joinTripByCode,
    onSuccess: (data) => {
      if (data.trip?.id) {
        navigate(`/trips/${data.trip.id}`, {
          state: { message: `Successfully joined "${data.trip.title}"!` },
        });
      } else {
        navigate('/dashboard', {
          state: { message: 'Successfully joined the trip!' },
        });
      }
    },
    onError: (err: ApiError) => {
      const message = err.message || 'Failed to join trip. Please check the invite code and try again.';
      setError(message);
    },
  });

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setInviteCode(value);
    setError(null);
  };

  const handleJoin = useCallback(() => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    if (inviteCode.length < 6) {
      setError('Invite code must be at least 6 characters');
      return;
    }

    setError(null);
    joinMutation.mutate(inviteCode.trim());
  }, [inviteCode, joinMutation]);

  // Auto-submit if code is in URL and user is authenticated
  useEffect(() => {
    if (urlCode && isAuthenticated && !joinMutation.isPending && !error) {
      handleJoin();
    }
  }, [urlCode, isAuthenticated, joinMutation.isPending, error, handleJoin]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <JoinIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Join a Trip
            </Typography>
            <Typography color="text.secondary" paragraph>
              You need to be logged in to join a trip.
            </Typography>
            <Button
              component={RouterLink}
              to={`/login?redirect=/join/${inviteCode || ''}`}
              variant="contained"
              size="large"
            >
              Log in to continue
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Don't have an account?{' '}
              <RouterLink to={`/register?redirect=/join/${inviteCode || ''}`}>
                Sign up
              </RouterLink>
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Button
          component={RouterLink}
          to="/dashboard"
          startIcon={<BackIcon />}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>

        <Paper sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <JoinIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" component="h1" gutterBottom>
              Join a Trip
            </Typography>
            <Typography color="text.secondary">
              Enter the invite code to join a trip
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {joinMutation.isSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Joining trip...
            </Alert>
          )}

          <TextField
            fullWidth
            label="Invite Code"
            value={inviteCode}
            onChange={handleCodeChange}
            onKeyDown={handleKeyPress}
            placeholder="Enter invite code"
            disabled={joinMutation.isPending}
            autoFocus={!urlCode}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <KeyIcon color="action" />
                </InputAdornment>
              ),
              sx: {
                fontFamily: 'monospace',
                fontSize: '1.25rem',
                letterSpacing: '0.1em',
              },
            }}
            inputProps={{
              maxLength: 12,
              style: { textTransform: 'uppercase' },
            }}
            sx={{ mb: 3 }}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleJoin}
            disabled={joinMutation.isPending || !inviteCode.trim()}
            startIcon={joinMutation.isPending ? <CircularProgress size={20} /> : <JoinIcon />}
          >
            {joinMutation.isPending ? 'Joining...' : 'Join Trip'}
          </Button>

          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
            Get an invite code from the trip organizer
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default JoinTripPage;
