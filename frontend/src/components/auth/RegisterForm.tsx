/**
 * Registration form component for new user sign-up
 * Integrates with Zustand auth store and provides Zod validation
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Person, Email, Lock, AccountCircle } from '@mui/icons-material';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import type { RegisterRequest } from '../../types/auth';

// Zod validation schema matching backend requirements
const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  username: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 3, {
      message: 'Username must be at least 3 characters if provided',
    })
    .refine((val) => !val || /^[a-zA-Z0-9_-]+$/.test(val), {
      message: 'Username can only contain letters, numbers, hyphens, and underscores',
    }),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  displayName: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length >= 2, {
      message: 'Display name must be at least 2 characters if provided',
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm({
  onSwitchToLogin,
}: RegisterFormProps) {
  const { register, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // Handle input changes
  const handleInputChange = (field: keyof RegisterFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Clear auth error
    if (error) {
      clearError();
    }

    // Clear success state
    if (success) {
      setSuccess(false);
    }
  };

  // Validate form using Zod
  const validateForm = (): boolean => {
    try {
      registerSchema.parse(formData);
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
      // Prepare registration data (exclude confirmPassword and empty optional fields)
      const registrationData: RegisterRequest = {
        email: formData.email,
        password: formData.password,
        ...(formData.username && formData.username.trim() && { username: formData.username.trim() }),
        ...(formData.displayName && formData.displayName.trim() && { displayName: formData.displayName.trim() }),
      };

      await register(registrationData);

      // Show success message and trigger navigation to login
      setSuccess(true);
      setTimeout(() => {
        if (onSwitchToLogin) {
          onSwitchToLogin();
        }
      }, 2000);
    } catch (error) {
      // Error is handled by the auth store
      console.error('Registration failed:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h5" component="h2" gutterBottom textAlign="center">
        Create your account
      </Typography>

      <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
        Join thousands of travelers planning amazing group trips
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Account created successfully! Redirecting to login...
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Email Field */}
      <TextField
        fullWidth
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        error={!!formErrors.email}
        helperText={formErrors.email}
        disabled={isLoading || success}
        margin="normal"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email color={formErrors.email ? 'error' : 'action'} />
            </InputAdornment>
          ),
        }}
      />

      {/* Username Field (Optional) */}
      <TextField
        fullWidth
        label="Username (Optional)"
        value={formData.username}
        onChange={handleInputChange('username')}
        error={!!formErrors.username}
        helperText={formErrors.username || 'Choose a unique username for easy identification'}
        disabled={isLoading || success}
        margin="normal"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <AccountCircle color={formErrors.username ? 'error' : 'action'} />
            </InputAdornment>
          ),
        }}
      />

      {/* Display Name Field (Optional) */}
      <TextField
        fullWidth
        label="Display Name (Optional)"
        value={formData.displayName}
        onChange={handleInputChange('displayName')}
        error={!!formErrors.displayName}
        helperText={formErrors.displayName || 'How you want to appear to other users'}
        disabled={isLoading || success}
        margin="normal"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Person color={formErrors.displayName ? 'error' : 'action'} />
            </InputAdornment>
          ),
        }}
      />

      {/* Password Field */}
      <TextField
        fullWidth
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        error={!!formErrors.password}
        helperText={formErrors.password || 'At least 6 characters with uppercase, lowercase, and numbers'}
        disabled={isLoading || success}
        margin="normal"
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
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
                disabled={isLoading || success}
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
        label="Confirm Password"
        type={showConfirmPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleInputChange('confirmPassword')}
        error={!!formErrors.confirmPassword}
        helperText={formErrors.confirmPassword}
        disabled={isLoading || success}
        margin="normal"
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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
                disabled={isLoading || success}
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isLoading || success}
        sx={{ mt: 3, mb: 2, py: 1.5 }}
      >
        {isLoading ? (
          <>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            Creating account...
          </>
        ) : success ? (
          'Account Created!'
        ) : (
          'Create Account'
        )}
      </Button>

      {onSwitchToLogin && (
        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={onSwitchToLogin}
              sx={{ fontWeight: 600, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default RegisterForm;