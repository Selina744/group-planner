/**
 * Forgot Password Page - request password reset via email
 * Sends reset link to user's email address
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
  Link,
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import { z } from 'zod';

import { AuthService } from '../services/authService';
import { useIsAuthenticated } from '../stores/authStore';

// Zod validation schema for email
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();

  const [formData, setFormData] = useState<ForgotPasswordForm>({
    email: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle input changes
  const handleInputChange = (field: keyof ForgotPasswordForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Clear general error
    if (error) {
      setError(null);
    }

    // Clear success state
    if (success) {
      setSuccess(false);
    }
  };

  // Validate form using Zod
  const validateForm = (): boolean => {
    try {
      forgotPasswordSchema.parse(formData);
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

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await AuthService.requestPasswordReset(formData.email);

      setSuccess(true);
      setError(null);
    } catch (error: any) {
      console.error('Password reset request failed:', error);

      let errorMessage = 'Failed to send password reset email. Please try again.';

      if (error.response?.status === 404) {
        errorMessage = 'No account found with this email address.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many reset requests. Please wait before trying again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
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
        <Box textAlign="center" mb={4}>
          <Typography variant="h3" component="h1" gutterBottom>
            Forgot Password
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter your email address and we'll send you a link to reset your password
          </Typography>
        </Box>

        <Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Check your email!
              </Typography>
              <Typography variant="body2">
                We've sent a password reset link to <strong>{formData.email}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please check your inbox and spam folder. The link will expire in 1 hour.
              </Typography>
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {!success && (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Typography variant="h5" component="h2" gutterBottom textAlign="center">
                Reset your password
              </Typography>

              <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                Enter the email address associated with your account
              </Typography>

              {/* Email Field */}
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={!!formErrors.email}
                helperText={formErrors.email}
                disabled={isLoading}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color={formErrors.email ? 'error' : 'action'} />
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
                disabled={isLoading}
                sx={{ mb: 3 }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </Box>
          )}

          {/* Navigation Links */}
          <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            {success && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Didn't receive the email?{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setSuccess(false);
                      setFormData({ email: '' });
                    }}
                    sx={{ textTransform: 'none', minWidth: 'auto', p: 0, verticalAlign: 'baseline' }}
                  >
                    Try again
                  </Button>
                </Typography>
              </Box>
            )}

            <Typography variant="body2" color="text.secondary">
              <Button
                variant="text"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/login')}
                sx={{ textTransform: 'none', mr: 2 }}
              >
                Back to Sign In
              </Button>
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
        </Paper>

        <Box textAlign="center" mt={4}>
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
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default ForgotPasswordPage;