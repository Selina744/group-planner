/**
 * Email Verification Page - handles email verification tokens
 * Automatically verifies email on page load and provides resend functionality
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { CheckCircleOutline, ErrorOutline, Email } from '@mui/icons-material';

import { AuthService } from '../services/authService';
import { useIsAuthenticated } from '../stores/authStore';

type VerificationState = 'loading' | 'success' | 'error' | 'expired';

interface VerificationResult {
  state: VerificationState;
  message: string;
  canResend?: boolean;
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useIsAuthenticated();

  const [result, setResult] = useState<VerificationResult>({
    state: 'loading',
    message: 'Verifying your email address...'
  });
  const [isResending, setIsResending] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Extract token and verify email on page load
  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setResult({
        state: 'error',
        message: 'No verification token provided. Please check your email for the correct link.',
      });
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      setResult({
        state: 'loading',
        message: 'Verifying your email address...'
      });

      await AuthService.verifyEmail(token);

      setResult({
        state: 'success',
        message: 'Your email has been successfully verified! You can now log in to your account.'
      });

      // Redirect to login after success
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Email verified successfully! You can now log in.',
            verified: true
          }
        });
      }, 3000);

    } catch (error: any) {
      console.error('Email verification failed:', error);

      // Handle different error types
      let message = 'Email verification failed. Please try again or request a new verification link.';
      let canResend = true;
      let state: VerificationState = 'error';

      if (error.response?.status === 400) {
        if (error.response.data?.message?.includes('expired') ||
            error.response.data?.message?.includes('invalid')) {
          message = 'This verification link has expired or is invalid. Please request a new verification email.';
          state = 'expired';
        } else if (error.response.data?.message?.includes('already verified')) {
          message = 'This email address has already been verified. You can log in to your account.';
          canResend = false;
        } else {
          message = error.response.data?.message || message;
        }
      } else if (error.response?.status === 404) {
        message = 'Verification token not found. Please request a new verification email.';
        state = 'expired';
      }

      setResult({ state, message, canResend });
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      await AuthService.sendEmailVerification();

      setResult({
        state: 'success',
        message: 'A new verification email has been sent! Please check your inbox and spam folder.'
      });
    } catch (error: any) {
      console.error('Failed to resend verification email:', error);

      let message = 'Failed to send verification email. Please try again later.';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      }

      setResult({
        state: 'error',
        message,
        canResend: true
      });
    } finally {
      setIsResending(false);
    }
  };

  const renderIcon = () => {
    switch (result.state) {
      case 'loading':
        return <CircularProgress size={60} sx={{ color: 'primary.main' }} />;
      case 'success':
        return <CheckCircleOutline sx={{ fontSize: 60, color: 'success.main' }} />;
      case 'error':
      case 'expired':
        return <ErrorOutline sx={{ fontSize: 60, color: 'error.main' }} />;
      default:
        return null;
    }
  };

  const renderAlert = () => {
    const severity = result.state === 'success' ? 'success' : 'error';

    return (
      <Alert
        severity={severity}
        sx={{ mb: 3, textAlign: 'center' }}
        icon={false}
      >
        {result.message}
      </Alert>
    );
  };

  // Don't render if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      display: 'flex',
      alignItems: 'center',
      py: 4
    }}>
      <Container maxWidth="sm">
        <Paper elevation={1} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            {renderIcon()}
          </Box>

          <Typography variant="h4" component="h1" gutterBottom>
            Email Verification
          </Typography>

          {renderAlert()}

          {result.state === 'loading' && (
            <Typography variant="body2" color="text.secondary">
              Please wait while we verify your email address...
            </Typography>
          )}

          {result.state === 'success' && result.message.includes('sent') && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              <Email sx={{ verticalAlign: 'middle', mr: 1 }} />
              Redirecting you to the login page...
            </Typography>
          )}

          {(result.state === 'error' || result.state === 'expired') && result.canResend && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Need a new verification email?
              </Typography>
              <Button
                variant="contained"
                onClick={handleResendVerification}
                disabled={isResending}
                startIcon={isResending ? <CircularProgress size={16} /> : <Email />}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            </Box>
          )}

          {result.state !== 'loading' && (
            <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                Return to{' '}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate('/login')}
                  sx={{ textTransform: 'none', minWidth: 'auto', p: 0, verticalAlign: 'baseline' }}
                >
                  Sign In
                </Button>
                {' '}or{' '}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate('/register')}
                  sx={{ textTransform: 'none', minWidth: 'auto', p: 0, verticalAlign: 'baseline' }}
                >
                  Create Account
                </Button>
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default VerifyEmailPage;