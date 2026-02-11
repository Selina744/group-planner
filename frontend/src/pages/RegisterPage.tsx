/**
 * Register Page - public registration page
 * Redirects to dashboard after successful registration
 */

import { useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Link,
  Paper,
} from '@mui/material';

import { RegisterForm } from '../components/auth/RegisterForm';
import { useIsAuthenticated } from '../stores/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSwitchToLogin = () => {
    navigate('/login');
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
            Join Group Planner
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Start planning amazing group trips with friends and family
          </Typography>
        </Box>

        <Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
          <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
        </Paper>

        <Box textAlign="center" mt={4}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
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

export default RegisterPage;