/**
 * Reset Password Page - reset password with token from email
 * Handles password reset tokens and allows users to set new passwords
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
} from '@mui/material';
import { Lock, Visibility, VisibilityOff, CheckCircleOutline, ErrorOutline } from '@mui/icons-material';
import { z } from 'zod';

import { AuthService } from '../services/authService';
import { useIsAuthenticated } from '../stores/authStore';
import type { PasswordResetConfirm } from '../types/auth';

// Zod validation schema for password reset
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

type ResetState = 'form' | 'loading' | 'success' | 'error';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useIsAuthenticated();

  const [formData, setFormData] = useState<ResetPasswordForm>({
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [state, setState] = useState<ResetState>('form');
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Extract token from URL on page load
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');

    if (!tokenFromUrl) {
      setError('No reset token provided. Please check your email for the correct link.');
      setState('error');
      return;
    }

    setToken(tokenFromUrl);
  }, [searchParams]);

  // Handle input changes
  const handleInputChange = (field: keyof ResetPasswordForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Clear general error
    if (error && state === 'form') {
      setError(null);
    }
  };

  // Validate form using Zod
  const validateForm = (): boolean => {
    try {
      resetPasswordSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          errors[path] = issue.message;
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      setState('error');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setState('loading');
      setError(null);

      const resetData: PasswordResetConfirm = {
        token,
        newPassword: formData.password,
      };

      await AuthService.confirmPasswordReset(resetData);

      setState('success');

      // Redirect to login after success
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Password reset successfully! You can now log in with your new password.',
            passwordReset: true
          }
        });
      }, 3000);

    } catch (error: any) {
      console.error('Password reset failed:', error);

      let errorMessage = 'Failed to reset password. Please try again.';

      if (error.response?.status === 400) {
        if (error.response.data?.message?.includes('expired')) {
          errorMessage = 'This password reset link has expired. Please request a new one.';
        } else if (error.response.data?.message?.includes('invalid')) {
          errorMessage = 'This password reset link is invalid. Please request a new one.';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'Password reset token not found. Please request a new password reset.';
      }

      setError(errorMessage);
      setState('error');
    }
  };

  const handleRequestNewReset = () => {
    navigate('/forgot-password');
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  // Don't render if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  const renderContent = () => {
    if (state === 'success') {
      return (
        <Box textAlign="center">
          <CheckCircleOutline sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            Password Reset Successful!
          </Typography>

          <Alert severity="success" sx={{ mt: 2, mb: 3 }}>
            Your password has been successfully updated. You can now log in with your new password.
          </Alert>

          <Typography variant="body2" color="text.secondary">
            Redirecting you to the login page...
          </Typography>
        </Box>
      );
    }

    if (state === 'error') {
      return (
        <Box textAlign="center">
          <ErrorOutline sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            Password Reset Failed
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 3 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={handleRequestNewReset}
            sx={{ mt: 2 }}
          >
            Request New Password Reset
          </Button>
        </Box>
      );
    }

    // Form state or loading state
    return (
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Typography variant="h5" component="h2" gutterBottom textAlign="center">
          Reset your password
        </Typography>

        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          Enter your new password below
        </Typography>

        {error && state === 'form' && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Password Field */}
        <TextField
          fullWidth
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleInputChange('password')}
          error={!!formErrors.password}
          helperText={formErrors.password || 'At least 6 characters with uppercase, lowercase, and numbers'}
          disabled={state === 'loading'}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock color={formErrors.password ? 'error' : 'action'} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={togglePasswordVisibility}
                  edge="end"
                  disabled={state === 'loading'}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Confirm Password Field */}
        <TextField
          fullWidth
          label="Confirm New Password"
          type={showConfirmPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          error={!!formErrors.confirmPassword}
          helperText={formErrors.confirmPassword}
          disabled={state === 'loading'}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock color={formErrors.confirmPassword ? 'error' : 'action'} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle confirm password visibility"
                  onClick={toggleConfirmPasswordVisibility}
                  edge="end"
                  disabled={state === 'loading'}
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={state === 'loading'}
          sx={{ mb: 3 }}
        >
          {state === 'loading' ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Resetting Password...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </Box>
    );
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      display: 'flex',
      alignItems: 'center',
      py: 4
    }}>
      <Container maxWidth="sm">
        <Box textAlign="center" mb={4}>
          <Typography variant="h3" component="h1" gutterBottom>
            Reset Password
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Choose a new password for your account
          </Typography>
        </Box>

        <Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
          {renderContent()}

          {/* Navigation Links */}
          {state !== 'success' && (
            <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Remember your password?{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                >
                  Sign in here
                </Link>
                {' '}or{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                >
                  Create Account
                </Link>
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default ResetPasswordPage;