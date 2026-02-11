/**
 * Landing Page - main public landing page for the application
 * Features app overview, statistics, and feature highlights
 */

import {
  Container,
  Typography,
  Box,
  Button,
  Stack,
  Divider,
  Grid,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import FeatureCard from '../components/FeatureCard';
import { featureHighlights } from '../utils/features';
import { useIsAuthenticated } from '../stores/authStore';

const stats: { label: string; value: string; icon: ReactNode }[] = [
  { label: 'Trips planned together', value: '5,200+', icon: '✈️' },
  { label: 'Events proposed', value: '18,400', icon: '🗓️' },
  { label: 'Members collaborating', value: '82,000', icon: '🤝' },
  { label: 'Items coordinated', value: '120,000', icon: '🧳' }
];

export function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();

  const handleStartPlanning = () => {
    if (isAuthenticated) {
      navigate('/trips/create');
    } else {
      navigate('/login');
    }
  };

  const handleExploreDemo = () => {
    navigate('/demo');
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={6}>
        <Box textAlign="center">
          <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2}>
            Launch a better group trip
          </Typography>
          <Typography variant="h1" component="h1" gutterBottom mt={2}>
            Plan together, stay synced, travel happy
          </Typography>
          <Typography variant="h5" color="text.secondary" maxWidth={640} mx="auto">
            Build a shared itinerary, automate reminders, and let hosts + co-hosts keep everyone in the loop
            without the endless email chains.
          </Typography>
          <Box mt={4}>
            <Button
              variant="contained"
              size="large"
              sx={{ px: 5, py: 1.5 }}
              onClick={handleStartPlanning}
            >
              {isAuthenticated ? 'Start Planning Your Trip' : 'Get Started'}
            </Button>
            <Button
              variant="text"
              sx={{ ml: 3 }}
              onClick={handleExploreDemo}
            >
              Explore the demo
            </Button>
          </Box>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          flexWrap="wrap"
        >
          {stats.map((stat) => (
            <Box
              key={stat.label}
              sx={{
                minWidth: 180,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                px: 3,
                py: 2,
                textAlign: 'center',
                backgroundColor: 'background.paper',
              }}
            >
              <Typography variant="h4" fontWeight={700}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Divider />

        <Box>
          <Typography variant="h4" component="h2" gutterBottom>
            What makes group-planner different
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            From secure JWT-authenticated APIs to collaborative UI components, the stack prioritizes
            trust, clarity, and happy travelers. Now with powerful Zustand state management!
          </Typography>
          <Grid container spacing={3}>
            {featureHighlights.map((feature) => (
              <Grid item xs={12} sm={6} md={4} key={feature.title}>
                <FeatureCard feature={feature} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider />

        <Box textAlign="center">
          <Typography variant="h5" component="h3" gutterBottom>
            🎉 New: Trip Creation Form
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            We've implemented a comprehensive trip creation form with Material-UI components,
            full validation, and Zustand store integration. Try it out!
          </Typography>
          <Button
            variant="outlined"
            size="large"
            onClick={handleStartPlanning}
            sx={{ mr: 2 }}
          >
            {isAuthenticated ? 'Create a Trip' : 'Sign Up to Create'}
          </Button>
          <Button
            variant="text"
            size="large"
            onClick={handleExploreDemo}
          >
            View Store Demos
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}

export default LandingPage;