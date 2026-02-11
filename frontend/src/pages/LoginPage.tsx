/**
 * Login Page - public authentication page
 * Redirects to intended destination after successful login
 */

import { useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Link,
  Paper,
} from '@mui/material';

import { LoginForm } from '../components/auth/LoginForm';
import { useIsAuthenticated } from '../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSwitchToRegister = () => {
    navigate('/register');
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  if (isAuthenticated) {
    return null; // Will redirect in useEffect
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
            Welcome back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to your account to continue planning your trips
          </Typography>
        </Box>

        <Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
          <LoginForm
            onSwitchToRegister={handleSwitchToRegister}
            onForgotPassword={handleForgotPassword}
          />
        </Paper>

        <Box textAlign="center" mt={4}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link
              component={RouterLink}
              to="/register"
              variant="body2"
              sx={{ fontWeight: 600 }}
            >
              Sign up for free
            </Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default LoginPage;