import {
  Container,
  Typography,
  Box,
  Button,
  Stack,
  Divider,
  Grid,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
} from '@mui/material'
import { useState } from 'react'

import FeatureCard from './components/FeatureCard'
import { featureHighlights } from './utils/features'
import { AuthProvider } from './contexts/AuthContext'
import { StoreProvider, StoreDevTools } from './providers'
import { StoreUsageExamples } from './examples/StoreUsageExamples'
import type { ReactNode } from 'react'

const stats: { label: string; value: string; icon: ReactNode }[] = [
  { label: 'Trips planned together', value: '5,200+', icon: '✈️' },
  { label: 'Events proposed', value: '18,400', icon: '🗓️' },
  { label: 'Members collaborating', value: '82,000', icon: '🤝' },
  { label: 'Items coordinated', value: '120,000', icon: '🧳' }
]

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <StoreProvider>
      <AuthProvider>
        <Box>
          <AppBar position="static" elevation={0} sx={{ backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
            <Container maxWidth="lg">
              <Toolbar disableGutters>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
                  Group Planner
                </Typography>
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ color: 'text.primary' }}>
                  <Tab label="Landing Page" />
                  <Tab label="Zustand Store Demo" />
                </Tabs>
              </Toolbar>
            </Container>
          </AppBar>

          <TabPanel value={tabValue} index={0}>
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
                    <Button variant="contained" size="large" sx={{ px: 5, py: 1.5 }}>
                      Start Planning Your Trip
                    </Button>
                    <Button variant="text" sx={{ ml: 3 }}>
                      Explore the backend API
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
                    🎉 New: Zustand State Management
                  </Typography>
                  <Typography variant="body1" color="text.secondary" mb={3}>
                    We've implemented Zustand stores for auth, trips, notifications, and UI state.
                    Check out the demo tab to see them in action!
                  </Typography>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => setTabValue(1)}
                  >
                    View Store Demos
                  </Button>
                </Box>
              </Stack>
            </Container>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <StoreUsageExamples />
          </TabPanel>

          {/* Development tools - only shows in development */}
          <StoreDevTools />
        </Box>
      </AuthProvider>
    </StoreProvider>
  )
}

export default App